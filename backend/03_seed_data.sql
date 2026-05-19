-- =====================================================
-- DATOS DE EJEMPLO (SEED DATA)
-- Plataforma de Beneficios Culturales para Voluntariado
-- =====================================================

-- NOTA: Las contraseñas están hasheadas con bcrypt
-- Contraseña de ejemplo para todos: "Test1234!"
-- Hash: $2b$10$YourHashedPasswordHere (debes reemplazar con hashes reales)

-- =====================================================
-- 1. USUARIOS BASE
-- =====================================================

-- Admin del sistema
INSERT INTO usuarios (id, email, password_hash, tipo_usuario) VALUES 
('00000000-0000-0000-0000-000000000001', 'admin@plataforma.es', '$2b$10$YourHashedPasswordHere', 'admin');

-- Usuarios de entidades sociales
INSERT INTO usuarios (id, email, password_hash, tipo_usuario) VALUES 
('11111111-1111-1111-1111-111111111111', 'contacto@cruzsevilla.org', '$2b$10$YourHashedPasswordHere', 'entidad'),
('11111111-1111-1111-1111-111111111112', 'info@bancalimentos.es', '$2b$10$YourHashedPasswordHere', 'entidad'),
('11111111-1111-1111-1111-111111111113', 'admin@voluntariadosevilla.org', '$2b$10$YourHashedPasswordHere', 'entidad');

-- Usuarios voluntarios
INSERT INTO usuarios (id, email, password_hash, tipo_usuario) VALUES 
('22222222-2222-2222-2222-222222222221', 'maria.garcia@email.com', '$2b$10$YourHashedPasswordHere', 'voluntario'),
('22222222-2222-2222-2222-222222222222', 'juan.lopez@email.com', '$2b$10$YourHashedPasswordHere', 'voluntario'),
('22222222-2222-2222-2222-222222222223', 'ana.martinez@email.com', '$2b$10$YourHashedPasswordHere', 'voluntario'),
('22222222-2222-2222-2222-222222222224', 'carlos.rodriguez@email.com', '$2b$10$YourHashedPasswordHere', 'voluntario'),
('22222222-2222-2222-2222-222222222225', 'lucia.fernandez@email.com', '$2b$10$YourHashedPasswordHere', 'voluntario');

-- Usuarios de empresas culturales
INSERT INTO usuarios (id, email, password_hash, tipo_usuario) VALUES 
('33333333-3333-3333-3333-333333333331', 'comercial@museosevilla.es', '$2b$10$YourHashedPasswordHere', 'empresa'),
('33333333-3333-3333-3333-333333333332', 'reservas@cinessur.es', '$2b$10$YourHashedPasswordHere', 'empresa'),
('33333333-3333-3333-3333-333333333333', 'contacto@teatroandalucia.es', '$2b$10$YourHashedPasswordHere', 'empresa');

-- =====================================================
-- 2. ENTIDADES SOCIALES
-- =====================================================

INSERT INTO entidades_sociales (
    id, usuario_id, nombre_legal, nif, direccion, web, 
    fecha_inscripcion, numero_registro,
    admin_nombre, admin_email, admin_telefono,
    contacto_nombre, contacto_email, contacto_telefono,
    estado
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Cruz Roja Española - Sevilla',
    'Q2866001G',
    'Calle Cruz Roja, 1, 41009 Sevilla',
    'https://www2.cruzroja.es/sevilla',
    '2010-01-15',
    'REG-2010-001',
    'María del Carmen López',
    'direccion@cruzsevilla.org',
    '+34 954 350 353',
    'Laura Pérez',
    'voluntariado@cruzsevilla.org',
    '+34 954 350 354',
    'verificada'
),
(
    '11111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111112',
    'Banco de Alimentos de Sevilla',
    'G41978844',
    'Polígono Store, Calle A, Parcela 1, 41008 Sevilla',
    'https://www.bancodealimentosdesevilla.org',
    '2012-03-20',
    'REG-2012-045',
    'Antonio Ruiz García',
    'director@bancalimentos.es',
    '+34 954 406 767',
    'Carmen Sánchez',
    'voluntarios@bancalimentos.es',
    '+34 954 406 768',
    'verificada'
),
(
    '11111111-1111-1111-1111-111111111113',
    '11111111-1111-1111-1111-111111111113',
    'Plataforma del Voluntariado de Sevilla',
    'G41365158',
    'Calle Resolana, 24, 41009 Sevilla',
    'https://www.voluntariadosevilla.org',
    '2015-06-10',
    'REG-2015-089',
    'José Manuel Torres',
    'presidencia@voluntariadosevilla.org',
    '+34 954 293 780',
    NULL,
    NULL,
    NULL,
    'verificada'
);

-- =====================================================
-- 3. VOLUNTARIOS
-- =====================================================

INSERT INTO voluntarios (
    id, usuario_id, nombre, apellidos, fecha_nacimiento, dni_nie,
    telefono, direccion, preferencias, acepta_rgpd
) VALUES 
(
    '22222222-2222-2222-2222-222222222221',
    '22222222-2222-2222-2222-222222222221',
    'María',
    'García Moreno',
    '1995-04-12',
    '12345678A',
    '+34 655 123 456',
    'Calle Betis, 45, 41010 Sevilla',
    'Interesada en actividades con personas mayores y medio ambiente',
    true
),
(
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'Juan',
    'López Ruiz',
    '1988-09-23',
    '23456789B',
    '+34 666 234 567',
    'Avenida de la Constitución, 12, 41001 Sevilla',
    'Disponible fines de semana, experiencia en logística',
    true
),
(
    '22222222-2222-2222-2222-222222222223',
    '22222222-2222-2222-2222-222222222223',
    'Ana',
    'Martínez Sánchez',
    '2000-02-15',
    '34567890C',
    '+34 677 345 678',
    'Calle San Fernando, 78, 41004 Sevilla',
    'Estudiante universitaria, interesada en educación',
    true
),
(
    '22222222-2222-2222-2222-222222222224',
    '22222222-2222-2222-2222-222222222224',
    'Carlos',
    'Rodríguez Pérez',
    '1992-11-08',
    '45678901D',
    '+34 688 456 789',
    'Calle Feria, 34, 41003 Sevilla',
    'Experiencia en cocina, disponible entre semana',
    true
),
(
    '22222222-2222-2222-2222-222222222225',
    '22222222-2222-2222-2222-222222222225',
    'Lucía',
    'Fernández Torres',
    '1985-07-30',
    '56789012E',
    '+34 699 567 890',
    'Calle Sierpes, 90, 41004 Sevilla',
    'Profesora jubilada, flexible de horario',
    true
);

-- =====================================================
-- 4. EMPRESAS CULTURALES
-- =====================================================

INSERT INTO empresas_culturales (
    id, usuario_id, nombre_empresa, cif, direccion, web,
    contacto_nombre, contacto_email, contacto_telefono,
    tipo_oferta, sistema_canje
) VALUES 
(
    '33333333-3333-3333-3333-333333333331',
    '33333333-3333-3333-3333-333333333331',
    'Museo de Bellas Artes de Sevilla',
    'Q4175001B',
    'Plaza del Museo, 9, 41001 Sevilla',
    'https://www.museodebellasartesdesevilla.es',
    'Patricia Gómez',
    'comercial@museosevilla.es',
    '+34 955 542 942',
    'Museos',
    'manual'
),
(
    '33333333-3333-3333-3333-333333333332',
    '33333333-3333-3333-3333-333333333332',
    'Cines Sur - Los Arcos',
    'B41234567',
    'Centro Comercial Los Arcos, 41020 Sevilla',
    'https://www.cinessur.com',
    'Miguel Ángel Ruiz',
    'reservas@cinessur.es',
    '+34 954 678 900',
    'Cine',
    'manual'
),
(
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'Teatro de la Maestranza',
    'A41000011',
    'Paseo de Cristóbal Colón, 22, 41001 Sevilla',
    'https://www.teatrodelamaestranza.es',
    'Isabel Moreno',
    'contacto@teatroandalucia.es',
    '+34 954 223 344',
    'Teatro',
    'api'
);

-- =====================================================
-- 5. RESPONSABLES DE ACTIVIDADES
-- =====================================================

INSERT INTO responsables (id, entidad_id, nombre, email, telefono, activo) VALUES 
('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'Laura Pérez Martín', 'laura.perez@cruzsevilla.org', '+34 954 350 355', true),
('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', 'Pedro González López', 'pedro.gonzalez@cruzsevilla.org', '+34 954 350 356', true),
('44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111112', 'Carmen Sánchez Ruiz', 'carmen@bancalimentos.es', '+34 954 406 769', true),
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111113', 'Francisco Jiménez', 'fjimenez@voluntariadosevilla.org', '+34 954 293 781', true);

-- =====================================================
-- 6. ACTIVIDADES
-- =====================================================

INSERT INTO actividades (
    id, entidad_id, responsable_id, nombre, descripcion, objetivo, municipio,
    fecha_inicio, fecha_fin, horarios, num_voluntarios_objetivo,
    publicar_buscador, version_trimestre, estado
) VALUES 
(
    '55555555-5555-5555-5555-555555555551',
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444441',
    'Acompañamiento a personas mayores',
    'Visitas semanales a residencias de ancianos para hacer compañía y actividades de ocio con los residentes',
    'Reducir la soledad y mejorar la calidad de vida de personas mayores',
    'Sevilla',
    '2025-01-15',
    '2025-03-31',
    'Lunes y miércoles de 17:00 a 19:00',
    15,
    true,
    1,
    'publicada'
),
(
    '55555555-5555-5555-5555-555555555552',
    '11111111-1111-1111-1111-111111111112',
    '44444444-4444-4444-4444-444444444443',
    'Clasificación de alimentos',
    'Ayuda en el almacén clasificando, empaquetando y preparando lotes de alimentos para familias necesitadas',
    'Apoyar la distribución eficiente de alimentos a familias en situación de vulnerabilidad',
    'Sevilla',
    '2025-01-20',
    '2025-04-10',
    'Sábados de 9:00 a 13:00',
    20,
    true,
    1,
    'publicada'
),
(
    '55555555-5555-5555-5555-555555555553',
    '11111111-1111-1111-1111-111111111113',
    '44444444-4444-4444-4444-444444444444',
    'Apoyo escolar a menores',
    'Refuerzo educativo para niños y niñas en situación de vulnerabilidad social',
    'Mejorar el rendimiento académico y reducir el abandono escolar',
    'Sevilla',
    '2025-02-01',
    '2025-04-30',
    'Martes y jueves de 18:00 a 20:00',
    10,
    true,
    1,
    'publicada'
),
(
    '55555555-5555-5555-5555-555555555554',
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444442',
    'Recogida de ropa y enseres',
    'Organización de puntos de recogida y clasificación de ropa y enseres donados',
    'Facilitar el acceso a ropa y enseres básicos a familias necesitadas',
    'Sevilla',
    '2025-02-15',
    '2025-05-15',
    'Viernes de 16:00 a 20:00 y sábados de 10:00 a 14:00',
    12,
    true,
    2,
    'publicada'
);

-- =====================================================
-- 7. INSCRIPCIONES DE VOLUNTARIOS A ACTIVIDADES
-- =====================================================

INSERT INTO voluntario_actividad (voluntario_id, actividad_id, estado) VALUES 
('22222222-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555551', 'confirmado'),
('22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555552', 'confirmado'),
('22222222-2222-2222-2222-222222222223', '55555555-5555-5555-5555-555555555553', 'confirmado'),
('22222222-2222-2222-2222-222222222224', '55555555-5555-5555-5555-555555555552', 'confirmado'),
('22222222-2222-2222-2222-222222222225', '55555555-5555-5555-5555-555555555551', 'confirmado'),
('22222222-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555554', 'inscrito');

-- =====================================================
-- 8. ASOCIACIONES VOLUNTARIO-ENTIDAD
-- =====================================================

INSERT INTO voluntario_entidad (voluntario_id, entidad_id, activo) VALUES 
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', true),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111112', true),
('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111113', true),
('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111112', true),
('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111', true);

-- =====================================================
-- 9. HORAS REGISTRADAS
-- =====================================================

-- María García - 45 horas validadas
INSERT INTO horas_registradas (
    voluntario_id, actividad_id, responsable_id, horas, 
    fecha_registro, estado, notas
) VALUES 
('22222222-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 4, '2025-01-20', 'validada', 'Excelente participación'),
('22222222-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 4, '2025-01-27', 'validada', NULL),
('22222222-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 4, '2025-02-03', 'validada', NULL),
('22222222-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 4, '2025-02-10', 'validada', NULL),
('22222222-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555554', '44444444-4444-4444-4444-444444444442', 8, '2025-02-21', 'validada', 'Gran ayuda en la clasificación'),
('22222222-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555554', '44444444-4444-4444-4444-444444444442', 8, '2025-02-28', 'validada', NULL),
('22222222-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 4, '2025-03-03', 'validada', NULL),
('22222222-2222-2222-2222-222222222221', '55555555-5555-5555-5555-555555555554', '44444444-4444-4444-4444-444444444442', 9, '2025-03-07', 'validada', NULL);

-- Juan López - 32 horas validadas
INSERT INTO horas_registradas (
    voluntario_id, actividad_id, responsable_id, horas, 
    fecha_registro, estado
) VALUES 
('22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444443', 4, '2025-01-25', 'validada'),
('22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444443', 4, '2025-02-01', 'validada'),
('22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444443', 4, '2025-02-08', 'validada'),
('22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444443', 4, '2025-02-15', 'validada'),
('22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444443', 4, '2025-02-22', 'validada'),
('22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444443', 4, '2025-03-01', 'validada'),
('22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444443', 4, '2025-03-08', 'validada'),
('22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444443', 4, '2025-03-15', 'validada');

-- Ana Martínez - 24 horas validadas
INSERT INTO horas_registradas (
    voluntario_id, actividad_id, responsable_id, horas, 
    fecha_registro, estado
) VALUES 
('22222222-2222-2222-2222-222222222223', '55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444444', 4, '2025-02-04', 'validada'),
('22222222-2222-2222-2222-222222222223', '55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444444', 4, '2025-02-06', 'validada'),
('22222222-2222-2222-2222-222222222223', '55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444444', 4, '2025-02-11', 'validada'),
('22222222-2222-2222-2222-222222222223', '55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444444', 4, '2025-02-13', 'validada'),
('22222222-2222-2222-2222-222222222223', '55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444444', 4, '2025-02-18', 'validada'),
('22222222-2222-2222-2222-222222222223', '55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444444', 4, '2025-02-20', 'validada');

-- Carlos Rodríguez - 16 horas validadas
INSERT INTO horas_registradas (
    voluntario_id, actividad_id, responsable_id, horas, 
    fecha_registro, estado
) VALUES 
('22222222-2222-2222-2222-222222222224', '55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444443', 4, '2025-02-01', 'validada'),
('22222222-2222-2222-2222-222222222224', '55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444443', 4, '2025-02-08', 'validada'),
('22222222-2222-2222-2222-222222222224', '55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444443', 4, '2025-02-15', 'validada'),
('22222222-2222-2222-2222-222222222224', '55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444443', 4, '2025-02-22', 'validada');

-- Lucía Fernández - 28 horas validadas
INSERT INTO horas_registradas (
    voluntario_id, actividad_id, responsable_id, horas, 
    fecha_registro, estado
) VALUES 
('22222222-2222-2222-2222-222222222225', '55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 4, '2025-01-22', 'validada'),
('22222222-2222-2222-2222-222222222225', '55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 4, '2025-01-29', 'validada'),
('22222222-2222-2222-2222-222222222225', '55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 4, '2025-02-05', 'validada'),
('22222222-2222-2222-2222-222222222225', '55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 4, '2025-02-12', 'validada'),
('22222222-2222-2222-2222-222222222225', '55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 4, '2025-02-19', 'validada'),
('22222222-2222-2222-2222-222222222225', '55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 4, '2025-02-26', 'validada'),
('22222222-2222-2222-2222-222222222225', '55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 4, '2025-03-05', 'validada');

-- =====================================================
-- 10. BENEFICIOS CULTURALES
-- =====================================================

INSERT INTO beneficios (
    id, empresa_id, nombre, descripcion, coste_horas, categoria, activo, stock
) VALUES 
-- Museo
(
    '66666666-6666-6666-6666-666666666661',
    '33333333-3333-3333-3333-333333333331',
    'Entrada gratuita al museo',
    'Entrada individual válida para visitar todas las exposiciones permanentes y temporales',
    5,
    'Museos',
    true,
    NULL
),
(
    '66666666-6666-6666-6666-666666666662',
    '33333333-3333-3333-3333-333333333331',
    'Visita guiada privada',
    'Tour guiado privado por las salas principales del museo con experto en arte',
    15,
    'Museos',
    true,
    50
),
-- Cine
(
    '66666666-6666-6666-6666-666666666663',
    '33333333-3333-3333-3333-333333333332',
    'Entrada de cine estándar',
    'Una entrada para cualquier sesión entre semana (excepto festivos)',
    8,
    'Cine',
    true,
    NULL
),
(
    '66666666-6666-6666-6666-666666666664',
    '33333333-3333-3333-3333-333333333332',
    'Entrada de cine + palomitas',
    'Entrada + palomitas medianas + refresco mediano',
    12,
    'Cine',
    true,
    NULL
),
(
    '66666666-6666-6666-6666-666666666665',
    '33333333-3333-3333-3333-333333333332',
    'Entrada Premium (butaca VIP)',
    'Entrada en butaca VIP con espacio extra y reclinación completa',
    18,
    'Cine',
    true,
    100
),
-- Teatro
(
    '66666666-6666-6666-6666-666666666666',
    '33333333-3333-3333-3333-333333333333',
    'Entrada zona anfiteatro',
    'Entrada para zona anfiteatro en funciones de temporada regular',
    20,
    'Teatro',
    true,
    NULL
),
(
    '66666666-6666-6666-6666-666666666667',
    '33333333-3333-3333-3333-333333333333',
    'Entrada platea lateral',
    'Entrada platea lateral para funciones de temporada',
    30,
    'Teatro',
    true,
    NULL
);

-- =====================================================
-- 11. CANJES REALIZADOS
-- =====================================================

-- María ha canjeado 2 beneficios (20 horas consumidas, le quedan 25)
INSERT INTO canjes_realizados (
    voluntario_id, beneficio_id, codigo_canje, horas_consumidas,
    fecha_generacion, fecha_expiracion, fecha_canje, estado
) VALUES 
(
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666663',
    'TBC-1234-AB',
    8,
    '2025-02-15 10:30:00',
    '2025-03-17 23:59:59',
    '2025-02-18 19:45:00',
    'canjeado'
),
(
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666664',
    'TBC-5678-CD',
    12,
    '2025-03-01 14:20:00',
    '2025-03-31 23:59:59',
    '2025-03-05 20:15:00',
    'canjeado'
);

-- Juan ha canjeado 1 beneficio (8 horas consumidas, le quedan 24)
INSERT INTO canjes_realizados (
    voluntario_id, beneficio_id, codigo_canje, horas_consumidas,
    fecha_generacion, fecha_expiracion, fecha_canje, estado
) VALUES 
(
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666663',
    'TBC-9012-EF',
    8,
    '2025-02-20 11:15:00',
    '2025-03-22 23:59:59',
    '2025-02-22 18:30:00',
    'canjeado'
);

-- Ana tiene un canje generado pero no usado todavía
INSERT INTO canjes_realizados (
    voluntario_id, beneficio_id, codigo_canje, horas_consumidas,
    fecha_generacion, fecha_expiracion, estado
) VALUES 
(
    '22222222-2222-2222-2222-222222222223',
    '66666666-6666-6666-6666-666666666661',
    'TBC-3456-GH',
    5,
    '2025-03-10 16:40:00',
    '2025-04-09 23:59:59',
    'generado'
);

-- Carlos ha canjeado 1 entrada de museo (5 horas, le quedan 11)
INSERT INTO canjes_realizados (
    voluntario_id, beneficio_id, codigo_canje, horas_consumidas,
    fecha_generacion, fecha_expiracion, fecha_canje, estado
) VALUES 
(
    '22222222-2222-2222-2222-222222222224',
    '66666666-6666-6666-6666-666666666661',
    'TBC-7890-IJ',
    5,
    '2025-02-25 09:30:00',
    '2025-03-27 23:59:59',
    '2025-02-28 11:00:00',
    'canjeado'
);

-- Lucía no ha canjeado nada todavía (tiene 28 horas disponibles)

-- =====================================================
-- VERIFICACIÓN DE DATOS
-- =====================================================

-- Consulta para verificar horas disponibles por voluntario
SELECT 
    v.nombre || ' ' || v.apellidos AS voluntario,
    hd.horas_validadas,
    hd.horas_consumidas,
    hd.horas_disponibles
FROM v_horas_disponibles hd
JOIN voluntarios v ON hd.voluntario_id = v.id
ORDER BY v.nombre;

-- Consulta para ver beneficios disponibles para cada voluntario
SELECT 
    v.nombre || ' ' || v.apellidos AS voluntario,
    COUNT(CASE WHEN bd.puede_canjear THEN 1 END) AS beneficios_disponibles,
    COUNT(*) AS total_beneficios
FROM voluntarios v
CROSS JOIN (SELECT DISTINCT beneficio_id FROM v_beneficios_disponibles) AS bd_list
LEFT JOIN v_beneficios_disponibles bd ON v.id = bd.voluntario_id AND bd_list.beneficio_id = bd.beneficio_id
GROUP BY v.id, v.nombre, v.apellidos
ORDER BY v.nombre;
