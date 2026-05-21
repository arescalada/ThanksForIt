import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

// Obtener mensajes del usuario (bandeja de entrada)
export const getMisMensajes = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.user?.id;

    // Obtener mensajes sin JOIN complejo
    const result = await query(
      `SELECT m.*,
              u_remitente.email as remitente_email,
              u_remitente.tipo_usuario as remitente_tipo,
              COALESCE(v.nombre || ' ' || v.apellidos, e.nombre_legal, u_remitente.email) as remitente_nombre
       FROM mensajes m
       JOIN usuarios u_remitente ON m.remitente_id = u_remitente.id
       LEFT JOIN voluntarios v ON v.usuario_id = u_remitente.id
       LEFT JOIN entidades_sociales e ON e.usuario_id = u_remitente.id
       WHERE m.destinatario_id = $1
         AND m.remitente_id != m.destinatario_id
         AND (m.relacionado_tipo IS NULL OR m.relacionado_tipo NOT IN ('chat_directo', 'chat_actividad'))
       ORDER BY m.created_at DESC`,
      [usuarioId]
    );

    // Enriquecer con info de actividad via JS (evita problemas de tipos UUID en SQL)
    const mensajes = result.rows;
    for (const msg of mensajes) {
      if (msg.relacionado_tipo === 'inscripcion' && msg.relacionado_id) {
        try {
          const actResult = await query(
            `SELECT act.nombre, act.municipio, act.fecha_inicio, act.fecha_fin, act.horarios,
                    e.nombre_legal as entidad_nombre
             FROM voluntario_actividad va
             JOIN actividades act ON act.id = va.actividad_id
             JOIN entidades_sociales e ON e.id = act.entidad_id
             WHERE va.id = $1`,
            [msg.relacionado_id]
          );
          if (actResult.rows.length > 0) {
            const act = actResult.rows[0];
            msg.actividad_nombre = act.nombre;
            msg.actividad_municipio = act.municipio;
            msg.actividad_fecha_inicio = act.fecha_inicio;
            msg.actividad_fecha_fin = act.fecha_fin;
            msg.actividad_horarios = act.horarios;
            msg.actividad_entidad_nombre = act.entidad_nombre;
          }
        } catch {}
      }
    }

    res.json(mensajes);
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
};

// Obtener cantidad de mensajes no leídos (total)
export const getNoLeidos = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.user?.id;

    const result = await query(
      'SELECT COUNT(*) as total FROM mensajes WHERE destinatario_id = $1 AND leido = false',
      [usuarioId]
    );

    res.json({ no_leidos: parseInt(result.rows[0].total) });
  } catch (error) {
    console.error('Error al contar mensajes:', error);
    res.status(500).json({ error: 'Error al contar mensajes' });
  }
};

// Obtener cantidad de mensajes no leídos solo del chat directo
export const getNoLeidosChat = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.user?.id;

    const result = await query(
      `SELECT COUNT(*) as total FROM mensajes
       WHERE destinatario_id = $1
         AND leido = false
         AND relacionado_tipo = 'chat_directo'`,
      [usuarioId]
    );

    res.json({ no_leidos: parseInt(result.rows[0].total) });
  } catch (error) {
    console.error('Error al contar mensajes chat:', error);
    res.status(500).json({ error: 'Error al contar mensajes chat' });
  }
};

// Enviar mensaje
export const enviarMensaje = async (req: AuthRequest, res: Response) => {
  try {
    const { destinatario_id, asunto, cuerpo, relacionado_tipo, relacionado_id } = req.body;
    const remitenteId = req.user?.id;

    if (!destinatario_id || !asunto || !cuerpo) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const destinatario = await query('SELECT id FROM usuarios WHERE id = $1', [destinatario_id]);
    if (destinatario.rows.length === 0) {
      return res.status(404).json({ error: 'Destinatario no encontrado' });
    }

    const result = await query(
      `INSERT INTO mensajes (remitente_id, destinatario_id, asunto, cuerpo, relacionado_tipo, relacionado_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [remitenteId, destinatario_id, asunto, cuerpo, relacionado_tipo || null, relacionado_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
};

// Marcar mensaje como leído
export const marcarLeido = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    const mensaje = await query(
      'SELECT id FROM mensajes WHERE id = $1 AND destinatario_id = $2',
      [id, usuarioId]
    );

    if (mensaje.rows.length === 0) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    await query('UPDATE mensajes SET leido = true WHERE id = $1', [id]);

    res.json({ mensaje: 'Mensaje marcado como leído' });
  } catch (error) {
    console.error('Error al marcar mensaje:', error);
    res.status(500).json({ error: 'Error al marcar mensaje' });
  }
};

// Eliminar mensaje
export const eliminarMensaje = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user?.id;

    const mensaje = await query(
      'SELECT id FROM mensajes WHERE id = $1 AND destinatario_id = $2',
      [id, usuarioId]
    );

    if (mensaje.rows.length === 0) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    await query('DELETE FROM mensajes WHERE id = $1', [id]);

    res.json({ mensaje: 'Mensaje eliminado' });
  } catch (error) {
    console.error('Error al eliminar mensaje:', error);
    res.status(500).json({ error: 'Error al eliminar mensaje' });
  }
};

// ── Obtener conversación directa entre dos usuarios ───────────────────────────
export const getConversacion = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.user?.id;
    const { otroUsuarioId } = req.params;

    const result = await query(
      `SELECT m.*,
              u_remitente.email as remitente_email,
              u_remitente.tipo_usuario as remitente_tipo
       FROM mensajes m
       JOIN usuarios u_remitente ON m.remitente_id = u_remitente.id
       WHERE m.relacionado_tipo = 'chat_directo'
         AND (
           (m.remitente_id = $1 AND m.destinatario_id = $2) OR
           (m.remitente_id = $2 AND m.destinatario_id = $1)
         )
       ORDER BY m.created_at ASC`,
      [usuarioId, otroUsuarioId]
    );

    await query(
      `UPDATE mensajes SET leido = true
       WHERE relacionado_tipo = 'chat_directo'
         AND remitente_id = $2
         AND destinatario_id = $1
         AND leido = false`,
      [usuarioId, otroUsuarioId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener conversación:', error);
    res.status(500).json({ error: 'Error al obtener conversación' });
  }
};

// ── Enviar mensaje directo entre usuarios ─────────────────────────────────────
export const enviarDirecto = async (req: AuthRequest, res: Response) => {
  try {
    const { destinatario_id, cuerpo } = req.body;
    const remitenteId = req.user?.id;

    if (!destinatario_id || !cuerpo?.trim()) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const destinatario = await query(
      'SELECT id, email FROM usuarios WHERE id = $1',
      [destinatario_id]
    );
    if (destinatario.rows.length === 0) {
      return res.status(404).json({ error: 'Destinatario no encontrado' });
    }

    const remitente = await query(
      'SELECT email FROM usuarios WHERE id = $1',
      [remitenteId]
    );

    const asunto = `💬 Mensaje directo de ${remitente.rows[0]?.email || 'la plataforma'}`;

    const result = await query(
      `INSERT INTO mensajes (remitente_id, destinatario_id, asunto, cuerpo, relacionado_tipo, relacionado_id)
       VALUES ($1, $2, $3, $4, 'chat_directo', $1)
       RETURNING *`,
      [remitenteId, destinatario_id, asunto, cuerpo.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al enviar mensaje directo:', error);
    res.status(500).json({ error: 'Error al enviar mensaje directo' });
  }
};

// ── Obtener lista de conversaciones directas activas ─────────────────────────
export const getConversaciones = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.user?.id;

    const result = await query(
      `SELECT
         CASE WHEN remitente_id = $1 THEN destinatario_id ELSE remitente_id END as otro_usuario_id,
         u.email as otro_email,
         u.tipo_usuario as otro_tipo,
         COALESCE(v.nombre || ' ' || v.apellidos, e.nombre_legal, u.email) as otro_nombre,
         MAX(m.created_at) as ultima_fecha,
         COUNT(*) FILTER (WHERE m.leido = false AND m.destinatario_id = $1 AND m.remitente_id != $1) as no_leidos
       FROM mensajes m
       JOIN usuarios u ON u.id = CASE WHEN m.remitente_id = $1 THEN m.destinatario_id ELSE m.remitente_id END
       LEFT JOIN voluntarios v ON v.usuario_id = u.id
       LEFT JOIN entidades_sociales e ON e.usuario_id = u.id
       WHERE m.relacionado_tipo = 'chat_directo'
         AND (m.remitente_id = $1 OR m.destinatario_id = $1)
       GROUP BY otro_usuario_id, u.email, u.tipo_usuario, v.nombre, v.apellidos, e.nombre_legal
       ORDER BY ultima_fecha DESC`,
      [usuarioId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    res.status(500).json({ error: 'Error al obtener conversaciones' });
  }
};

// ── CHAT POR ACTIVIDAD ────────────────────────────────────────────────────────

// Obtener mensajes del chat de una actividad entre dos usuarios
export const getConversacionActividad = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.user?.id;
    const { actividadId, otroUsuarioId } = req.params;

    // Comprobar si la actividad ha terminado
    const actividad = await query(
      'SELECT fecha_fin FROM actividades WHERE id = $1',
      [actividadId]
    );

    const actividadFin = actividad.rows[0]?.fecha_fin
      ? new Date(actividad.rows[0].fecha_fin)
      : null;
    const actividadTerminada = actividadFin ? actividadFin < new Date() : false;

    const result = await query(
      `SELECT m.*,
              u_remitente.email as remitente_email,
              u_remitente.tipo_usuario as remitente_tipo
       FROM mensajes m
       JOIN usuarios u_remitente ON m.remitente_id = u_remitente.id
       WHERE m.relacionado_tipo = 'chat_actividad'
         AND m.actividad_id = $3
         AND (
           (m.remitente_id = $1 AND m.destinatario_id = $2) OR
           (m.remitente_id = $2 AND m.destinatario_id = $1)
         )
       ORDER BY m.created_at ASC`,
      [usuarioId, otroUsuarioId, actividadId]
    );

    // Marcar como leídos
    await query(
      `UPDATE mensajes SET leido = true
       WHERE relacionado_tipo = 'chat_actividad'
         AND actividad_id = $3
         AND remitente_id = $2
         AND destinatario_id = $1
         AND leido = false`,
      [usuarioId, otroUsuarioId, actividadId]
    );

    res.json({ mensajes: result.rows, actividadTerminada });
  } catch (error) {
    console.error('Error al obtener chat de actividad:', error);
    res.status(500).json({ error: 'Error al obtener chat de actividad' });
  }
};

// Enviar mensaje en el chat de una actividad
export const enviarMensajeActividad = async (req: AuthRequest, res: Response) => {
  try {
    const { destinatario_id, cuerpo, actividad_id } = req.body;
    const remitenteId = req.user?.id;

    if (!destinatario_id || !cuerpo?.trim() || !actividad_id) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Verificar que la actividad no ha terminado
    const actividad = await query(
      'SELECT fecha_fin, nombre FROM actividades WHERE id = $1',
      [actividad_id]
    );

    if (actividad.rows.length === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    const fechaFin = new Date(actividad.rows[0].fecha_fin);
    if (fechaFin < new Date()) {
      return res.status(403).json({ error: 'Esta actividad ha finalizado. El chat está cerrado.' });
    }

    const remitente = await query('SELECT email FROM usuarios WHERE id = $1', [remitenteId]);
    const nombreActividad = actividad.rows[0].nombre;
    const asunto = `💬 Chat actividad: ${nombreActividad}`;

    const result = await query(
      `INSERT INTO mensajes (remitente_id, destinatario_id, asunto, cuerpo, relacionado_tipo, relacionado_id, actividad_id)
       VALUES ($1, $2, $3, $4, 'chat_actividad', $5, $5)
       RETURNING *`,
      [remitenteId, destinatario_id, asunto, cuerpo.trim(), actividad_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al enviar mensaje de actividad:', error);
    res.status(500).json({ error: 'Error al enviar mensaje de actividad' });
  }
};

// Obtener lista de chats de actividad activos del usuario
export const getConversacionesActividad = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.user?.id;

    const result = await query(
      `SELECT
         m.actividad_id,
         a.nombre as actividad_nombre,
         a.fecha_fin as actividad_fecha_fin,
         CASE WHEN m.remitente_id = $1 THEN m.destinatario_id ELSE m.remitente_id END as otro_usuario_id,
         u.email as otro_email,
         u.tipo_usuario as otro_tipo,
         COALESCE(v.nombre || ' ' || v.apellidos, e.nombre_legal, u.email) as otro_nombre,
         MAX(m.created_at) as ultima_fecha,
         COUNT(*) FILTER (WHERE m.leido = false AND m.destinatario_id = $1 AND m.remitente_id != $1) as no_leidos
       FROM mensajes m
       JOIN usuarios u ON u.id = CASE WHEN m.remitente_id = $1 THEN m.destinatario_id ELSE m.remitente_id END
       LEFT JOIN voluntarios v ON v.usuario_id = u.id
       LEFT JOIN entidades_sociales e ON e.usuario_id = u.id
       JOIN actividades a ON a.id = m.actividad_id
       WHERE m.relacionado_tipo = 'chat_actividad'
         AND (m.remitente_id = $1 OR m.destinatario_id = $1)
       GROUP BY m.actividad_id, a.nombre, a.fecha_fin, otro_usuario_id, u.email, u.tipo_usuario, v.nombre, v.apellidos, e.nombre_legal
       ORDER BY ultima_fecha DESC`,
      [usuarioId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener chats de actividad:', error);
    res.status(500).json({ error: 'Error al obtener chats de actividad' });
  }
};

// ── Función auxiliar para mensajes automáticos del sistema ────────────────────
export const enviarMensajeAutomatico = async (
  destinatarioId: string,
  asunto: string,
  cuerpo: string,
  relacionadoTipo?: string,
  relacionadoId?: string,
  remitenteId?: string
) => {
  try {
    const remitente = remitenteId || destinatarioId;

    await query(
      `INSERT INTO mensajes (remitente_id, destinatario_id, asunto, cuerpo, relacionado_tipo, relacionado_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [remitente, destinatarioId, asunto, cuerpo, relacionadoTipo || null, relacionadoId || null]
    );
  } catch (error) {
    console.error('Error al enviar mensaje automático:', error);
  }
};
