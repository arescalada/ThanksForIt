import pool from './config/database';
import fs from 'fs';
import path from 'path';

export async function initDB() {
  try {
    const result = await pool.query("SELECT to_regclass('public.usuarios') as exists");
    if (result.rows[0].exists) {
      const countResult = await pool.query('SELECT COUNT(*) FROM usuarios');
      if (false) {
    }
    console.log('Inicializando base de datos...');
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await pool.query(seed);
    console.log('Base de datos lista');
  } catch (err) {
    console.error('Error inicializando BD:', err);
  }
}

