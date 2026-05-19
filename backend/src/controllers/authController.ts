import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    const result = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const usuario = result.rows[0];
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const secret = process.env.JWT_SECRET || 'secreto_por_defecto';
    const token = (jwt as any).sign(
      { id: usuario.id, email: usuario.email, tipo_usuario: usuario.tipo_usuario },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({
      token,
      usuario: { id: usuario.id, email: usuario.email, tipo_usuario: usuario.tipo_usuario }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, tipo_usuario } = req.body;
    if (!email || !password || !tipo_usuario) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    const existeUsuario = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existeUsuario.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO usuarios (email, password_hash, tipo_usuario)
       VALUES ($1, $2, $3)
       RETURNING id, email, tipo_usuario`,
      [email, passwordHash, tipo_usuario]
    );
    const nuevoUsuario = result.rows[0];
    const secret = process.env.JWT_SECRET || 'secreto_por_defecto';
    const token = (jwt as any).sign(
      { id: nuevoUsuario.id, email: nuevoUsuario.email, tipo_usuario: nuevoUsuario.tipo_usuario },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      token,
      usuario: nuevoUsuario
    });
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await query(
      `SELECT id, email, tipo_usuario, created_at FROM usuarios WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};
