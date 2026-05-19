import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

export const getEstadisticas = async (req: AuthRequest, res: Response) => {
  try {
    const totalVoluntarios = await query(`SELECT COUNT(*) FROM usuarios WHERE tipo_usuario = 'voluntario'`);
    const totalEntidades = await query(`SELECT COUNT(*) FROM usuarios WHERE tipo_usuario = 'entidad'`);
    const totalEmpresas = await query(`SELECT COUNT(*) FROM usuarios WHERE tipo_usuario = 'empresa'`);
    const totalHorasValidadas = await query(`SELECT COALESCE(SUM(horas), 0) as total FROM horas_registradas WHERE estado = 'validada'`);
    const totalHorasPendientes = await query(`SELECT COALESCE(SUM(horas), 0) as total FROM horas_registradas WHERE estado = 'pendiente'`);
    const totalCanjes = await query(`SELECT COUNT(*) FROM canjes_realizados`);
    const totalActividades = await query(`SELECT COUNT(*) FROM actividades WHERE estado = 'publicada'`);
    const totalBeneficios = await query(`SELECT COUNT(*) FROM beneficios WHERE activo = true`);

    res.json({
      voluntarios: parseInt(totalVoluntarios.rows[0].count),
      entidades: parseInt(totalEntidades.rows[0].count),
      empresas: parseInt(totalEmpresas.rows[0].count),
      horas_validadas: parseFloat(totalHorasValidadas.rows[0].total),
      horas_pendientes: parseFloat(totalHorasPendientes.rows[0].total),
      canjes: parseInt(totalCanjes.rows[0].count),
      actividades: parseInt(totalActividades.rows[0].count),
      beneficios: parseInt(totalBeneficios.rows[0].count)
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

export const getUsuarios = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, email, tipo_usuario, created_at FROM usuarios ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

export const getHorasPendientes = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT h.*, 
              v.nombre as voluntario_nombre, v.apellidos as voluntario_apellidos,
              u.email as voluntario_email,
              a.nombre as actividad_nombre, a.municipio
       FROM horas_registradas h
       JOIN voluntarios v ON h.voluntario_id = v.id
       JOIN usuarios u ON v.usuario_id = u.id
       JOIN actividades a ON h.actividad_id = a.id
       WHERE h.estado = 'pendiente'
       ORDER BY h.created_at ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener horas pendientes:', error);
    res.status(500).json({ error: 'Error al obtener horas pendientes' });
  }
};

export const validarHoras = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE horas_registradas SET estado = 'validada', fecha_validacion = NOW()
       WHERE id = $1 AND estado = 'pendiente' RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado o ya procesado' });
    }
    res.json({ mensaje: 'Horas validadas correctamente', horas: result.rows[0] });
  } catch (error) {
    console.error('Error al validar horas:', error);
    res.status(500).json({ error: 'Error al validar horas' });
  }
};

export const rechazarHoras = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE horas_registradas SET estado = 'rechazada'
       WHERE id = $1 AND estado = 'pendiente' RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado o ya procesado' });
    }
    res.json({ mensaje: 'Horas rechazadas', horas: result.rows[0] });
  } catch (error) {
    console.error('Error al rechazar horas:', error);
    res.status(500).json({ error: 'Error al rechazar horas' });
  }
};
