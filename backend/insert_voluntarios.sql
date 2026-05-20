INSERT INTO voluntarios (usuario_id, nombre, apellidos, dni_nie, telefono, municipio)
SELECT id, 'Voluntario', 'Prueba ' || ROW_NUMBER() OVER (), '12345678A', '600000000', 'Madrid'
FROM usuarios WHERE tipo_usuario = 'voluntario';
