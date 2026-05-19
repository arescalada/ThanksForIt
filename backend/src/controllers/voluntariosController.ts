import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

export const guardarPerfilVoluntario = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, apellidos, fecha_nacimiento, dni_nie, telefono, direccion } = req.body;
    const usuario_id = req.user?.id;

    const existe = await query('SELECT id FROM voluntarios WHERE usuario_id = $1', [usuario_id]);

    if (existe.rows.length > 0) {
      const result = await query(
        'UPDATE voluntarios SET nombre=$1, apellidos=$2, fecha_nacimiento=$3, dni_nie=$4, telefono=$5, direccion=$6 WHERE usuario_id=$7 RETURNING *',
        [nombre, apellidos, fecha_nacimiento, dni_nie, telefono, direccion, usuario_id]
      );
      return res.json(result.rows[0]);
    }

    const result = await query(
      'INSERT INTO voluntarios (usuario_id, nombre, apellidos, fecha_nacimiento, dni_nie, telefono, direccion) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [usuario_id, nombre, apellidos, fecha_nacimiento, dni_nie, telefono, direccion]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error perfil voluntario:', error);
    res.status(500).json({ error: 'Error al guardar perfil' });
  }
};

export const getPerfilVoluntario = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM voluntarios WHERE usuario_id = $1', [req.user?.id]);
    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

export const solicitarEntidades = async (req: AuthRequest, res: Response) => {
  try {
    const { entidad_ids } = req.body;
    const usuario_id = req.user?.id;

    if (!entidad_ids || !Array.isArray(entidad_ids) || entidad_ids.length === 0) {
      return res.status(400).json({ error: 'Debes enviar al menos una entidad' });
    }

    const volResult = await query(
      'SELECT id FROM voluntarios WHERE usuario_id = $1',
      [usuario_id]
    );

    if (volResult.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil de voluntario no encontrado' });
    }

    const voluntario_id = volResult.rows[0].id;

    for (const entidad_id of entidad_ids) {
      const entExiste = await query(
        'SELECT id FROM entidades_sociales WHERE id = $1',
        [entidad_id]
      );
      if (entExiste.rows.length === 0) continue;

      await query(
        `INSERT INTO voluntario_entidad (entidad_id, voluntario_id, estado)
         VALUES ($1, $2, 'pendiente')
         ON CONFLICT (voluntario_id, entidad_id) DO NOTHING`,
        [entidad_id, voluntario_id]
      );
    }

    res.status(201).json({ mensaje: 'Solicitudes enviadas correctamente' });
  } catch (error) {
    console.error('Error al solicitar entidades:', error);
    res.status(500).json({ error: 'Error al enviar solicitudes' });
  }
};

export const getTodosVoluntarios = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT 
         v.id,
         v.nombre,
         v.apellidos,
         v.telefono,
         v.direccion as municipio,
         v.dni_nie,
         u.email,
         u.created_at as fecha_registro
       FROM voluntarios v
       JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.nombre IS NOT NULL AND v.nombre != ''
         AND v.dni_nie NOT LIKE 'PENDIENTE-%'
       ORDER BY v.nombre ASC`,
      []
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener voluntarios:', error);
    res.status(500).json({ error: 'Error al obtener voluntarios' });
  }
};
