const bcrypt = require('bcryptjs');
const { Client } = require('pg');

bcrypt.hash('password123', 10).then(async hash => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'plataforma_voluntariado',
    user: 'postgres',
    password: 'mi_password_123'
  });
  await client.connect();

  const usuarios = [
    ['voluntario1@voluntario.com', 'voluntario'],
    ['voluntario2@voluntario.com', 'voluntario'],
    ['voluntario3@voluntario.com', 'voluntario'],
    ['voluntario4@voluntario.com', 'voluntario'],
    ['voluntario5@voluntario.com', 'voluntario'],
    ['entidadsocial1@entidadsocial.com', 'entidad'],
    ['entidadsocial2@entidadsocial.com', 'entidad'],
    ['entidadsocial3@entidadsocial.com', 'entidad'],
    ['entidadsocial4@entidadsocial.com', 'entidad'],
    ['entidadsocial5@entidadsocial.com', 'entidad'],
    ['entidadcultural1@entidadcultural.com', 'empresa'],
    ['entidadcultural2@entidadcultural.com', 'empresa'],
    ['entidadcultural3@entidadcultural.com', 'empresa'],
    ['entidadcultural4@entidadcultural.com', 'empresa'],
    ['entidadcultural5@entidadcultural.com', 'empresa']
  ];

  for (const [email, tipo] of usuarios) {
    await client.query(
      'INSERT INTO usuarios (email, password_hash, tipo_usuario) VALUES ($1, $2, $3)',
      [email, hash, tipo]
    );
    console.log('Creado:', email);
  }

  await client.end();
  console.log('DONE');
});
