import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

export const getActividades = async (req: AuthRequest, res: Response) => {
  try {
    const { municipio, entidad_id, fecha_desde, fecha_hasta } = req.query;

    let queryText = `SELECT a.*, e.nombre_legal as nombre_entidad,
      COUNT(va.voluntario_id)::int AS inscritos,
      GREATEST(a.num_voluntarios_objetivo - COUNT(va.voluntario_id)::int, 0) AS faltan
      FROM actividades a
      JOIN entidades_sociales e ON a.entidad_id = e.id
      LEFT JOIN voluntario_actividad va ON va.actividad_id = a.id
      WHERE a.publicar_buscador = true
      AND a.estado = 'publicada'`;

    const params: any[] = [];
    let paramCount = 1;

    if (municipio) {
      queryText += ` AND a.municipio = $${paramCount}`;
      params.push(municipio);
      paramCount++;
    }
    if (entidad_id) {
      queryText += ` AND a.entidad_id = $${paramCount}`;
      params.push(entidad_id);
      paramCount++;
    }
    if (fecha_desde) {
      queryText += ` AND a.fecha_inicio >= $${paramCount}`;
      params.push(fecha_desde);
      paramCount++;
    }
    if (fecha_hasta) {
      queryText += ` AND a.fecha_fin <= $${paramCount}`;
      params.push(fecha_hasta);
      paramCount++;
    }

    queryText += ' GROUP BY a.id, e.nombre_legal ORDER BY a.fecha_inicio ASC';

    const result = await query(queryText, params);
    res.json(result.rows);

  } catch (error) {
    console.error('Error al obtener actividades:', error);
    res.status(500).json({ error: 'Error al obtener actividades' });
  }
};

export const createActividad = async (req: AuthRequest, res: Response) => {
  try {
    const {
      nombre, descripcion, objetivo, municipio,
      fecha_inicio, fecha_fin, horarios,
      num_voluntarios_objetivo, publicar_buscador, responsable_id
    } = req.body;

    const entidadId = req.user?.entidad_id;
    if (!entidadId) {
      return res.status(403).json({ error: 'Solo las entidades pueden crear actividades' });
    }

    const result = await query(
      `INSERT INTO actividades (
        entidad_id, responsable_id, nombre, descripcion, objetivo, municipio,
        fecha_inicio, fecha_fin, horarios, num_voluntarios_objetivo, publicar_buscador, estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'publicada')
      RETURNING *`,
      [entidadId, responsable_id, nombre, descripcion, objetivo, municipio,
       fecha_inicio, fecha_fin, horarios, num_voluntarios_objetivo, publicar_buscador ?? true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear actividad:', error);
    res.status(500).json({ error: 'Error al crear actividad' });
  }
};

export const getActividadById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT a.*, e.nombre_legal as nombre_entidad
       FROM actividades a
       JOIN entidades_sociales e ON a.entidad_id = e.id
       WHERE a.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener actividad:', error);
    res.status(500).json({ error: 'Error al obtener actividad' });
  }
};

export const updateActividad = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const checkResult = await query('SELECT entidad_id FROM actividades WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }
    const entidadResult = await query(
      'SELECT id FROM entidades_sociales WHERE usuario_id = $1',
      [req.user?.id]
    );
    const entidad_id = entidadResult.rows[0]?.id;
    if (checkResult.rows[0].entidad_id !== entidad_id) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');

    const result = await query(
      `UPDATE actividades SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar actividad:', error);
    res.status(500).json({ error: 'Error al actualizar actividad' });
  }
};

export const deleteActividad = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const checkResult = await query('SELECT entidad_id FROM actividades WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }
    const entidadResult = await query(
  'SELECT id FROM entidades_sociales WHERE usuario_id = $1',
  [req.user?.id]
);
const entidad_id = entidadResult.rows[0]?.id;
if (checkResult.rows[0].entidad_id !== entidad_id) {
  return res.status(403).json({ error: 'No autorizado' });
}
    await query('DELETE FROM actividades WHERE id = $1', [id]);
    res.json({ mensaje: 'Actividad eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar actividad:', error);
    res.status(500).json({ error: 'Error al eliminar actividad' });
  }
};

export const getMisActividades = async (req: AuthRequest, res: Response) => {
  try {
    const voluntarioResult = await query(
      'SELECT id FROM voluntarios WHERE usuario_id = $1',
      [req.user?.id]
    );
    if (voluntarioResult.rows.length === 0) {
      return res.json([]);
    }
    const voluntarioId = voluntarioResult.rows[0].id;

    const result = await query(
      `SELECT a.id, a.nombre, a.municipio, a.fecha_inicio, a.fecha_fin
       FROM actividades a
       JOIN voluntario_actividad va ON va.actividad_id = a.id
       WHERE va.voluntario_id = $1
         AND va.estado IN ('confirmado', 'inscrito')
       ORDER BY a.fecha_inicio DESC`,
      [voluntarioId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener mis actividades:', error);
    res.status(500).json({ error: 'Error al obtener actividades' });
  }
};
