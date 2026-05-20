-- =====================================================
-- PLATAFORMA DE BENEFICIOS CULTURALES PARA VOLUNTARIADO
-- Base de datos PostgreSQL
-- =====================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsquedas de texto

-- =====================================================
-- TIPOS ENUM
-- =====================================================

CREATE TYPE tipo_usuario_enum AS ENUM ('voluntario', 'entidad', 'empresa', 'admin');
CREATE TYPE estado_entidad_enum AS ENUM ('pendiente', 'verificada', 'rechazada');
CREATE TYPE sistema_canje_enum AS ENUM ('manual', 'api', 'plugin', 'middleware');
CREATE TYPE estado_actividad_enum AS ENUM ('borrador', 'publicada', 'cerrada');
CREATE TYPE estado_inscripcion_enum AS ENUM ('inscrito', 'confirmado', 'completado', 'cancelado');
CREATE TYPE estado_horas_enum AS ENUM ('pendiente', 'validada', 'rechazada');
CREATE TYPE estado_canje_enum AS ENUM ('generado', 'canjeado', 'expirado', 'cancelado');

-- =====================================================
-- TABLA: USUARIOS (base para todos los tipos de usuario)
-- =====================================================

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    tipo_usuario tipo_usuario_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo_usuario);

-- =====================================================
-- TABLA: VOLUNTARIOS
-- =====================================================

CREATE TABLE voluntarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    dni_nie VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    preferencias TEXT, -- JSON o texto libre
    acepta_rgpd BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_edad CHECK (fecha_nacimiento <= CURRENT_DATE - INTERVAL '16 years')
);

CREATE INDEX idx_voluntarios_usuario ON voluntarios(usuario_id);
CREATE INDEX idx_voluntarios_dni ON voluntarios(dni_nie);

-- =====================================================
-- TABLA: ENTIDADES SOCIALES
-- =====================================================

CREATE TABLE entidades_sociales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_legal VARCHAR(255) NOT NULL,
    nif VARCHAR(20) UNIQUE NOT NULL,
    direccion TEXT NOT NULL,
    web VARCHAR(255),
    fecha_inscripcion DATE,
    numero_registro VARCHAR(100),
    
    -- Persona administradora
    admin_nombre VARCHAR(200) NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    admin_telefono VARCHAR(20) NOT NULL,
    
    -- Persona de contacto (opcional)
    contacto_nombre VARCHAR(200),
    contacto_email VARCHAR(255),
    contacto_telefono VARCHAR(20),
    
    documentacion_url TEXT, -- URLs de documentos (JSON array)
    estado estado_entidad_enum DEFAULT 'pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entidades_usuario ON entidades_sociales(usuario_id);
CREATE INDEX idx_entidades_nif ON entidades_sociales(nif);
CREATE INDEX idx_entidades_estado ON entidades_sociales(estado);

-- =====================================================
-- TABLA: EMPRESAS CULTURALES
-- =====================================================

CREATE TABLE empresas_culturales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_empresa VARCHAR(255) NOT NULL,
    cif VARCHAR(20) UNIQUE NOT NULL,
    direccion TEXT NOT NULL,
    web VARCHAR(255),
    
    -- Persona de contacto
    contacto_nombre VARCHAR(200) NOT NULL,
    contacto_email VARCHAR(255) NOT NULL,
    contacto_telefono VARCHAR(20) NOT NULL,
    
    tipo_oferta VARCHAR(100), -- ej: "Museos", "Teatros", "Cine"
    sistema_canje sistema_canje_enum DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_empresas_usuario ON empresas_culturales(usuario_id);
CREATE INDEX idx_empresas_cif ON empresas_culturales(cif);

-- =====================================================
-- TABLA: RESPONSABLES (de actividades)
-- =====================================================

CREATE TABLE responsables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entidad_id UUID NOT NULL REFERENCES entidades_sociales(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_responsables_entidad ON responsables(entidad_id);

-- =====================================================
-- TABLA: ACTIVIDADES
-- =====================================================

CREATE TABLE actividades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entidad_id UUID NOT NULL REFERENCES entidades_sociales(id) ON DELETE CASCADE,
    responsable_id UUID NOT NULL REFERENCES responsables(id),
    
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    objetivo TEXT,
    municipio VARCHAR(100) NOT NULL,
    
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    horarios TEXT, -- Texto libre o JSON
    
    num_voluntarios_objetivo INTEGER,
    publicar_buscador BOOLEAN DEFAULT true,
    
    -- Duplicación y versionado
    actividad_base_id UUID REFERENCES actividades(id), -- NULL si no es duplicada
    version_trimestre INTEGER, -- 1, 2, 3, 4
    
    estado estado_actividad_enum DEFAULT 'borrador',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT chk_duracion CHECK (fecha_fin <= fecha_inicio + INTERVAL '3 months')
);

CREATE INDEX idx_actividades_entidad ON actividades(entidad_id);
CREATE INDEX idx_actividades_municipio ON actividades(municipio);
CREATE INDEX idx_actividades_estado ON actividades(estado);
CREATE INDEX idx_actividades_fechas ON actividades(fecha_inicio, fecha_fin);
CREATE INDEX idx_actividades_publicar ON actividades(publicar_buscador) WHERE publicar_buscador = true;

-- Índice para búsqueda de texto en nombre y descripción
CREATE INDEX idx_actividades_texto ON actividades USING gin(to_tsvector('spanish', nombre || ' ' || descripcion));

-- =====================================================
-- TABLA: VOLUNTARIO_ACTIVIDAD (inscripciones)
-- =====================================================

CREATE TABLE voluntario_actividad (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voluntario_id UUID NOT NULL REFERENCES voluntarios(id) ON DELETE CASCADE,
    actividad_id UUID NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
    fecha_inscripcion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estado estado_inscripcion_enum DEFAULT 'inscrito',
    
    UNIQUE(voluntario_id, actividad_id)
);

CREATE INDEX idx_vol_act_voluntario ON voluntario_actividad(voluntario_id);
CREATE INDEX idx_vol_act_actividad ON voluntario_actividad(actividad_id);

-- =====================================================
-- TABLA: VOLUNTARIO_ENTIDAD (asociación voluntario-entidad)
-- =====================================================

CREATE TABLE voluntario_entidad (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voluntario_id UUID NOT NULL REFERENCES voluntarios(id) ON DELETE CASCADE,
    entidad_id UUID NOT NULL REFERENCES entidades_sociales(id) ON DELETE CASCADE,
    fecha_asociacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT true,
    
    UNIQUE(voluntario_id, entidad_id)
);

CREATE INDEX idx_vol_ent_voluntario ON voluntario_entidad(voluntario_id);
CREATE INDEX idx_vol_ent_entidad ON voluntario_entidad(entidad_id);

-- =====================================================
-- TABLA: HORAS_REGISTRADAS
-- =====================================================

CREATE TABLE horas_registradas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voluntario_id UUID NOT NULL REFERENCES voluntarios(id) ON DELETE CASCADE,
    actividad_id UUID NOT NULL REFERENCES actividades(id),
    responsable_id UUID REFERENCES responsables(id), -- Quien validó
    
    horas DECIMAL(6,2) NOT NULL CHECK (horas > 0 AND horas <= 24),
    fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    notas TEXT,
    
    estado estado_horas_enum DEFAULT 'pendiente',
    fecha_validacion TIMESTAMP WITH TIME ZONE,
    
    -- Para cálculo trimestral
    trimestre INTEGER NOT NULL, -- 1, 2, 3, 4
    anio INTEGER NOT NULL,
    
    -- Caducidad (1 año desde validación)
    fecha_caducidad DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_horas_voluntario ON horas_registradas(voluntario_id);
CREATE INDEX idx_horas_actividad ON horas_registradas(actividad_id);
CREATE INDEX idx_horas_estado ON horas_registradas(estado);
CREATE INDEX idx_horas_trimestre ON horas_registradas(anio, trimestre);
CREATE INDEX idx_horas_caducidad ON horas_registradas(fecha_caducidad) WHERE estado = 'validada';

-- =====================================================
-- TABLA: BENEFICIOS
-- =====================================================

CREATE TABLE beneficios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas_culturales(id) ON DELETE CASCADE,
    
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    coste_horas DECIMAL(6,2) NOT NULL CHECK (coste_horas > 0),
    categoria VARCHAR(100), -- ej: "Cine", "Teatro", "Museos"
    condiciones TEXT,
    
    activo BOOLEAN DEFAULT true,
    stock INTEGER, -- NULL = ilimitado
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_beneficios_empresa ON beneficios(empresa_id);
CREATE INDEX idx_beneficios_activo ON beneficios(activo) WHERE activo = true;
CREATE INDEX idx_beneficios_categoria ON beneficios(categoria);
CREATE INDEX idx_beneficios_coste ON beneficios(coste_horas);

-- =====================================================
-- TABLA: CANJES_REALIZADOS
-- =====================================================

CREATE TABLE canjes_realizados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voluntario_id UUID NOT NULL REFERENCES voluntarios(id) ON DELETE CASCADE,
    beneficio_id UUID NOT NULL REFERENCES beneficios(id),
    
    codigo_canje VARCHAR(50) UNIQUE NOT NULL,
    horas_consumidas DECIMAL(6,2) NOT NULL,
    
    fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_canje TIMESTAMP WITH TIME ZONE, -- NULL si no se ha usado
    
    estado estado_canje_enum DEFAULT 'generado',
    notas TEXT
);

CREATE INDEX idx_canjes_voluntario ON canjes_realizados(voluntario_id);
CREATE INDEX idx_canjes_beneficio ON canjes_realizados(beneficio_id);
CREATE INDEX idx_canjes_codigo ON canjes_realizados(codigo_canje);
CREATE INDEX idx_canjes_estado ON canjes_realizados(estado);

-- =====================================================
-- TRIGGERS Y FUNCIONES
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular trimestre y año automáticamente
CREATE OR REPLACE FUNCTION set_trimestre_anio()
RETURNS TRIGGER AS $$
BEGIN
    NEW.anio = EXTRACT(YEAR FROM NEW.fecha_registro);
    NEW.trimestre = CEIL(EXTRACT(MONTH FROM NEW.fecha_registro) / 3.0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_trimestre_before_insert
    BEFORE INSERT ON horas_registradas
    FOR EACH ROW
    EXECUTE FUNCTION set_trimestre_anio();

-- Función para establecer fecha de caducidad al validar horas
CREATE OR REPLACE FUNCTION set_fecha_caducidad()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'validada' AND (OLD.estado IS NULL OR OLD.estado != 'validada') THEN
        NEW.fecha_validacion = CURRENT_TIMESTAMP;
        NEW.fecha_caducidad = CURRENT_DATE + INTERVAL '1 year';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_caducidad_on_validacion
    BEFORE UPDATE ON horas_registradas
    FOR EACH ROW
    EXECUTE FUNCTION set_fecha_caducidad();

-- Función para generar código de canje único
CREATE OR REPLACE FUNCTION generar_codigo_canje()
RETURNS VARCHAR(50) AS $$
DECLARE
    codigo VARCHAR(50);
BEGIN
    -- Formato: TBC-XXXX-YY (donde XXXX = número aleatorio, YY = hash corto)
    LOOP
        codigo := 'TBC-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') || '-' || 
                  UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 2));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM canjes_realizados WHERE codigo_canje = codigo);
    END LOOP;
    RETURN codigo;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista: Horas disponibles por voluntario
CREATE OR REPLACE VIEW v_horas_disponibles AS
SELECT 
    v.id AS voluntario_id,
    v.nombre,
    v.apellidos,
    COALESCE(SUM(CASE 
        WHEN h.estado = 'validada' AND h.fecha_caducidad > CURRENT_DATE 
        THEN h.horas 
        ELSE 0 
    END), 0) AS horas_validadas,
    COALESCE(SUM(CASE 
        WHEN c.estado = 'canjeado' 
        THEN c.horas_consumidas 
        ELSE 0 
    END), 0) AS horas_consumidas,
    COALESCE(SUM(CASE 
        WHEN h.estado = 'validada' AND h.fecha_caducidad > CURRENT_DATE 
        THEN h.horas 
        ELSE 0 
    END), 0) - COALESCE(SUM(CASE 
        WHEN c.estado = 'canjeado' 
        THEN c.horas_consumidas 
        ELSE 0 
    END), 0) AS horas_disponibles
FROM voluntarios v
LEFT JOIN horas_registradas h ON v.id = h.voluntario_id
LEFT JOIN canjes_realizados c ON v.id = c.voluntario_id
GROUP BY v.id, v.nombre, v.apellidos;

-- Vista: Beneficios disponibles para voluntario
CREATE OR REPLACE VIEW v_beneficios_disponibles AS
SELECT 
    b.id AS beneficio_id,
    b.nombre,
    b.descripcion,
    b.coste_horas,
    b.categoria,
    e.nombre_empresa,
    v.voluntario_id,
    v.horas_disponibles,
    CASE 
        WHEN v.horas_disponibles >= b.coste_horas THEN true
        ELSE false
    END AS puede_canjear
FROM beneficios b
JOIN empresas_culturales e ON b.empresa_id = e.id
CROSS JOIN v_horas_disponibles v
WHERE b.activo = true
  AND (b.stock IS NULL OR b.stock > 0);

-- Vista: Resumen de actividades por entidad
CREATE OR REPLACE VIEW v_resumen_actividades AS
SELECT 
    e.id AS entidad_id,
    e.nombre_legal,
    COUNT(DISTINCT a.id) AS total_actividades,
    COUNT(DISTINCT CASE WHEN a.estado = 'publicada' THEN a.id END) AS actividades_activas,
    COUNT(DISTINCT va.voluntario_id) AS total_voluntarios_inscritos
FROM entidades_sociales e
LEFT JOIN actividades a ON e.id = a.entidad_id
LEFT JOIN voluntario_actividad va ON a.id = va.actividad_id
GROUP BY e.id, e.nombre_legal;

-- =====================================================
-- DATOS DE EJEMPLO (SEED)
-- =====================================================

-- Admin por defecto (contraseña: Admin123! - debe cambiarse)
INSERT INTO usuarios (email, password_hash, tipo_usuario) VALUES 
('admin@plataforma.es', '$2b$10$YourHashedPasswordHere', 'admin');

-- =====================================================
-- COMENTARIOS EN TABLAS
-- =====================================================

COMMENT ON TABLE usuarios IS 'Tabla base para autenticación de todos los usuarios del sistema';
COMMENT ON TABLE voluntarios IS 'Datos personales de voluntarios';
COMMENT ON TABLE entidades_sociales IS 'ONGs, fundaciones y asociaciones que publican actividades';
COMMENT ON TABLE empresas_culturales IS 'Empresas que ofrecen beneficios culturales';
COMMENT ON TABLE actividades IS 'Actividades de voluntariado publicadas por entidades';
COMMENT ON TABLE horas_registradas IS 'Registro de horas de voluntariado realizadas';
COMMENT ON TABLE beneficios IS 'Catálogo de beneficios culturales ofrecidos';
COMMENT ON TABLE canjes_realizados IS 'Historial de canjes de horas por beneficios';

COMMENT ON COLUMN horas_registradas.fecha_caducidad IS 'Las horas caducan 1 año después de su validación';
COMMENT ON COLUMN beneficios.stock IS 'NULL significa stock ilimitado';
COMMENT ON COLUMN canjes_realizados.codigo_canje IS 'Código único generado para validar el canje (ej: TBC-4821-KQ)';
