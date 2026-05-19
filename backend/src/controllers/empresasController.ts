import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

export const getPerfilEmpresa = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM empresas_culturales WHERE usuario_id = $1',
      [req.user?.id]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error al obtener perfil empresa:', error);
    res.status(500).json({ error: 'Error al obtener perfil empresa' });
  }
};

export const guardarPerfilEmpresa = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre_empresa, cif, direccion, web, contacto_nombre, contacto_email, contacto_telefono, tipo_oferta } = req.body;
    const usuario_id = req.user?.id;

    const existe = await query('SELECT id FROM empresas_culturales WHERE usuario_id = $1', [usuario_id]);

    if (existe.rows.length > 0) {
      const result = await query(
        'UPDATE empresas_culturales SET nombre_empresa=$1, cif=$2, direccion=$3, web=$4, contacto_nombre=$5, contacto_email=$6, contacto_telefono=$7, tipo_oferta=$8 WHERE usuario_id=$9 RETURNING *',
        [nombre_empresa, cif, direccion, web, contacto_nombre, contacto_email, contacto_telefono, tipo_oferta, usuario_id]
      );
      return res.json(result.rows[0]);
    }

    const result = await query(
      'INSERT INTO empresas_culturales (usuario_id, nombre_empresa, cif, direccion, web, contacto_nombre, contacto_email, contacto_telefono, tipo_oferta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [usuario_id, nombre_empresa, cif, direccion, web, contacto_nombre, contacto_email, contacto_telefono, tipo_oferta]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error perfil empresa:', error);
    res.status(500).json({ error: 'Error al guardar perfil empresa' });
  }
};

export const getMisBeneficios = async (req: AuthRequest, res: Response) => {
  try {
    const empresaResult = await query('SELECT id FROM empresas_culturales WHERE usuario_id = $1', [req.user?.id]);
    if (empresaResult.rows.length === 0) return res.json([]);

    const result = await query(
      'SELECT * FROM beneficios WHERE empresa_id = $1 ORDER BY created_at DESC',
      [empresaResult.rows[0].id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener beneficios:', error);
    res.status(500).json({ error: 'Error al obtener beneficios' });
  }
};

export const crearBeneficio = async (req: AuthRequest, res: Response) => {
  try {
    const empresaResult = await query('SELECT id FROM empresas_culturales WHERE usuario_id = $1', [req.user?.id]);
    if (empresaResult.rows.length === 0) return res.status(403).json({ error: 'No tienes perfil de empresa' });

    const empresa_id = empresaResult.rows[0].id;
    const { nombre, descripcion, coste_horas, stock_disponible } = req.body;

    const result = await query(
      `INSERT INTO beneficios (empresa_id, nombre, descripcion, coste_horas, stock, activo)
       VALUES ($1,$2,$3,$4,$5,true) RETURNING *`,
      [empresa_id, nombre, descripcion, coste_horas, stock_disponible || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear beneficio:', error);
    res.status(500).json({ error: 'Error al crear beneficio' });
  }
};
