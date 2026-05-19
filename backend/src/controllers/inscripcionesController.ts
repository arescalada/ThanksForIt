import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';
import { enviarMensajeAutomatico } from './mensajesController';

const getOrCreateVoluntario = async (usuarioId: string): Promise<string> => {
  const existing = await query('SELECT id FROM voluntarios WHERE usuario_id = $1', [usuarioId]);
  if (existing.rows.length > 0) return existing.rows[0].id;
  const usuario = await query('SELECT email FROM usuarios WHERE id = $1', [usuarioId]);
  const email = usuario.rows[0]?.email || '';
  const result = await query(
    `INSERT INTO voluntarios (usuario_id, nombre, apellidos, fecha_nacimiento, dni_nie, telefono)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [usuarioId, email.split('@')[0], 'Pendiente', '2000-01-01', 'PENDIENTE-' + usuarioId.slice(0, 8), '000000000']
  );
  return result.rows[0].id;
};

// ── Voluntario se inscribe a una actividad pública ────────────────────────────
export const inscribirse = async (req: AuthRequest, res: Response) => {
  try {
    const { actividadId } = req.params;
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ error: 'No autenticado' });

    const actividad = await query(
      `SELECT a.*, e.usuario_id as entidad_usuario_id, e.nombre_legal as entidad_nombre
       FROM actividades a
       JOIN entidades_sociales e ON a.entidad_id = e.id
       WHERE a.id = $1 AND a.estado = 'publicada'`,
      [actividadId]
    );
    if (actividad.rows.length === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada o no disponible' });
    }
    const act = actividad.rows[0];

    const voluntarioId = await getOrCreateVoluntario(String(usuarioId));

    const volData = await query(
      `SELECT v.nombre, v.apellidos, u.email
       FROM voluntarios v JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id = $1`,
      [voluntarioId]
    );
    const vol = volData.rows[0];
    const volNombre = (vol?.nombre && vol.nombre !== 'Pendiente')
      ? `${vol.nombre} ${vol.apellidos || ''}`.trim()
      : vol?.email || 'Un voluntario';

    const yaInscrito = await query(
      'SELECT id FROM voluntario_actividad WHERE voluntario_id = $1 AND actividad_id = $2',
      [voluntarioId, actividadId]
    );
    if (yaInscrito.rows.length > 0) {
      return res.status(400).json({ error: 'Ya estás inscrito en esta actividad' });
    }

    await query(
      `INSERT INTO voluntario_actividad (voluntario_id, actividad_id, estado) VALUES ($1, $2, 'pendiente')`,
      [voluntarioId, actividadId]
    );

    // Mensaje a la entidad — remitente: el voluntario
    await enviarMensajeAutomatico(
      act.entidad_usuario_id,
      `Nueva solicitud de inscripción: ${act.nombre}`,
      `📋 Nueva solicitud de voluntariado\n\n` +
      `El/la voluntario/a ${volNombre} (${vol?.email || ''}) quiere unirse a tu actividad:\n\n` +
      `🎯 Actividad: ${act.nombre}\n` +
      `📍 Municipio: ${act.municipio}\n\n` +
      `Para aceptar o rechazar esta solicitud, ve a tu Panel de Entidad → Ver inscripciones.`,
      'inscripcion',
      actividadId,
      String(usuarioId) // remitente: el voluntario
    );

    // Confirmación al voluntario — remitente: la entidad
    await enviarMensajeAutomatico(
      String(usuarioId),
      `Solicitud enviada: ${act.nombre}`,
      `✅ Tu solicitud ha sido enviada correctamente\n\n` +
      `Has solicitado unirte a la actividad de voluntariado:\n\n` +
      `🎯 ${act.nombre}\n` +
      `🏢 Organización: ${act.entidad_nombre}\n` +
      `📍 Municipio: ${act.municipio}\n\n` +
      `Tu solicitud está pendiente de aceptación por parte de la entidad.\n` +
      `Recibirás un mensaje aquí cuando tomen una decisión.\n\n` +
      `¡Gracias por tu interés en el voluntariado cultural! 🌿`,
      'inscripcion',
      actividadId,
      act.entidad_usuario_id // remitente: la entidad
    );

    res.status(201).json({ mensaje: '¡Solicitud de inscripción enviada! La entidad revisará tu solicitud.' });
  } catch (error) {
    console.error('Error al inscribirse:', error);
    res.status(500).json({ error: 'Error al procesar la inscripción' });
  }
};

// ── Voluntario ve sus inscripciones ──────────────────────────────────────────
export const getInscripciones = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.user?.id;
    const voluntario = await query('SELECT id FROM voluntarios WHERE usuario_id = $1', [usuarioId]);
    if (voluntario.rows.length === 0) return res.json([]);

    const result = await query(
      `SELECT
         a.id, a.nombre, a.municipio, a.fecha_inicio, a.fecha_fin,
         a.descripcion, a.horarios, a.num_voluntarios_objetivo,
         va.estado, va.fecha_inscripcion,
         u_ent.email as entidad_email,
         e.nombre_legal as entidad_nombre,
         COUNT(va2.id) FILTER (WHERE va2.estado IN ('confirmado','pendiente','inscrito')) as inscritos
       FROM voluntario_actividad va
       JOIN actividades a ON va.actividad_id = a.id
       JOIN entidades_sociales e ON a.entidad_id = e.id
       JOIN usuarios u_ent ON e.usuario_id = u_ent.id
       LEFT JOIN voluntario_actividad va2 ON va2.actividad_id = a.id
       WHERE va.voluntario_id = $1
       GROUP BY a.id, va.id, e.id, u_ent.id
       ORDER BY va.fecha_inscripcion DESC`,
      [voluntario.rows[0].id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener inscripciones:', error);
    res.status(500).json({ error: 'Error al obtener inscripciones' });
  }
};

// ── Voluntario cancela su propia inscripción ──────────────────────────────────
export const cancelarInscripcion = async (req: AuthRequest, res: Response) => {
  try {
    const { actividadId } = req.params;
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ error: 'No autenticado' });

    const voluntario = await query(
      'SELECT id, nombre, apellidos FROM voluntarios WHERE usuario_id = $1',
      [usuarioId]
    );
    if (voluntario.rows.length === 0) {
      return res.status(404).json({ error: 'Voluntario no encontrado' });
    }
    const voluntarioId = voluntario.rows[0].id;

    const inscripcion = await query(
      `SELECT va.id, va.estado, a.nombre as actividad_nombre, a.municipio,
              e.nombre_legal as entidad_nombre, e.usuario_id as entidad_usuario_id
       FROM voluntario_actividad va
       JOIN actividades a ON va.actividad_id = a.id
       JOIN entidades_sociales e ON a.entidad_id = e.id
       WHERE va.voluntario_id = $1 AND va.actividad_id = $2`,
      [voluntarioId, actividadId]
    );
    if (inscripcion.rows.length === 0) {
      return res.status(404).json({ error: 'No estás inscrito en esta actividad' });
    }

    const insc = inscripcion.rows[0];

    if (insc.estado === 'cancelado') {
      return res.status(400).json({ error: 'La inscripción ya estaba cancelada' });
    }

    await query(
      `UPDATE voluntario_actividad SET estado = 'cancelado' WHERE voluntario_id = $1 AND actividad_id = $2`,
      [voluntarioId, actividadId]
    );

    const volNombre = (voluntario.rows[0].nombre && voluntario.rows[0].nombre !== 'Pendiente')
      ? `${voluntario.rows[0].nombre} ${voluntario.rows[0].apellidos || ''}`.trim()
      : 'Un voluntario';

    // Aviso a la entidad — remitente: el voluntario
    await enviarMensajeAutomatico(
      insc.entidad_usuario_id,
      `❌ ${volNombre} ha cancelado su inscripción: ${insc.actividad_nombre}`,
      `Un voluntario ha cancelado su participación en tu actividad.\n\n` +
      `🙋 Voluntario: ${volNombre}\n` +
      `🎯 Actividad: ${insc.actividad_nombre}\n` +
      `📍 Municipio: ${insc.municipio}\n\n` +
      `Puedes invitar a otros voluntarios desde el panel de gestión de la actividad. 🌿`,
      'inscripcion',
      actividadId,
      String(usuarioId) // remitente: el voluntario
    );

    res.json({ mensaje: 'Inscripción cancelada correctamente' });
  } catch (error) {
    console.error('Error al cancelar inscripción:', error);
    res.status(500).json({ error: 'Error al cancelar la inscripción' });
  }
};

// ── Voluntario acepta o rechaza una invitación ────────────────────────────────
export const responderInvitacion = async (req: AuthRequest, res: Response) => {
  try {
    const { inscripcionId } = req.params;
    const { accion } = req.body;
    const usuarioId = req.user?.id;

    const voluntario = await query(
      'SELECT id, nombre, apellidos FROM voluntarios WHERE usuario_id = $1',
      [usuarioId]
    );
    if (voluntario.rows.length === 0) return res.status(404).json({ error: 'Voluntario no encontrado' });

    const inscripcion = await query(
      `SELECT va.id, va.actividad_id, va.estado,
              a.nombre as actividad_nombre, a.municipio, a.num_voluntarios_objetivo,
              e.nombre_legal as entidad_nombre, e.usuario_id as entidad_usuario_id
       FROM voluntario_actividad va
       JOIN actividades a ON va.actividad_id = a.id
       JOIN entidades_sociales e ON a.entidad_id = e.id
       WHERE va.id = $1 AND va.voluntario_id = $2`,
      [inscripcionId, voluntario.rows[0].id]
    );

    if (inscripcion.rows.length === 0) {
      return res.status(404).json({ error: 'Invitación no encontrada' });
    }

    const insc = inscripcion.rows[0];

    if (insc.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Esta invitación ya fue respondida' });
    }

    const nuevoEstado = accion === 'aceptar' ? 'confirmado' : 'rechazado';
    await query(
      'UPDATE voluntario_actividad SET estado = $1 WHERE id = $2',
      [nuevoEstado, inscripcionId]
    );

    const confirmadosResult = await query(
      `SELECT COUNT(*) as total FROM voluntario_actividad
       WHERE actividad_id = $1 AND estado = 'confirmado'`,
      [insc.actividad_id]
    );
    const confirmados = parseInt(confirmadosResult.rows[0].total);
    const objetivo = insc.num_voluntarios_objetivo || 0;
    const restantes = Math.max(0, objetivo - confirmados);

    const volUsuario = await query('SELECT email FROM usuarios WHERE id = $1', [usuarioId]);
    const volEmail = volUsuario.rows[0]?.email || '';
    const volNombre = (voluntario.rows[0].nombre && voluntario.rows[0].nombre !== 'Pendiente')
      ? `${voluntario.rows[0].nombre} ${voluntario.rows[0].apellidos || ''}`.trim()
      : volEmail;

    if (accion === 'aceptar') {
      // Aviso a la entidad — remitente: el voluntario
      await enviarMensajeAutomatico(
        insc.entidad_usuario_id,
        `✅ ${volNombre} ha aceptado la invitación: ${insc.actividad_nombre}`,
        `🎉 Un voluntario ha aceptado tu invitación\n\n` +
        `🙋 Voluntario: ${volNombre} (${volEmail})\n` +
        `🎯 Actividad: ${insc.actividad_nombre}\n` +
        `📍 Municipio: ${insc.municipio}\n\n` +
        `📊 Estado actual:\n` +
        `   ✅ Confirmados: ${confirmados} / ${objetivo}\n` +
        `   📢 Plazas restantes: ${restantes}\n\n` +
        `${restantes === 0 ? '🎊 ¡Has completado el cupo de voluntarios!' : `Aún necesitas ${restantes} voluntario${restantes !== 1 ? 's' : ''} más.`}`,
        'inscripcion',
        insc.actividad_id,
        String(usuarioId) // remitente: el voluntario
      );
    } else {
      // Aviso a la entidad — remitente: el voluntario
      await enviarMensajeAutomatico(
        insc.entidad_usuario_id,
        `ℹ️ ${volNombre} no puede participar: ${insc.actividad_nombre}`,
        `El/la voluntario/a ${volNombre} (${volEmail}) ha declinado la invitación para:\n\n` +
        `🎯 Actividad: ${insc.actividad_nombre}\n` +
        `📍 Municipio: ${insc.municipio}\n\n` +
        `📊 Estado actual:\n` +
        `   ✅ Confirmados: ${confirmados} / ${objetivo}\n` +
        `   📢 Plazas restantes: ${restantes}\n\n` +
        `Puedes invitar a otros voluntarios desde el editor de la actividad.`,
        'inscripcion',
        insc.actividad_id,
        String(usuarioId) // remitente: el voluntario
      );
    }

    res.json({ mensaje: accion === 'aceptar' ? '¡Invitación aceptada!' : 'Invitación rechazada' });
  } catch (error) {
    console.error('Error al responder invitación:', error);
    res.status(500).json({ error: 'Error al procesar la respuesta' });
  }
};

// ── Entidad ve inscripciones de una actividad ─────────────────────────────────
export const getInscripcionesActividad = async (req: AuthRequest, res: Response) => {
  try {
    const { actividadId } = req.params;

    const result = await query(
      `SELECT
         va.id, va.estado, va.fecha_inscripcion,
         v.id as voluntario_id, v.nombre, v.apellidos, v.telefono,
         v.direccion as municipio, v.dni_nie,
         u.id as usuario_id, u.email
       FROM voluntario_actividad va
       JOIN voluntarios v ON va.voluntario_id = v.id
       JOIN usuarios u ON v.usuario_id = u.id
       WHERE va.actividad_id = $1
       ORDER BY va.fecha_inscripcion ASC`,
      [actividadId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener inscripciones:', error);
    res.status(500).json({ error: 'Error al obtener inscripciones' });
  }
};

// ── Entidad acepta o rechaza una inscripción ──────────────────────────────────
export const gestionarInscripcion = async (req: AuthRequest, res: Response) => {
  try {
    const { inscripcionId } = req.params;
    const { accion } = req.body;

    const nuevoEstado = accion === 'aceptar' ? 'confirmado' : 'cancelado';

    const inscResult = await query(
      `SELECT va.*, va.actividad_id, a.nombre as actividad_nombre, a.municipio, a.num_voluntarios_objetivo,
              u.id as voluntario_usuario_id, u.email as voluntario_email,
              v.nombre as voluntario_nombre, v.apellidos as voluntario_apellidos,
              e.nombre_legal as entidad_nombre, e.usuario_id as entidad_usuario_id
       FROM voluntario_actividad va
       JOIN voluntarios v ON va.voluntario_id = v.id
       JOIN usuarios u ON v.usuario_id = u.id
       JOIN actividades a ON va.actividad_id = a.id
       JOIN entidades_sociales e ON a.entidad_id = e.id
       WHERE va.id = $1`,
      [inscripcionId]
    );

    if (inscResult.rows.length === 0) {
      return res.status(404).json({ error: 'Inscripción no encontrada' });
    }

    const insc = inscResult.rows[0];

    await query(`UPDATE voluntario_actividad SET estado = $1 WHERE id = $2`, [nuevoEstado, inscripcionId]);

    const confirmadosResult = await query(
      `SELECT COUNT(*) as total FROM voluntario_actividad WHERE actividad_id = $1 AND estado = 'confirmado'`,
      [insc.actividad_id]
    );
    const confirmados = parseInt(confirmadosResult.rows[0].total);
    const objetivo = insc.num_voluntarios_objetivo || 0;
    const restantes = Math.max(0, objetivo - confirmados);

    const volNombre = (insc.voluntario_nombre && insc.voluntario_nombre !== 'Pendiente')
      ? `${insc.voluntario_nombre} ${insc.voluntario_apellidos || ''}`.trim()
      : insc.voluntario_email;

    if (accion === 'aceptar') {
      // Aviso al voluntario — remitente: la entidad
      await enviarMensajeAutomatico(
        insc.voluntario_usuario_id,
        `✅ ¡Inscripción confirmada! ${insc.actividad_nombre}`,
        `🎉 ¡Enhorabuena, ${volNombre}!\n\n` +
        `La entidad ${insc.entidad_nombre} ha ACEPTADO tu solicitud de inscripción.\n\n` +
        `🎯 Actividad: ${insc.actividad_nombre}\n` +
        `🏢 Entidad: ${insc.entidad_nombre}\n` +
        `📍 Municipio: ${insc.municipio}\n\n` +
        `Ya estás confirmado/a como voluntario/a en esta actividad.\n\n` +
        `¡Muchas gracias por tu compromiso con el voluntariado cultural! 🌿`,
        'inscripcion',
        insc.actividad_id,
        insc.entidad_usuario_id // remitente: la entidad
      );
    } else {
      // Aviso al voluntario — remitente: la entidad
      await enviarMensajeAutomatico(
        insc.voluntario_usuario_id,
        `Solicitud no aceptada: ${insc.actividad_nombre}`,
        `Hola ${volNombre},\n\n` +
        `Lamentamos informarte de que la entidad ${insc.entidad_nombre} no ha podido aceptar tu solicitud para:\n\n` +
        `🎯 Actividad: ${insc.actividad_nombre}\n` +
        `📍 Municipio: ${insc.municipio}\n\n` +
        `¡No te desanimes! Explora otras actividades disponibles en la plataforma. 🌿`,
        'inscripcion',
        insc.actividad_id,
        insc.entidad_usuario_id // remitente: la entidad
      );
    }

    // Si se completa el cupo, aviso a la propia entidad
    if (accion === 'aceptar' && restantes === 0) {
      await enviarMensajeAutomatico(
        insc.entidad_usuario_id,
        `🎊 ¡Cupo completo! ${insc.actividad_nombre}`,
        `¡Has completado el cupo de voluntarios para la actividad!\n\n` +
        `🎯 Actividad: ${insc.actividad_nombre}\n` +
        `✅ Voluntarios confirmados: ${confirmados} / ${objetivo}\n\n` +
        `¡Enhorabuena! Tienes todos los voluntarios que necesitabas. 🌿`,
        'inscripcion',
        insc.actividad_id,
        insc.entidad_usuario_id // remitente: la propia entidad (aviso interno)
      );
    }

    res.json({ mensaje: accion === 'aceptar' ? 'Voluntario confirmado' : 'Inscripción rechazada' });
  } catch (error) {
    console.error('Error al gestionar inscripción:', error);
    res.status(500).json({ error: 'Error al gestionar inscripción' });
  }
};

// ── Entidad invita a un voluntario a una actividad ────────────────────────────
export const invitarVoluntario = async (req: AuthRequest, res: Response) => {
  try {
    const { actividadId, voluntarioId } = req.params;
    const usuarioId = req.user?.id; // usuario de la entidad

    const actResult = await query(
      `SELECT a.nombre, a.municipio, e.nombre_legal as entidad_nombre, e.usuario_id as entidad_usuario_id
       FROM actividades a JOIN entidades_sociales e ON a.entidad_id = e.id
       WHERE a.id = $1`,
      [actividadId]
    );
    if (actResult.rows.length === 0) return res.status(404).json({ error: 'Actividad no encontrada' });
    const act = actResult.rows[0];

    const volResult = await query(
      `SELECT v.id, v.nombre, v.apellidos, u.id as usuario_id, u.email
       FROM voluntarios v JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id = $1`,
      [voluntarioId]
    );
    if (volResult.rows.length === 0) return res.status(404).json({ error: 'Voluntario no encontrado' });
    const vol = volResult.rows[0];

    const yaExiste = await query(
      'SELECT id FROM voluntario_actividad WHERE voluntario_id = $1 AND actividad_id = $2',
      [voluntarioId, actividadId]
    );
    if (yaExiste.rows.length > 0) {
      return res.status(400).json({ error: 'Este voluntario ya está vinculado a esta actividad' });
    }

    const insertResult = await query(
      `INSERT INTO voluntario_actividad (voluntario_id, actividad_id, estado) VALUES ($1, $2, 'pendiente') RETURNING id`,
      [voluntarioId, actividadId]
    );
    const nuevaInscripcionId = insertResult.rows[0].id;

    const volNombre = (vol.nombre && vol.nombre !== 'Pendiente')
      ? `${vol.nombre} ${vol.apellidos || ''}`.trim()
      : vol.email;

    // Invitación al voluntario — remitente: la entidad
    await enviarMensajeAutomatico(
      vol.usuario_id,
      `📩 Invitación de voluntariado: ${act.nombre}`,
      `Hola ${volNombre},\n\n` +
      `La entidad ${act.entidad_nombre} te ha invitado a participar como voluntario/a en:\n\n` +
      `🎯 Actividad: ${act.nombre}\n` +
      `🏢 Entidad: ${act.entidad_nombre}\n` +
      `📍 Municipio: ${act.municipio}\n\n` +
      `Para aceptar o rechazar esta invitación, pulsa los botones que aparecen en este mensaje.\n\n` +
      `¡Esperamos contar contigo! 🌿`,
      'inscripcion',
      nuevaInscripcionId,
      act.entidad_usuario_id // remitente: la entidad
    );

    res.status(201).json({ mensaje: 'Invitación enviada al voluntario' });
  } catch (error) {
    console.error('Error al invitar voluntario:', error);
    res.status(500).json({ error: 'Error al enviar invitación' });
  }
};
