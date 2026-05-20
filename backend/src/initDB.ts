import pool from './config/database';
import fs from 'fs';
import path from 'path';

export async function initDB() {
  try {
    console.log('Inicializando base de datos...');
    const result = await pool.query("SELECT to_regclass('public.usuarios') as exists");
    if (result.rows[0].exists) {
      console.log('Base de datos ya inicializada, omitiendo schema.');
      return;
    }
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await pool.query(seed);
    console.log('Base de datos lista');
  } catch (err) {
    console.error('Error inicializando BD:', err);
  }
}
