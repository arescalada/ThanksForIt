import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

export const getBeneficios = async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.query;

    let queryText = `
      SELECT b.*, e.nombre_empresa
      FROM beneficios b
      JOIN empresas_culturales e ON b.empresa_id = e.id
      WHERE b.activo = true
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (empresa_id) {
      queryText += ` AND b.empresa_id = $${paramCount}`;
      params.push(empresa_id);
      paramCount++;
    }

    queryText += ' ORDER BY b.coste_horas ASC';

    const result = await query(queryText, params);
    res.json(result.rows);

  } catch (error) {
    console.error('Error al obtener beneficios:', error);
    res.status(500).json({ error: 'Error al obtener beneficios' });
  }
};

export const createBeneficio = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, descripcion, coste_horas, categoria, condiciones, stock } = req.body;

    const empresaResult = await query(
      'SELECT id FROM empresas_culturales WHERE usuario_id = $1',
      [req.user?.id]
    );

    if (empresaResult.rows.length === 0) {
      return res.status(403).json({ error: 'Solo las empresas culturales pueden crear beneficios' });
    }

    const empresaId = empresaResult.rows[0].id;

    const result = await query(
      `INSERT INTO beneficios (empresa_id, nombre, descripcion, coste_horas, categoria, condiciones, stock, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [empresaId, nombre, descripcion, coste_horas, categoria, condiciones, stock]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error al crear beneficio:', error);
    res.status(500).json({ error: 'Error al crear beneficio' });
  }
};

export const generarCanje = async (req: AuthRequest, res: Response) => {
  try {
    const { beneficio_id } = req.body;

    const voluntarioResult = await query(
      'SELECT id FROM voluntarios WHERE usuario_id = $1',
      [req.user?.id]
    );

    if (voluntarioResult.rows.length === 0) {
      return res.status(403).json({ error: 'Solo los voluntarios pueden generar canjes' });
    }

    const voluntarioId = voluntarioResult.rows[0].id;

    // Obtener el beneficio
    const beneficio = await query(
      'SELECT * FROM beneficios WHERE id = $1 AND activo = true',
      [beneficio_id]
    );

    if (beneficio.rows.length === 0) {
      return res.status(404).json({ error: 'Beneficio no encontrado' });
    }

    const costeHoras = beneficio.rows[0].coste_horas;

    // Calcular horas disponibles del voluntario
    const horasResult = await query(
      `SELECT COALESCE(SUM(horas), 0) as total_horas
       FROM horas_registradas
       WHERE voluntario_id = $1 AND estado = 'validada'`,
      [voluntarioId]
    );

    const horasCanjeadasResult = await query(
      `SELECT COALESCE(SUM(horas_consumidas), 0) as total_canjeado
       FROM canjes_realizados
       WHERE voluntario_id = $1 AND estado != 'cancelado'`,
      [voluntarioId]
    );

    const horasDisponibles =
      parseFloat(horasResult.rows[0].total_horas) -
      parseFloat(horasCanjeadasResult.rows[0].total_canjeado);

    if (horasDisponibles < costeHoras) {
      return res.status(400).json({
        error: `No tienes suficientes horas. Necesitas ${costeHoras}h, tienes ${horasDisponibles.toFixed(1)}h disponibles`
      });
    }

    // Generar código único
    const codigo = 'CANJE-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const fechaExpiracion = new Date();
    fechaExpiracion.setFullYear(fechaExpiracion.getFullYear() + 1);

    const result = await query(
      `INSERT INTO canjes_realizados (voluntario_id, beneficio_id, codigo_canje, horas_consumidas, fecha_expiracion, estado)
       VALUES ($1, $2, $3, $4, $5, 'generado')
       RETURNING *`,
      [voluntarioId, beneficio_id, codigo, costeHoras, fechaExpiracion]
    );

    res.status(201).json({
      ...result.rows[0],
      beneficio_nombre: beneficio.rows[0].nombre
    });

  } catch (error) {
    console.error('Error al generar canje:', error);
    res.status(500).json({ error: 'Error al generar canje' });
  }
};

export const validarCanje = async (req: AuthRequest, res: Response) => {
  try {
    const { codigo } = req.body;

    const result = await query(
      `SELECT c.*, b.nombre as beneficio_nombre, v.nombre as voluntario_nombre
       FROM canjes_realizados c
       JOIN beneficios b ON c.beneficio_id = b.id
       JOIN voluntarios v ON c.voluntario_id = v.id
       WHERE c.codigo_canje = $1
       AND c.estado = 'generado'
       AND c.fecha_expiracion > NOW()`,
      [codigo]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ valido: false, error: 'Código no encontrado o expirado' });
    }

    res.json({ valido: true, canje: result.rows[0] });

  } catch (error) {
    console.error('Error al validar canje:', error);
    res.status(500).json({ error: 'Error al validar código de canje' });
  }
};

export const marcarCanjeUtilizado = async (req: AuthRequest, res: Response) => {
  try {
    const { codigo } = req.body;

    const result = await query(
      `UPDATE canjes_realizados
       SET estado = 'canjeado', fecha_canje = NOW()
       WHERE codigo_canje = $1 AND estado = 'generado'
       RETURNING *`,
      [codigo]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No se pudo marcar el canje como utilizado' });
    }

    res.json({ mensaje: 'Canje utilizado exitosamente' });

  } catch (error) {
    console.error('Error al marcar canje:', error);
    res.status(500).json({ error: 'Error al procesar el canje' });
  }
};

export const getMisCanjes = async (req: AuthRequest, res: Response) => {
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
      `SELECT c.*, b.nombre as beneficio_nombre, b.descripcion as beneficio_descripcion,
              e.nombre_empresa
       FROM canjes_realizados c
       JOIN beneficios b ON c.beneficio_id = b.id
       JOIN empresas_culturales e ON b.empresa_id = e.id
       WHERE c.voluntario_id = $1
       ORDER BY c.fecha_generacion DESC`,
      [voluntarioId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Error al obtener canjes:', error);
    res.status(500).json({ error: 'Error al obtener historial de canjes' });
  }
};
