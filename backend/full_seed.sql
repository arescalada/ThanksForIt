DELETE FROM voluntario_entidad; DELETE FROM voluntario_actividad; DELETE FROM horas_registradas; DELETE FROM canjes_realizados; DELETE FROM mensajes; DELETE FROM actividades; DELETE FROM delegados; DELETE FROM voluntarios; DELETE FROM entidades_sociales; DELETE FROM empresas_culturales; DELETE FROM usuarios;

INSERT INTO usuarios (id, email, password_hash, tipo_usuario) VALUES
('a0000001-0000-0000-0000-000000000001', 'voluntario@voluntario.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'voluntario'),
('a0000001-0000-0000-0000-000000000002', 'voluntario1@voluntario.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'voluntario'),
('a0000001-0000-0000-0000-000000000003', 'voluntario2@voluntario.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'voluntario'),
('a0000001-0000-0000-0000-000000000004', 'voluntario3@voluntario.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'voluntario'),
('a0000001-0000-0000-0000-000000000005', 'voluntario4@voluntario.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'voluntario'),
('b0000001-0000-0000-0000-000000000001', 'entidadsocial@entidadsocial.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'entidad'),
('b0000001-0000-0000-0000-000000000002', 'entidadsocial1@entidadsocial.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'entidad'),
('b0000001-0000-0000-0000-000000000003', 'entidadsocial2@entidadsocial.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'entidad'),
('b0000001-0000-0000-0000-000000000004', 'entidadsocial3@entidadsocial.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'entidad'),
('b0000001-0000-0000-0000-000000000005', 'entidadsocial4@entidadsocial.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'entidad'),
('c0000001-0000-0000-0000-000000000001', 'empresacultural@empresacultural.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'empresa'),
('c0000001-0000-0000-0000-000000000002', 'empresacultural1@empresacultural.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'empresa'),
('c0000001-0000-0000-0000-000000000003', 'empresacultural2@empresacultural.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'empresa'),
('c0000001-0000-0000-0000-000000000004', 'empresacultural3@empresacultural.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'empresa'),
('c0000001-0000-0000-0000-000000000005', 'empresacultural4@empresacultural.com', '\\\/wyXSLySSnus7Fg/eB.hFq0XPuL9WUHbG3RAG4IdK2', 'empresa');

INSERT INTO voluntarios (usuario_id, nombre, apellidos, fecha_nacimiento, dni_nie, telefono, acepta_rgpd) VALUES
('a0000001-0000-0000-0000-000000000001', 'Ana', 'García López', '1990-03-15', '11111111A', '600111111', true),
('a0000001-0000-0000-0000-000000000002', 'Carlos', 'Martínez Ruiz', '1988-07-22', '22222222B', '600222222', true),
('a0000001-0000-0000-0000-000000000003', 'Lucía', 'Fernández Gil', '1995-11-08', '33333333C', '600333333', true),
('a0000001-0000-0000-0000-000000000004', 'Pedro', 'Sánchez Mora', '1992-04-30', '44444444D', '600444444', true),
('a0000001-0000-0000-0000-000000000005', 'Marta', 'López Torres', '1997-09-12', '55555555E', '600555555', true);

INSERT INTO entidades_sociales (usuario_id, nombre, nif, direccion, municipio, telefono, descripcion, estado) VALUES
('b0000001-0000-0000-0000-000000000001', 'Cruz Roja Madrid', 'G11111111', 'Calle Mayor 1', 'Madrid', '910111111', 'Entidad de ayuda social', 'verificada'),
('b0000001-0000-0000-0000-000000000002', 'Cáritas España', 'G22222222', 'Calle Sol 2', 'Madrid', '910222222', 'Entidad de ayuda social', 'verificada'),
('b0000001-0000-0000-0000-000000000003', 'Banco de Alimentos', 'G33333333', 'Calle Luna 3', 'Madrid', '910333333', 'Banco de alimentos', 'verificada'),
('b0000001-0000-0000-0000-000000000004', 'ONCE', 'G44444444', 'Calle Pez 4', 'Madrid', '910444444', 'Organización de ciegos', 'verificada'),
('b0000001-0000-0000-0000-000000000005', 'Médicos Sin Fronteras', 'G55555555', 'Calle Mar 5', 'Madrid', '910555555', 'ONG médica', 'verificada');

INSERT INTO empresas_culturales (usuario_id, nombre, cif, direccion, municipio, telefono, descripcion, sistema_canje) VALUES
('c0000001-0000-0000-0000-000000000001', 'Teatro Real', 'A11111111', 'Plaza de Isabel II', 'Madrid', '915111111', 'Teatro de ópera', 'manual'),
('c0000001-0000-0000-0000-000000000002', 'Museo del Prado', 'A22222222', 'Paseo del Prado', 'Madrid', '915222222', 'Museo de arte', 'manual'),
('c0000001-0000-0000-0000-000000000003', 'Cine Callao', 'A33333333', 'Plaza del Callao', 'Madrid', '915333333', 'Cine histórico', 'manual'),
('c0000001-0000-0000-0000-000000000004', 'Festival Jazz', 'A44444444', 'Calle Jazz 4', 'Madrid', '915444444', 'Festival de jazz', 'manual'),
('c0000001-0000-0000-0000-000000000005', 'Sala Riviera', 'A55555555', 'Paseo Bajo', 'Madrid', '915555555', 'Sala de conciertos', 'manual');
