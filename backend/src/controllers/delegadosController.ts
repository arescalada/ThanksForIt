import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';
import bcrypt from 'bcryptjs';

// ── La entidad crea un delegado (nuevo usuario tipo 'delegado') ───────────────
export const crearDelegado = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, cargo, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
    }

    // Obtener entidad del usuario que hace la petición
    const entidadResult = await query(
      'SELECT id FROM entidades_sociales WHERE usuario_id = $1',
      [req.user?.id]
    );
    if (entidadResult.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes perfil de entidad' });
    }
    const entidad_id = entidadResult.rows[0].id;

    // Comprobar que el email no existe
    const existe = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email' });
    }

    // Crear usuario tipo delegado
    const hash = await bcrypt.hash(password, 10);
    const nuevoUsuario = await query(
      `INSERT INTO usuarios (email, password_hash, tipo_usuario)
       VALUES ($1, $2, 'delegado') RETURNING id`,
      [email, hash]
    );
    const usuario_id = nuevoUsuario.rows[0].id;

    // Crear registro en delegados
    const delegado = await query(
      `INSERT INTO delegados (usuario_id, entidad_id, nombre, cargo)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [usuario_id, entidad_id, nombre, cargo || null]
    );

    res.status(201).json({ ...delegado.rows[0], email });
  } catch (error) {
    console.error('Error al crear delegado:', error);
    res.status(500).json({ error: 'Error al crear delegado' });
  }
};

// ── Listar delegados de la entidad ───────────────────────────────────────────
export const getDelegados = async (req: AuthRequest, res: Response) => {
  try {
    const entidadResult = await query(
      'SELECT id FROM entidades_sociales WHERE usuario_id = $1',
      [req.user?.id]
    );
    if (entidadResult.rows.length === 0) return res.json([]);
    const entidad_id = entidadResult.rows[0].id;

    const result = await query(
      `SELECT d.id, d.nombre, d.cargo, d.activo, d.created_at, u.email, u.id as usuario_id
       FROM delegados d
       JOIN usuarios u ON d.usuario_id = u.id
       WHERE d.entidad_id = $1
       ORDER BY d.created_at DESC`,
      [entidad_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener delegados:', error);
    res.status(500).json({ error: 'Error al obtener delegados' });
  }
};

// ── Activar / desactivar delegado ────────────────────────────────────────────
export const toggleDelegado = async (req: AuthRequest, res: Response) => {
  try {
    const { delegadoId } = req.params;

    const entidadResult = await query(
      'SELECT id FROM entidades_sociales WHERE usuario_id = $1',
      [req.user?.id]
    );
    if (entidadResult.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes perfil de entidad' });
    }
    const entidad_id = entidadResult.rows[0].id;

    const delegado = await query(
      'SELECT id, activo FROM delegados WHERE id = $1 AND entidad_id = $2',
      [delegadoId, entidad_id]
    );
    if (delegado.rows.length === 0) {
      return res.status(404).json({ error: 'Delegado no encontrado' });
    }

    const nuevoEstado = !delegado.rows[0].activo;
    await query('UPDATE delegados SET activo = $1 WHERE id = $2', [nuevoEstado, delegadoId]);

    res.json({ activo: nuevoEstado });
  } catch (error) {
    console.error('Error al cambiar estado delegado:', error);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

// ── Eliminar delegado ─────────────────────────────────────────────────────────
export const eliminarDelegado = async (req: AuthRequest, res: Response) => {
  try {
    const { delegadoId } = req.params;

    const entidadResult = await query(
      'SELECT id FROM entidades_sociales WHERE usuario_id = $1',
      [req.user?.id]
    );
    if (entidadResult.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes perfil de entidad' });
    }
    const entidad_id = entidadResult.rows[0].id;

    // Obtener usuario_id del delegado antes de borrar
    const delegado = await query(
      'SELECT usuario_id FROM delegados WHERE id = $1 AND entidad_id = $2',
      [delegadoId, entidad_id]
    );
    if (delegado.rows.length === 0) {
      return res.status(404).json({ error: 'Delegado no encontrado' });
    }

    const usuario_id = delegado.rows[0].usuario_id;

    // Borrar delegado y usuario (CASCADE borra el delegado)
    await query('DELETE FROM usuarios WHERE id = $1', [usuario_id]);

    res.json({ mensaje: 'Delegado eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar delegado:', error);
    res.status(500).json({ error: 'Error al eliminar delegado' });
  }
};

// ── Lo que el delegado necesita al iniciar sesión ────────────────────────────

// Obtener la entidad a la que pertenece el delegado
export const getMiEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT e.id, e.nombre_legal, e.nif, e.direccion, e.web,
              e.admin_nombre, e.admin_email, e.admin_telefono,
              d.nombre as delegado_nombre, d.cargo as delegado_cargo,
              d.telefono as delegado_telefono, d.dni as delegado_dni,
              d.direccion as delegado_direccion, d.fecha_nacimiento as delegado_fecha_nacimiento
       FROM delegados d
       JOIN entidades_sociales e ON d.entidad_id = e.id
       WHERE d.usuario_id = $1 AND d.activo = true`,
      [req.user?.id]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Delegado no activo o no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener entidad del delegado:', error);
    res.status(500).json({ error: 'Error al obtener entidad' });
  }
};

// Actividades de la entidad (para el delegado)
export const getActividadesDelegado = async (req: AuthRequest, res: Response) => {
  try {
    const delegadoResult = await query(
      'SELECT entidad_id FROM delegados WHERE usuario_id = $1 AND activo = true',
      [req.user?.id]
    );
    if (delegadoResult.rows.length === 0) return res.status(403).json({ error: 'No autorizado' });

    const entidad_id = delegadoResult.rows[0].entidad_id;

    const result = await query(
      `SELECT a.*,
              COUNT(va.voluntario_id)::int AS inscritos,
              GREATEST(a.num_voluntarios_objetivo - COUNT(va.voluntario_id)::int, 0) AS faltan
       FROM actividades a
       LEFT JOIN voluntario_actividad va ON va.actividad_id = a.id
       WHERE a.entidad_id = $1
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [entidad_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error actividades delegado:', error);
    res.status(500).json({ error: 'Error al obtener actividades' });
  }
};

// Voluntarios de las actividades de la entidad (para el delegado)
export const getVoluntariosDelegado = async (req: AuthRequest, res: Response) => {
  try {
    const delegadoResult = await query(
      'SELECT entidad_id FROM delegados WHERE usuario_id = $1 AND activo = true',
      [req.user?.id]
    );
    if (delegadoResult.rows.length === 0) return res.status(403).json({ error: 'No autorizado' });

    const entidad_id = delegadoResult.rows[0].entidad_id;

    const result = await query(
      `SELECT DISTINCT
         v.id, v.usuario_id, v.nombre, v.apellidos, v.telefono,
         v.direccion as municipio, v.dni_nie,
         u.email,
         COALESCE(ve.estado, 'no_vinculado') as vinculacion
       FROM voluntario_actividad i
       JOIN actividades a ON i.actividad_id = a.id
       JOIN voluntarios v ON i.voluntario_id = v.id
       JOIN usuarios u ON v.usuario_id = u.id
       LEFT JOIN voluntario_entidad ve ON ve.voluntario_id = v.id AND ve.entidad_id = $1
       WHERE a.entidad_id = $1
       ORDER BY v.nombre ASC`,
      [entidad_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error voluntarios delegado:', error);
    res.status(500).json({ error: 'Error al obtener voluntarios' });
  }
};

// Actualizar perfil propio del delegado (nombre y cargo)
export const actualizarMiPerfil = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, cargo, telefono, dni, direccion, fecha_nacimiento } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const result = await query(
      `UPDATE delegados SET nombre = $1, cargo = $2, telefono = $3, dni = $4, direccion = $5, fecha_nacimiento = $6
       WHERE usuario_id = $7 AND activo = true
       RETURNING nombre, cargo, telefono, dni, direccion, fecha_nacimiento`,
      [nombre, cargo || null, telefono || null, dni || null, direccion || null, fecha_nacimiento || null, req.user?.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delegado no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar perfil delegado:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

// El delegado obtiene la lista de su entidad + sus compañeros delegados para poder escribirles
export const getEquipoDelegado = async (req: AuthRequest, res: Response) => {
  try {
    const delegadoResult = await query(
      `SELECT d.entidad_id, e.usuario_id as entidad_usuario_id, e.nombre_legal
       FROM delegados d
       JOIN entidades_sociales e ON d.entidad_id = e.id
       WHERE d.usuario_id = $1 AND d.activo = true`,
      [req.user?.id]
    );
    if (delegadoResult.rows.length === 0) {
      return res.status(403).json({ error: 'Delegado no activo o no encontrado' });
    }

    const { entidad_id, entidad_usuario_id, nombre_legal } = delegadoResult.rows[0];

    // Obtener la entidad como contacto
    const entidadUsuario = await query(
      'SELECT email FROM usuarios WHERE id = $1',
      [entidad_usuario_id]
    );

    // Obtener compañeros delegados activos de la misma entidad (excluyendo al propio)
    const companeros = await query(
      `SELECT d.id, d.nombre, d.cargo, u.id as usuario_id, u.email
       FROM delegados d
       JOIN usuarios u ON d.usuario_id = u.id
       WHERE d.entidad_id = $1
         AND d.usuario_id != $2
         AND d.activo = true
       ORDER BY d.nombre ASC`,
      [entidad_id, req.user?.id]
    );

    res.json({
      entidad: {
        usuario_id: entidad_usuario_id,
        email: entidadUsuario.rows[0]?.email || '',
        nombre_legal,
      },
      companeros: companeros.rows,
    });
  } catch (error) {
    console.error('Error al obtener equipo del delegado:', error);
    res.status(500).json({ error: 'Error al obtener equipo' });
  }
};

// ── Mensajería entre entidad y delegado ──────────────────────────────────────

// La entidad envía un mensaje a uno de sus delegados
export const enviarMensajeADelegado = async (req: AuthRequest, res: Response) => {
  try {
    const { delegadoId } = req.params;
    const { asunto, cuerpo } = req.body;

    if (!asunto?.trim() || !cuerpo?.trim()) {
      return res.status(400).json({ error: 'Asunto y cuerpo son obligatorios' });
    }

    // Verificar que el delegado pertenece a esta entidad
    const entidadResult = await query(
      'SELECT id FROM entidades_sociales WHERE usuario_id = $1',
      [req.user?.id]
    );
    if (entidadResult.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes perfil de entidad' });
    }
    const entidad_id = entidadResult.rows[0].id;

    const delegado = await query(
      'SELECT usuario_id FROM delegados WHERE id = $1 AND entidad_id = $2 AND activo = true',
      [delegadoId, entidad_id]
    );
    if (delegado.rows.length === 0) {
      return res.status(404).json({ error: 'Delegado no encontrado o inactivo' });
    }

    const destinatario_id = delegado.rows[0].usuario_id;
    const remitente_id = req.user?.id;

    await query(
      `INSERT INTO mensajes (remitente_id, destinatario_id, asunto, cuerpo, relacionado_tipo)
       VALUES ($1, $2, $3, $4, 'entidad_delegado')`,
      [remitente_id, destinatario_id, asunto.trim(), cuerpo.trim()]
    );

    res.status(201).json({ mensaje: 'Mensaje enviado al delegado' });
  } catch (error) {
    console.error('Error al enviar mensaje a delegado:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
};

// El delegado envía un mensaje a su entidad
export const enviarMensajeAEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { asunto, cuerpo } = req.body;

    if (!asunto?.trim() || !cuerpo?.trim()) {
      return res.status(400).json({ error: 'Asunto y cuerpo son obligatorios' });
    }

    // Obtener entidad del delegado
    const delegadoResult = await query(
      `SELECT d.entidad_id, e.usuario_id as entidad_usuario_id
       FROM delegados d
       JOIN entidades_sociales e ON d.entidad_id = e.id
       WHERE d.usuario_id = $1 AND d.activo = true`,
      [req.user?.id]
    );
    if (delegadoResult.rows.length === 0) {
      return res.status(403).json({ error: 'Delegado no activo o no encontrado' });
    }

    const destinatario_id = delegadoResult.rows[0].entidad_usuario_id;
    const remitente_id = req.user?.id;

    await query(
      `INSERT INTO mensajes (remitente_id, destinatario_id, asunto, cuerpo, relacionado_tipo)
       VALUES ($1, $2, $3, $4, 'entidad_delegado')`,
      [remitente_id, destinatario_id, asunto.trim(), cuerpo.trim()]
    );

    res.status(201).json({ mensaje: 'Mensaje enviado a la entidad' });
  } catch (error) {
    console.error('Error al enviar mensaje a entidad:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
};

// ── Actividades de un voluntario concreto (para el delegado) ─────────────────
export const getActividadesVoluntarioDelegado = async (req: AuthRequest, res: Response) => {
  try {
    const { voluntarioId } = req.params;

    const delegadoResult = await query(
      'SELECT entidad_id FROM delegados WHERE usuario_id = $1 AND activo = true',
      [req.user?.id]
    );
    if (delegadoResult.rows.length === 0) return res.status(403).json({ error: 'No autorizado' });

    const entidad_id = delegadoResult.rows[0].entidad_id;

    const result = await query(
      `SELECT
         va.id as inscripcion_id,
         a.id as actividad_id,
         a.nombre,
         a.municipio,
         a.fecha_inicio,
         a.fecha_fin,
         va.estado
       FROM voluntario_actividad va
       JOIN actividades a ON va.actividad_id = a.id
       WHERE va.voluntario_id = $1
         AND a.entidad_id = $2
       ORDER BY a.fecha_inicio DESC`,
      [voluntarioId, entidad_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error actividades voluntario delegado:', error);
    res.status(500).json({ error: 'Error al obtener actividades del voluntario' });
  }
};

// ── Inscripciones de una actividad (para el delegado) ────────────────────────
export const getInscripcionesDelegado = async (req: AuthRequest, res: Response) => {
  try {
    const { actividadId } = req.params;

    const delegadoResult = await query(
      'SELECT entidad_id FROM delegados WHERE usuario_id = $1 AND activo = true',
      [req.user?.id]
    );
    if (delegadoResult.rows.length === 0) return res.status(403).json({ error: 'No autorizado' });

    const entidad_id = delegadoResult.rows[0].entidad_id;

    // Verificar que la actividad pertenece a su entidad
    const actCheck = await query(
      'SELECT id FROM actividades WHERE id = $1 AND entidad_id = $2',
      [actividadId, entidad_id]
    );
    if (actCheck.rows.length === 0) return res.status(403).json({ error: 'Actividad no pertenece a tu entidad' });

    const result = await query(
      `SELECT i.id, i.voluntario_id, i.estado, i.fecha_inscripcion,
              v.nombre, v.apellidos, v.telefono,
              v.direccion as municipio,
              u.email, u.id as usuario_id
       FROM voluntario_actividad i
       JOIN voluntarios v ON i.voluntario_id = v.id
       JOIN usuarios u ON v.usuario_id = u.id
       WHERE i.actividad_id = $1
       ORDER BY i.fecha_inscripcion DESC`,
      [actividadId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error inscripciones delegado:', error);
    res.status(500).json({ error: 'Error al obtener inscripciones' });
  }
};
