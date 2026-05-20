import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

// ── Perfil entidad ──────────────────────────────────────────────────────────

export const getPerfilEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const usuario_id = req.user?.id;
    const result = await query('SELECT * FROM entidades_sociales WHERE usuario_id = $1', [usuario_id]);
    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obtener perfil entidad:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

export const guardarPerfilEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre_legal, nif, direccion, web, admin_nombre, admin_email, admin_telefono } = req.body;
    const usuario_id = req.user?.id;

    const existe = await query('SELECT id FROM entidades_sociales WHERE usuario_id = $1', [usuario_id]);

    if (existe.rows.length > 0) {
      const result = await query(
        'UPDATE entidades_sociales SET nombre_legal=$1, nif=$2, direccion=$3, web=$4, admin_nombre=$5, admin_email=$6, admin_telefono=$7 WHERE usuario_id=$8 RETURNING *',
        [nombre_legal, nif, direccion, web, admin_nombre, admin_email, admin_telefono, usuario_id]
      );
      return res.json(result.rows[0]);
    }

    const result = await query(
      'INSERT INTO entidades_sociales (usuario_id, nombre_legal, nif, direccion, web, admin_nombre, admin_email, admin_telefono) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [usuario_id, nombre_legal, nif, direccion, web, admin_nombre, admin_email, admin_telefono]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error perfil entidad:', error);
    res.status(500).json({ error: 'Error al guardar perfil entidad' });
  }
};

// ── Actividades ─────────────────────────────────────────────────────────────

export const getMisActividades = async (req: AuthRequest, res: Response) => {
  try {
    const entidadResult = await query('SELECT id FROM entidades_sociales WHERE usuario_id = $1', [req.user?.id]);
    if (entidadResult.rows.length === 0) return res.json([]);

    const result = await query(
      `SELECT a.*,
         COALESCE(d.nombre, '') as delegado_nombre,
         COALESCE(d.cargo, '') as delegado_cargo,
         (SELECT COUNT(*) FROM voluntario_actividad va 
          WHERE va.actividad_id = a.id 
          AND va.estado IN ('confirmado', 'inscrito', 'pendiente')) as total_inscritos,
         (SELECT COUNT(*) FROM voluntario_actividad va 
          WHERE va.actividad_id = a.id 
          AND va.estado = 'confirmado') as total_confirmados
       FROM actividades a
       LEFT JOIN delegados d ON a.delegado_id = d.id
       WHERE a.entidad_id = $1
       ORDER BY a.created_at DESC`,
      [entidadResult.rows[0].id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    res.status(500).json({ error: 'Error al obtener actividades' });
  }
};

export const crearActividad = async (req: AuthRequest, res: Response) => {
  try {
    const entidadResult = await query('SELECT id FROM entidades_sociales WHERE usuario_id = $1', [req.user?.id]);
    if (entidadResult.rows.length === 0) return res.status(403).json({ error: 'No tienes perfil de entidad' });

    const entidad_id = entidadResult.rows[0].id;
    const { nombre, descripcion, objetivo, municipio, fecha_inicio, fecha_fin, horarios, num_voluntarios_objetivo, publicar_buscador } = req.body;

    const responsableResult = await query(
      'SELECT id FROM responsables WHERE entidad_id = $1 LIMIT 1',
      [entidad_id]
    );

    let responsable_id;
    if (responsableResult.rows.length > 0) {
      responsable_id = responsableResult.rows[0].id;
    } else {
      const nuevoResp = await query(
        'INSERT INTO responsables (entidad_id, nombre, email, telefono) VALUES ($1,$2,$3,$4) RETURNING id',
        [entidad_id, 'Responsable', req.user?.email || '', '000000000']
      );
      responsable_id = nuevoResp.rows[0].id;
    }

    const result = await query(
      `INSERT INTO actividades (entidad_id, responsable_id, nombre, descripcion, objetivo, municipio, fecha_inicio, fecha_fin, horarios, num_voluntarios_objetivo, publicar_buscador, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'publicada') RETURNING *`,
      [entidad_id, responsable_id, nombre, descripcion, objetivo, municipio, fecha_inicio, fecha_fin, horarios, num_voluntarios_objetivo, publicar_buscador ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear actividad:', error);
    res.status(500).json({ error: 'Error al crear actividad' });
  }
};

// ── Listado público de entidades (para el registro de voluntarios) ───────────

export const getEntidadesPublicas = async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT e.id, e.nombre_legal, e.direccion, e.web
       FROM entidades_sociales e
       ORDER BY e.nombre_legal ASC`,
      []
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener entidades públicas:', error);
    res.status(500).json({ error: 'Error al obtener entidades' });
  }
};

// ── Solicitudes de voluntarios hacia esta entidad ───────────────────────────

export const getSolicitudesVoluntarios = async (req: AuthRequest, res: Response) => {
  try {
    const entidadResult = await query(
      'SELECT id FROM entidades_sociales WHERE usuario_id = $1',
      [req.user?.id]
    );
    if (entidadResult.rows.length === 0) return res.json([]);

    const entidad_id = entidadResult.rows[0].id;

    const result = await query(
      `SELECT
         v.id,
         v.usuario_id,
         v.nombre,
         v.apellidos,
         v.telefono,
         v.direccion as municipio,
         v.dni_nie,
         v.fecha_nacimiento,
         v.preferencias,
         u.email,
         u.created_at as fecha_registro,
         va.estado as vinculacion,
         a.nombre as actividad_nombre
       FROM voluntario_actividad va
       JOIN actividades a ON va.actividad_id = a.id
       JOIN voluntarios v ON va.voluntario_id = v.id
       JOIN usuarios u ON v.usuario_id = u.id
       WHERE a.entidad_id = $1
       ORDER BY va.fecha_inscripcion DESC`,
      [entidad_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes de voluntarios' });
  }
};

// ── Todos los voluntarios de la plataforma con su estado respecto a esta entidad ──

export const getTodosVoluntarios = async (req: AuthRequest, res: Response) => {
  try {
    const entidadResult = await query(
      'SELECT id FROM entidades_sociales WHERE usuario_id = $1',
      [req.user?.id]
    );
    if (entidadResult.rows.length === 0) return res.json([]);

    const entidad_id = entidadResult.rows[0].id;

    const result = await query(
      `SELECT 
         v.id,
         v.usuario_id,
         v.nombre,
         v.apellidos,
         v.telefono,
         v.direccion as municipio,
         v.dni_nie,
         v.fecha_nacimiento,
         v.preferencias,
         u.email,
         u.created_at as fecha_registro,
         COALESCE(ve.estado, 'no_vinculado') as vinculacion
       FROM voluntarios v
       JOIN usuarios u ON v.usuario_id = u.id
       LEFT JOIN voluntario_entidad ve 
         ON ve.voluntario_id = v.id AND ve.entidad_id = $1
       ORDER BY LOWER(unaccent(COALESCE(NULLIF(v.nombre, ''), u.email))) ASC`,
      [entidad_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener voluntarios:', error);
    res.status(500).json({ error: 'Error al obtener voluntarios' });
  }
};

// ── Actividades de un voluntario en las actividades de esta entidad ──────────

export const getActividadesVoluntario = async (req: AuthRequest, res: Response) => {
  try {
    const { voluntarioId } = req.params;

    const entidadResult = await query(
      'SELECT id FROM entidades_sociales WHERE usuario_id = $1',
      [req.user?.id]
    );
    if (entidadResult.rows.length === 0) return res.json([]);

    const entidad_id = entidadResult.rows[0].id;

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
    console.error('Error al obtener actividades del voluntario:', error);
    res.status(500).json({ error: 'Error al obtener actividades del voluntario' });
  }
};

// ── Gestionar vinculación: aceptar / rechazar / vincular / desvincular ───────

export const gestionarVoluntario = async (req: AuthRequest, res: Response) => {
  try {
    const { voluntarioId, accion } = req.params;

    const entidadResult = await query(
      'SELECT id FROM entidades_sociales WHERE usuario_id = $1',
      [req.user?.id]
    );
    if (entidadResult.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes perfil de entidad' });
    }
    const entidad_id = entidadResult.rows[0].id;

    const volResult = await query('SELECT id FROM voluntarios WHERE id = $1', [voluntarioId]);
    if (volResult.rows.length === 0) {
      return res.status(404).json({ error: 'Voluntario no encontrado' });
    }

    const vinculos = await query(
      'SELECT id, estado FROM voluntario_entidad WHERE entidad_id = $1 AND voluntario_id = $2',
      [entidad_id, voluntarioId]
    );
    const vinculo = vinculos.rows[0];

    if (accion === 'aceptar') {
      if (!vinculo || vinculo.estado !== 'pendiente') {
        return res.status(400).json({ error: 'No hay solicitud pendiente de este voluntario' });
      }
      await query(
        'UPDATE voluntario_entidad SET estado = $1, updated_at = NOW() WHERE entidad_id = $2 AND voluntario_id = $3',
        ['aceptado', entidad_id, voluntarioId]
      );
      return res.json({ mensaje: 'Voluntario aceptado correctamente' });
    }

    if (accion === 'rechazar') {
      if (!vinculo || vinculo.estado !== 'pendiente') {
        return res.status(400).json({ error: 'No hay solicitud pendiente de este voluntario' });
      }
      await query(
        'DELETE FROM voluntario_entidad WHERE entidad_id = $1 AND voluntario_id = $2',
        [entidad_id, voluntarioId]
      );
      return res.json({ mensaje: 'Solicitud rechazada' });
    }

    if (accion === 'vincular') {
      if (vinculo) {
        await query(
          'UPDATE voluntario_entidad SET estado = $1, updated_at = NOW() WHERE entidad_id = $2 AND voluntario_id = $3',
          ['aceptado', entidad_id, voluntarioId]
        );
      } else {
        await query(
          'INSERT INTO voluntario_entidad (entidad_id, voluntario_id, estado) VALUES ($1, $2, $3)',
          [entidad_id, voluntarioId, 'aceptado']
        );
      }
      return res.json({ mensaje: 'Voluntario añadido a la entidad' });
    }

    if (accion === 'desvincular') {
      await query(
        'DELETE FROM voluntario_entidad WHERE entidad_id = $1 AND voluntario_id = $2',
        [entidad_id, voluntarioId]
      );
      return res.json({ mensaje: 'Voluntario desvinculado' });
    }

    return res.status(400).json({ error: 'Acción no válida' });

  } catch (error) {
    console.error('Error al gestionar voluntario:', error);
    res.status(500).json({ error: 'Error al gestionar voluntario' });
  }
};
export const getDelegadosParaActividad = async (req: AuthRequest, res: Response) => {
  try {
    const entidadResult = await query(
      'SELECT id FROM entidades_sociales WHERE usuario_id = $1',
      [req.user?.id]
    );
    if (entidadResult.rows.length === 0) return res.json([]);
    const entidad_id = entidadResult.rows[0].id;
    const result = await query(
      `SELECT d.id, d.nombre, d.cargo, u.email
       FROM delegados d
       JOIN usuarios u ON d.usuario_id = u.id
       WHERE d.entidad_id = $1 AND d.activo = true
       ORDER BY d.nombre ASC`,
      [entidad_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener delegados' });
  }
};
