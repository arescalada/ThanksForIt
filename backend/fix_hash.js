const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');

bcrypt.hash('password123', 10).then(h => {
  const cmd = `docker exec -i plataforma_voluntariado_postgres psql -U postgres -d voluntariado -c "UPDATE usuarios SET password_hash = '${h}' WHERE tipo_usuario = 'entidad';"`;
  console.log('Ejecutando:', cmd);
  execSync(cmd, { stdio: 'inherit' });
  console.log('Hecho!');
});
