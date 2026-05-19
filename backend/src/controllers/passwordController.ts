import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../config/database';
import { enviarEmailRecuperacion } from '../services/emailService';

export const solicitarRecuperacion = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    const result = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.json({ mensaje: 'Si el email existe, recibiras un enlace en breve' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 3600000);
    await query(
      'UPDATE usuarios SET reset_token = $1, reset_token_expira = $2 WHERE email = $3',
      [token, expira, email]
    );
    try {
      await enviarEmailRecuperacion(email, token);
    } catch (emailError) {
      console.error('Error al enviar email:', emailError);
      return res.status(500).json({ error: 'Error al enviar el email. Verifica la configuracion SMTP.' });
    }
    res.json({ mensaje: 'Si el email existe, recibiras un enlace en breve' });
  } catch (error) {
    console.error('Error recuperacion:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

export const resetearPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token y contrasena requeridos' });
    if (password.length < 6) return res.status(400).json({ error: 'Minimo 6 caracteres' });
    const result = await query(
      'SELECT id FROM usuarios WHERE reset_token = $1 AND reset_token_expira > NOW()',
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Token invalido o expirado' });
    }
    const hash = await bcrypt.hash(password, 10);
    await query(
      'UPDATE usuarios SET password_hash = $1, reset_token = NULL, reset_token_expira = NULL WHERE reset_token = $2',
      [hash, token]
    );
    res.json({ mensaje: 'Contrasena actualizada correctamente' });
  } catch (error) {
    console.error('Error reset password:', error);
    res.status(500).json({ error: 'Error al resetear contrasena' });
  }
};
