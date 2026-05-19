import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

// Obtener horas del voluntario
export const getMisHoras = async (req: AuthRequest, res: Response) => {
  try {
    const voluntarioResult = await query(
      'SELECT id FROM voluntarios WHERE usuario_id = $1',
      [req.user?.id]
    );

    if (voluntarioResult.rows.length === 0) {
      return res.json({ horas: [], resumen: { total_validadas: 0, total_pendientes: 0, total_canjeadas: 0, disponibles: 0 } });
    }

    const voluntarioId = voluntarioResult.rows[0].id;

    const horas = await query(
      `SELECT h.*, a.nombre as actividad_nombre, a.municipio
       FROM horas_registradas h
       JOIN actividades a ON h.actividad_id = a.id
       WHERE h.voluntario_id = $1
       ORDER BY h.fecha_registro DESC`,
      [voluntarioId]
    );

    // Calcular resumen
    const validadas = await query(
      `SELECT COALESCE(SUM(horas), 0) as total FROM horas_registradas
       WHERE voluntario_id = $1 AND estado = 'validada'`,
      [voluntarioId]
    );

    const pendientes = await query(
      `SELECT COALESCE(SUM(horas), 0) as total FROM horas_registradas
       WHERE voluntario_id = $1 AND estado = 'pendiente'`,
      [voluntarioId]
    );

    const canjeadas = await query(
      `SELECT COALESCE(SUM(horas_consumidas), 0) as total FROM canjes_realizados
       WHERE voluntario_id = $1 AND estado != 'cancelado'`,
      [voluntarioId]
    );

    const totalValidadas = parseFloat(validadas.rows[0].total);
    const totalCanjeadas = parseFloat(canjeadas.rows[0].total);

    res.json({
      horas: horas.rows,
      resumen: {
        total_validadas: totalValidadas,
        total_pendientes: parseFloat(pendientes.rows[0].total),
        total_canjeadas: totalCanjeadas,
        disponibles: totalValidadas - totalCanjeadas
      }
    });

  } catch (error) {
    console.error('Error al obtener horas:', error);
    res.status(500).json({ error: 'Error al obtener horas' });
  }
};

// Registrar horas manualmente
export const registrarHoras = async (req: AuthRequest, res: Response) => {
  try {
    const { actividad_id, horas, notas, fecha_registro } = req.body;

    if (!actividad_id || !horas) {
      return res.status(400).json({ error: 'actividad_id y horas son requeridos' });
    }

    if (horas <= 0 || horas > 24) {
      return res.status(400).json({ error: 'Las horas deben ser entre 0 y 24' });
    }

    const voluntarioResult = await query(
      'SELECT id FROM voluntarios WHERE usuario_id = $1',
      [req.user?.id]
    );

    if (voluntarioResult.rows.length === 0) {
      return res.status(403).json({ error: 'Solo los voluntarios pueden registrar horas' });
    }

    const voluntarioId = voluntarioResult.rows[0].id;

    // Verificar que el voluntario está inscrito en la actividad
    const inscrito = await query(
      'SELECT id FROM voluntario_actividad WHERE voluntario_id = $1 AND actividad_id = $2',
      [voluntarioId, actividad_id]
    );

    if (inscrito.rows.length === 0) {
      return res.status(400).json({ error: 'No estás inscrito en esta actividad' });
    }

    const fecha = fecha_registro || new Date().toISOString().split('T')[0];

    const result = await query(
      `INSERT INTO horas_registradas (voluntario_id, actividad_id, horas, notas, fecha_registro, estado, trimestre, anio)
       VALUES ($1, $2, $3, $4, $5, 'pendiente_delegado',
         EXTRACT(QUARTER FROM $5::date)::integer,
         EXTRACT(YEAR FROM $5::date)::integer
       )
       RETURNING *`,
      [voluntarioId, actividad_id, horas, notas || null, fecha]
    );

    res.status(201).json({
      mensaje: 'Horas registradas correctamente. Pendientes de validación.',
      horas: result.rows[0]
    });

  } catch (error) {
    console.error('Error al registrar horas:', error);
    res.status(500).json({ error: 'Error al registrar horas' });
  }
};

// Validar horas (admin/entidad) — endpoint legado, mantener por compatibilidad
export const validarHoras = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE horas_registradas SET estado = 'validada', fecha_validacion = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro de horas no encontrado' });
    }

    res.json({ mensaje: 'Horas validadas correctamente', horas: result.rows[0] });

  } catch (error) {
    console.error('Error al validar horas:', error);
    res.status(500).json({ error: 'Error al validar horas' });
  }
};

// ── FLUJO DE VALIDACIÓN POR NIVELES ──────────────────────────────────────────

// DELEGADO: ver horas pendientes de su entidad que necesitan su revisión
export const getHorasPendientesDelegado = async (req: AuthRequest, res: Response) => {
  try {
    // Buscar el delegado y su entidad asociada
    const delegadoRes = await query(
      `SELECT d.id, d.entidad_id FROM delegados d WHERE d.usuario_id = $1 AND d.activo = true`,
      [req.user?.id]
    );
    if (delegadoRes.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes perfil de delegado activo' });
    }
    const { entidad_id } = delegadoRes.rows[0];

    // Horas pendientes de voluntarios de actividades de esta entidad
    const result = await query(
      `SELECT h.id, h.horas, h.fecha_registro, h.notas, h.estado,
              a.nombre as actividad_nombre,
              v.nombre as voluntario_nombre, v.apellidos as voluntario_apellidos, u.email as voluntario_email,
              v.id as voluntario_id
       FROM horas_registradas h
       JOIN actividades a ON h.actividad_id = a.id
       JOIN voluntarios v ON h.voluntario_id = v.id
       JOIN usuarios u ON v.usuario_id = u.id
       WHERE a.entidad_id = $1
         AND h.estado = 'pendiente_delegado'
       ORDER BY h.fecha_registro DESC`,
      [entidad_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener horas pendientes delegado:', error);
    res.status(500).json({ error: 'Error al obtener horas pendientes' });
  }
};

// DELEGADO: aprobar horas → pasan a pendiente_entidad
export const aprobarHorasDelegado = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const delegadoRes = await query(
      `SELECT d.id, d.entidad_id FROM delegados d WHERE d.usuario_id = $1 AND d.activo = true`,
      [req.user?.id]
    );
    if (delegadoRes.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes perfil de delegado activo' });
    }
    const { entidad_id } = delegadoRes.rows[0];

    // Verificar que las horas pertenecen a una actividad de su entidad
    const check = await query(
      `SELECT h.id FROM horas_registradas h
       JOIN actividades a ON h.actividad_id = a.id
       WHERE h.id = $1 AND a.entidad_id = $2 AND h.estado = 'pendiente_delegado'`,
      [id, entidad_id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado o ya procesado' });
    }

    await query(
      `UPDATE horas_registradas SET estado = 'pendiente_entidad' WHERE id = $1`,
      [id]
    );

    res.json({ mensaje: 'Horas aprobadas. Enviadas a la entidad para validación final.' });
  } catch (error) {
    console.error('Error al aprobar horas:', error);
    res.status(500).json({ error: 'Error al aprobar horas' });
  }
};

// DELEGADO: rechazar horas
export const rechazarHorasDelegado = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const delegadoRes = await query(
      `SELECT d.id, d.entidad_id FROM delegados d WHERE d.usuario_id = $1 AND d.activo = true`,
      [req.user?.id]
    );
    if (delegadoRes.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes perfil de delegado activo' });
    }
    const { entidad_id } = delegadoRes.rows[0];

    const check = await query(
      `SELECT h.id FROM horas_registradas h
       JOIN actividades a ON h.actividad_id = a.id
       WHERE h.id = $1 AND a.entidad_id = $2 AND h.estado = 'pendiente_delegado'`,
      [id, entidad_id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado o ya procesado' });
    }

    await query(
      `UPDATE horas_registradas SET estado = 'rechazada' WHERE id = $1`,
      [id]
    );

    res.json({ mensaje: 'Horas rechazadas.' });
  } catch (error) {
    console.error('Error al rechazar horas:', error);
    res.status(500).json({ error: 'Error al rechazar horas' });
  }
};

// ENTIDAD: ver horas pendientes de validación final (aprobadas por el delegado)
export const getHorasPendientesEntidad = async (req: AuthRequest, res: Response) => {
  try {
    // Buscar la entidad (social o cultural) del usuario
    let entidadId: string | null = null;

    const socialRes = await query(
      `SELECT id FROM entidades_sociales WHERE usuario_id = $1`,
      [req.user?.id]
    );
    if (socialRes.rows.length > 0) {
      entidadId = socialRes.rows[0].id;
    } else {
      const empresaRes = await query(
        `SELECT id FROM empresas_culturales WHERE usuario_id = $1`,
        [req.user?.id]
      );
      if (empresaRes.rows.length > 0) {
        entidadId = empresaRes.rows[0].id;
      }
    }

    if (!entidadId) {
      return res.status(403).json({ error: 'No tienes perfil de entidad' });
    }

    const result = await query(
      `SELECT h.id, h.horas, h.fecha_registro, h.notas, h.estado,
              a.nombre as actividad_nombre,
              v.nombre as voluntario_nombre, v.apellidos as voluntario_apellidos, u.email as voluntario_email,
              v.id as voluntario_id
       FROM horas_registradas h
       JOIN actividades a ON h.actividad_id = a.id
       JOIN voluntarios v ON h.voluntario_id = v.id
       JOIN usuarios u ON v.usuario_id = u.id
       WHERE a.entidad_id = $1
         AND h.estado = 'pendiente_entidad'
       ORDER BY h.fecha_registro DESC`,
      [entidadId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener horas pendientes entidad:', error);
    res.status(500).json({ error: 'Error al obtener horas pendientes' });
  }
};

// ENTIDAD: validar definitivamente las horas → estado = validada
export const validarHorasEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    let entidadId: string | null = null;
    const socialRes = await query(`SELECT id FROM entidades_sociales WHERE usuario_id = $1`, [req.user?.id]);
    if (socialRes.rows.length > 0) {
      entidadId = socialRes.rows[0].id;
    } else {
      const empresaRes = await query(`SELECT id FROM empresas_culturales WHERE usuario_id = $1`, [req.user?.id]);
      if (empresaRes.rows.length > 0) entidadId = empresaRes.rows[0].id;
    }

    if (!entidadId) return res.status(403).json({ error: 'No tienes perfil de entidad' });

    const check = await query(
      `SELECT h.id FROM horas_registradas h
       JOIN actividades a ON h.actividad_id = a.id
       WHERE h.id = $1 AND a.entidad_id = $2 AND h.estado = 'pendiente_entidad'`,
      [id, entidadId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado o ya procesado' });
    }

    await query(
      `UPDATE horas_registradas SET estado = 'validada', fecha_validacion = NOW() WHERE id = $1`,
      [id]
    );

    res.json({ mensaje: '✅ Horas validadas. El voluntario ya puede verlas en su saldo disponible.' });
  } catch (error) {
    console.error('Error al validar horas entidad:', error);
    res.status(500).json({ error: 'Error al validar horas' });
  }
};

// ENTIDAD: rechazar horas (que venían del delegado)
export const rechazarHorasEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    let entidadId: string | null = null;
    const socialRes = await query(`SELECT id FROM entidades_sociales WHERE usuario_id = $1`, [req.user?.id]);
    if (socialRes.rows.length > 0) {
      entidadId = socialRes.rows[0].id;
    } else {
      const empresaRes = await query(`SELECT id FROM empresas_culturales WHERE usuario_id = $1`, [req.user?.id]);
      if (empresaRes.rows.length > 0) entidadId = empresaRes.rows[0].id;
    }

    if (!entidadId) return res.status(403).json({ error: 'No tienes perfil de entidad' });

    const check = await query(
      `SELECT h.id FROM horas_registradas h
       JOIN actividades a ON h.actividad_id = a.id
       WHERE h.id = $1 AND a.entidad_id = $2 AND h.estado = 'pendiente_entidad'`,
      [id, entidadId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado o ya procesado' });
    }

    await query(`UPDATE horas_registradas SET estado = 'rechazada' WHERE id = $1`, [id]);

    res.json({ mensaje: 'Horas rechazadas.' });
  } catch (error) {
    console.error('Error al rechazar horas entidad:', error);
    res.status(500).json({ error: 'Error al rechazar horas' });
  }
};
