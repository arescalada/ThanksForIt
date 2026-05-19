-- ============================================================
-- USUARIOS DE PRUEBA - Contraseña para todos: password123
-- ============================================================

-- ── VOLUNTARIOS ──────────────────────────────────────────────
INSERT INTO usuarios (email, password_hash, tipo_usuario) VALUES
('voluntario@voluntario.com',  '$2b$10$QdRBc6HvQ1RJsmBlqOkqq.BCDOcT28AeJyFRJW8ADPiEcF/5JhQta', 'voluntario'),
('voluntario1@voluntario.com', '$2b$10$p916tUmLmIbW0DLPMSS/VuhZFZ9odjMGv/O32ScUTTHrOyrfZ.b7q', 'voluntario'),
('voluntario2@voluntario.com', '$2b$10$FEvpFd7RXXaTIb8WCMhZuOF7d1MhqoSEpQDqhIJFTCObOf383d8ha', 'voluntario'),
('voluntario3@voluntario.com', '$2b$10$Yd9fozR9k/0Ib4R0WJnJ8ezvR2LGYRchQZFLJOH9ax78DJeqaIU0C', 'voluntario'),
('voluntario4@voluntario.com', '$2b$10$Zfj8XiEsFnXTQZqu2vVefOS3qGq9kYmgyx6VTLEHU2NS1PoVEcEKO', 'voluntario')
ON CONFLICT (email) DO NOTHING;

INSERT INTO voluntarios (usuario_id, nombre, apellidos, fecha_nacimiento, dni_nie, telefono, direccion)
SELECT u.id, v.nombre, v.apellidos, v.fecha_nac::date, v.dni, v.telefono, v.municipio
FROM usuarios u
JOIN (VALUES
  ('voluntario@voluntario.com',  'Laura',  'García López',     '1995-03-12', '11111111A', '600111001', 'Madrid'),
  ('voluntario1@voluntario.com', 'Carlos', 'Martínez Ruiz',    '1990-07-25', '22222222B', '600111002', 'Collado Villalba'),
  ('voluntario2@voluntario.com', 'Sofía',  'Fernández Torres', '1998-11-08', '33333333C', '600111003', 'Majadahonda'),
  ('voluntario3@voluntario.com', 'Miguel', 'López Sánchez',    '1993-05-30', '44444444D', '600111004', 'Las Rozas'),
  ('voluntario4@voluntario.com', 'Elena',  'Pérez Moreno',     '2000-01-17', '55555555E', '600111005', 'Pozuelo')
) AS v(email, nombre, apellidos, fecha_nac, dni, telefono, municipio)
ON u.email = v.email
ON CONFLICT (usuario_id) DO NOTHING;

-- ── ENTIDADES SOCIALES ────────────────────────────────────────
INSERT INTO usuarios (email, password_hash, tipo_usuario) VALUES
('entidadsocial@entidadsocial.com',  '$2b$10$Jx/sEXoJgAVjoJhOs/m.x.RnnzBCFmed0BlTMTLurApfZ3wYefHJe', 'entidad'),
('entidadsocial1@entidadsocial.com', '$2b$10$n3IOldcXEFYXWB8tRDzwfe.xys1m1I2k4WxKfCSBl71kPfyI8DAMG', 'entidad'),
('entidadsocial2@entidadsocial.com', '$2b$10$YaFTf37FLTNFI4bpwzFOmulnCMuFoJY92UM/RNxRnX5.SAGcTmdRO', 'entidad'),
('entidadsocial3@entidadsocial.com', '$2b$10$QrOdVWfn8Kha64YEFs216eBGsqKsoLHWi4Jwg4NjToc9dWkYT8.U2', 'entidad'),
('entidadsocial4@entidadsocial.com', '$2b$10$.qwrGFkqtH2u4kJFrn8ZfeBpoWJhjnGE6sRpCMt6Q8U9eafbKVfvq', 'entidad')
ON CONFLICT (email) DO NOTHING;

INSERT INTO entidades_sociales (usuario_id, nombre_legal, nif, direccion, web, admin_nombre, admin_email, admin_telefono)
SELECT u.id, e.nombre, e.nif, e.direccion, e.web, e.admin_nombre, e.admin_email, e.admin_tel
FROM usuarios u
JOIN (VALUES
  ('entidadsocial@entidadsocial.com',  'Cruz Roja Madrid',           'G28000001', 'Calle Mayor 1, Madrid',          'www.cruzroja.es',      'Ana Directora', 'entidadsocial@entidadsocial.com',  '910000001'),
  ('entidadsocial1@entidadsocial.com', 'Cáritas Diocesana',          'G28000002', 'Calle Iglesia 5, Majadahonda',   'www.caritas.es',       'Pedro Gestor',  'entidadsocial1@entidadsocial.com', '910000002'),
  ('entidadsocial2@entidadsocial.com', 'Banco de Alimentos Madrid',  'G28000003', 'Av. Industria 3, Las Rozas',     'www.bancoalimentos.es','Rosa Coord',    'entidadsocial2@entidadsocial.com', '910000003'),
  ('entidadsocial3@entidadsocial.com', 'Asociación Verde Esperanza', 'G28000004', 'Calle Pino 7, Collado Villalba', 'www.verdeesperanza.es','Luis Admin',    'entidadsocial3@entidadsocial.com', '910000004'),
  ('entidadsocial4@entidadsocial.com', 'Fundación Manos Unidas',     'G28000005', 'Plaza Sol 2, Pozuelo',           'www.manosunidas.es',   'Marta Resp',    'entidadsocial4@entidadsocial.com', '910000005')
) AS e(email, nombre, nif, direccion, web, admin_nombre, admin_email, admin_tel)
ON u.email = e.email
ON CONFLICT (usuario_id) DO NOTHING;

-- ── EMPRESAS CULTURALES ───────────────────────────────────────
INSERT INTO usuarios (email, password_hash, tipo_usuario) VALUES
('empresacultural@empresacultural.com',  '$2b$10$os/7fz1zauj8cWMJ2YooGOrpWqD/co6bLu.VUHoplM2MZ6ml1HYP.', 'empresa'),
('empresacultural1@empresacultural.com', '$2b$10$alg0pbkUAwtiAaRoQ1XDu.JUGd84KRLblH9Qy9/Y8i64K/RVPWUBu', 'empresa'),
('empresacultural2@empresacultural.com', '$2b$10$nbX6KgUkWD1k5Fe2RbRzc.lVeJeoWdo/7DlWSR0nL9OJ/dYqgBX1q', 'empresa'),
('empresacultural3@empresacultural.com', '$2b$10$zE44ZzveQmDPp08CfYN2geJ2.561cKwehEfAy2qXsyqBN6SuqYm9e', 'empresa'),
('empresacultural4@empresacultural.com', '$2b$10$GcBeEbdqb998dNH2dc1IReiSpbUde7HrCQbRZXNmeTix6dnOQiBG.', 'empresa')
ON CONFLICT (email) DO NOTHING;

INSERT INTO empresas_culturales (usuario_id, nombre_empresa, cif, direccion, web, contacto_nombre, contacto_email, contacto_telefono, tipo_oferta)
SELECT u.id, e.nombre, e.cif, e.direccion, e.web, e.contacto, e.email_c, e.tel, e.tipo
FROM usuarios u
JOIN (VALUES
  ('empresacultural@empresacultural.com',  'Teatro Real Madrid',  'B28100001', 'Plaza Isabel II, Madrid',          'www.teatroreal.es',    'Javier Taquilla', 'empresacultural@empresacultural.com',  '910100001', 'teatro'),
  ('empresacultural1@empresacultural.com', 'Museo del Prado',     'B28100002', 'Paseo del Prado, Madrid',          'www.museodelprado.es', 'Inés Cultura',    'empresacultural1@empresacultural.com', '910100002', 'museo'),
  ('empresacultural2@empresacultural.com', 'Cine Palafox',        'B28100003', 'Calle Luchana 15, Madrid',         'www.cinepalafox.com',  'Tomás Pantalla',  'empresacultural2@empresacultural.com', '910100003', 'cine'),
  ('empresacultural3@empresacultural.com', 'Sala Caracol Música', 'B28100004', 'Calle Bernardino Obregón, Madrid', 'www.salacaracol.es',   'Eva Conciertos',  'empresacultural3@empresacultural.com', '910100004', 'musica'),
  ('empresacultural4@empresacultural.com', 'Librería La Central', 'B28100005', 'Calle Postigo San Martín, Madrid', 'www.lacentral.com',    'Noa Libros',      'empresacultural4@empresacultural.com', '910100005', 'libreria')
) AS e(email, nombre, cif, direccion, web, contacto, email_c, tel, tipo)
ON u.email = e.email
ON CONFLICT (usuario_id) DO NOTHING;
