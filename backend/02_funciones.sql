-- =====================================================
-- FUNCIONES DE LÓGICA DE NEGOCIO
-- Plataforma de Beneficios Culturales para Voluntariado
-- =====================================================

-- =====================================================
-- 1. GESTIÓN DE HORAS DE VOLUNTARIADO
-- =====================================================

-- Función: Calcular horas disponibles para un voluntario
CREATE OR REPLACE FUNCTION calcular_horas_disponibles(p_voluntario_id UUID)
RETURNS TABLE (
    horas_validadas DECIMAL(10,2),
    horas_consumidas DECIMAL(10,2),
    horas_disponibles DECIMAL(10,2),
    horas_caducadas DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE 
            WHEN h.estado = 'validada' AND h.fecha_caducidad > CURRENT_DATE 
            THEN h.horas ELSE 0 
        END), 0)::DECIMAL(10,2) AS horas_validadas,
        
        COALESCE(SUM(CASE 
            WHEN c.estado = 'canjeado' 
            THEN c.horas_consumidas ELSE 0 
        END), 0)::DECIMAL(10,2) AS horas_consumidas,
        
        (COALESCE(SUM(CASE 
            WHEN h.estado = 'validada' AND h.fecha_caducidad > CURRENT_DATE 
            THEN h.horas ELSE 0 
        END), 0) - COALESCE(SUM(CASE 
            WHEN c.estado = 'canjeado' 
            THEN c.horas_consumidas ELSE 0 
        END), 0))::DECIMAL(10,2) AS horas_disponibles,
        
        COALESCE(SUM(CASE 
            WHEN h.estado = 'validada' AND h.fecha_caducidad <= CURRENT_DATE 
            THEN h.horas ELSE 0 
        END), 0)::DECIMAL(10,2) AS horas_caducadas
        
    FROM voluntarios v
    LEFT JOIN horas_registradas h ON v.id = h.voluntario_id
    LEFT JOIN canjes_realizados c ON v.id = c.voluntario_id
    WHERE v.id = p_voluntario_id
    GROUP BY v.id;
END;
$$ LANGUAGE plpgsql;

-- Función: Validar horas registradas
CREATE OR REPLACE FUNCTION validar_horas(
    p_hora_id UUID,
    p_responsable_id UUID,
    p_aprobar BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
DECLARE
    v_nuevo_estado estado_horas_enum;
BEGIN
    -- Determinar nuevo estado
    v_nuevo_estado := CASE WHEN p_aprobar THEN 'validada'::estado_horas_enum ELSE 'rechazada'::estado_horas_enum END;
    
    -- Actualizar el registro
    UPDATE horas_registradas
    SET 
        estado = v_nuevo_estado,
        responsable_id = p_responsable_id,
        fecha_validacion = CURRENT_TIMESTAMP,
        fecha_caducidad = CASE 
            WHEN p_aprobar THEN CURRENT_DATE + INTERVAL '1 year' 
            ELSE NULL 
        END
    WHERE id = p_hora_id
      AND estado = 'pendiente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Función: Marcar horas caducadas automáticamente
CREATE OR REPLACE FUNCTION marcar_horas_caducadas()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE canjes_realizados
        SET estado = 'expirado'
        WHERE estado = 'generado'
          AND fecha_expiracion < CURRENT_TIMESTAMP
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM updated;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. GESTIÓN DE CANJES
-- =====================================================

-- Función: Generar un canje
CREATE OR REPLACE FUNCTION generar_canje(
    p_voluntario_id UUID,
    p_beneficio_id UUID,
    p_dias_validez INTEGER DEFAULT 30
)
RETURNS TABLE (
    canje_id UUID,
    codigo_canje VARCHAR(50),
    mensaje TEXT
) AS $$
DECLARE
    v_horas_disponibles DECIMAL(10,2);
    v_coste_beneficio DECIMAL(10,2);
    v_canje_id UUID;
    v_codigo VARCHAR(50);
    v_stock INTEGER;
BEGIN
    -- Verificar stock del beneficio
    SELECT stock INTO v_stock
    FROM beneficios
    WHERE id = p_beneficio_id AND activo = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR(50), 'Beneficio no encontrado o inactivo'::TEXT;
        RETURN;
    END IF;
    
    IF v_stock IS NOT NULL AND v_stock <= 0 THEN
        RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR(50), 'Beneficio sin stock disponible'::TEXT;
        RETURN;
    END IF;
    
    -- Obtener horas disponibles
    SELECT horas_disponibles 
    INTO v_horas_disponibles
    FROM calcular_horas_disponibles(p_voluntario_id);
    
    -- Obtener coste del beneficio
    SELECT coste_horas INTO v_coste_beneficio
    FROM beneficios
    WHERE id = p_beneficio_id;
    
    -- Verificar que tiene suficientes horas
    IF v_horas_disponibles < v_coste_beneficio THEN
        RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR(50), 
            FORMAT('Horas insuficientes. Disponible: %s, Necesario: %s', 
                   v_horas_disponibles, v_coste_beneficio)::TEXT;
        RETURN;
    END IF;
    
    -- Generar código único
    v_codigo := generar_codigo_canje();
    
    -- Crear el canje
    INSERT INTO canjes_realizados (
        voluntario_id,
        beneficio_id,
        codigo_canje,
        horas_consumidas,
        fecha_generacion,
        fecha_expiracion,
        estado
    ) VALUES (
        p_voluntario_id,
        p_beneficio_id,
        v_codigo,
        v_coste_beneficio,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + (p_dias_validez || ' days')::INTERVAL,
        'generado'
    )
    RETURNING id INTO v_canje_id;
    
    -- Reducir stock si aplica
    IF v_stock IS NOT NULL THEN
        UPDATE beneficios
        SET stock = stock - 1
        WHERE id = p_beneficio_id;
    END IF;
    
    RETURN QUERY SELECT v_canje_id, v_codigo, 'Canje generado exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Función: Validar un código de canje (para empresas)
CREATE OR REPLACE FUNCTION validar_codigo_canje(p_codigo VARCHAR(50))
RETURNS TABLE (
    valido BOOLEAN,
    beneficio_nombre VARCHAR(255),
    voluntario_nombre TEXT,
    mensaje TEXT
) AS $$
DECLARE
    v_canje RECORD;
BEGIN
    SELECT 
        c.id,
        c.estado,
        c.fecha_expiracion,
        b.nombre AS beneficio,
        v.nombre || ' ' || v.apellidos AS voluntario
    INTO v_canje
    FROM canjes_realizados c
    JOIN beneficios b ON c.beneficio_id = b.id
    JOIN voluntarios v ON c.voluntario_id = v.id
    WHERE c.codigo_canje = p_codigo;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::VARCHAR(255), NULL::TEXT, 'Código no encontrado'::TEXT;
        RETURN;
    END IF;
    
    IF v_canje.estado = 'canjeado' THEN
        RETURN QUERY SELECT false, v_canje.beneficio, v_canje.voluntario, 'Código ya utilizado'::TEXT;
        RETURN;
    END IF;
    
    IF v_canje.estado = 'expirado' OR v_canje.fecha_expiracion < CURRENT_TIMESTAMP THEN
        RETURN QUERY SELECT false, v_canje.beneficio, v_canje.voluntario, 'Código expirado'::TEXT;
        RETURN;
    END IF;
    
    IF v_canje.estado = 'cancelado' THEN
        RETURN QUERY SELECT false, v_canje.beneficio, v_canje.voluntario, 'Código cancelado'::TEXT;
        RETURN;
    END IF;
    
    -- Código válido
    RETURN QUERY SELECT true, v_canje.beneficio, v_canje.voluntario, 'Código válido'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Función: Marcar canje como utilizado
CREATE OR REPLACE FUNCTION marcar_canje_utilizado(p_codigo VARCHAR(50))
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE canjes_realizados
    SET 
        estado = 'canjeado',
        fecha_canje = CURRENT_TIMESTAMP
    WHERE codigo_canje = p_codigo
      AND estado = 'generado'
      AND fecha_expiracion >= CURRENT_TIMESTAMP;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. GESTIÓN DE ACTIVIDADES
-- =====================================================

-- Función: Duplicar actividad
CREATE OR REPLACE FUNCTION duplicar_actividad(
    p_actividad_id UUID,
    p_nueva_fecha_inicio DATE,
    p_nueva_fecha_fin DATE
)
RETURNS UUID AS $$
DECLARE
    v_nueva_actividad_id UUID;
    v_actividad RECORD;
BEGIN
    -- Obtener datos de la actividad original
    SELECT * INTO v_actividad
    FROM actividades
    WHERE id = p_actividad_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Actividad no encontrada';
    END IF;
    
    -- Crear nueva actividad
    INSERT INTO actividades (
        entidad_id,
        responsable_id,
        nombre,
        descripcion,
        objetivo,
        municipio,
        fecha_inicio,
        fecha_fin,
        horarios,
        num_voluntarios_objetivo,
        publicar_buscador,
        actividad_base_id,
        version_trimestre,
        estado
    ) VALUES (
        v_actividad.entidad_id,
        v_actividad.responsable_id,
        v_actividad.nombre,
        v_actividad.descripcion,
        v_actividad.objetivo,
        v_actividad.municipio,
        p_nueva_fecha_inicio,
        p_nueva_fecha_fin,
        v_actividad.horarios,
        v_actividad.num_voluntarios_objetivo,
        false, -- Nueva actividad empieza como no publicada
        COALESCE(v_actividad.actividad_base_id, p_actividad_id),
        CEIL(EXTRACT(MONTH FROM p_nueva_fecha_inicio) / 3.0),
        'borrador'
    )
    RETURNING id INTO v_nueva_actividad_id;
    
    RETURN v_nueva_actividad_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Inscribir voluntario a actividad
CREATE OR REPLACE FUNCTION inscribir_voluntario_actividad(
    p_voluntario_id UUID,
    p_actividad_id UUID
)
RETURNS TABLE (
    exito BOOLEAN,
    mensaje TEXT
) AS $$
DECLARE
    v_actividad RECORD;
    v_inscritos INTEGER;
BEGIN
    -- Verificar que la actividad existe y está publicada
    SELECT * INTO v_actividad
    FROM actividades
    WHERE id = p_actividad_id
      AND estado = 'publicada'
      AND publicar_buscador = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Actividad no disponible para inscripción'::TEXT;
        RETURN;
    END IF;
    
    -- Verificar si ya está inscrito
    IF EXISTS (
        SELECT 1 FROM voluntario_actividad
        WHERE voluntario_id = p_voluntario_id
          AND actividad_id = p_actividad_id
    ) THEN
        RETURN QUERY SELECT false, 'Ya estás inscrito en esta actividad'::TEXT;
        RETURN;
    END IF;
    
    -- Verificar cupo
    IF v_actividad.num_voluntarios_objetivo IS NOT NULL THEN
        SELECT COUNT(*) INTO v_inscritos
        FROM voluntario_actividad
        WHERE actividad_id = p_actividad_id
          AND estado IN ('inscrito', 'confirmado');
        
        IF v_inscritos >= v_actividad.num_voluntarios_objetivo THEN
            RETURN QUERY SELECT false, 'Cupo completo'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Inscribir
    INSERT INTO voluntario_actividad (voluntario_id, actividad_id)
    VALUES (p_voluntario_id, p_actividad_id);
    
    RETURN QUERY SELECT true, 'Inscripción exitosa'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. ESTADÍSTICAS Y REPORTES
-- =====================================================

-- Función: Resumen de actividad de voluntario
CREATE OR REPLACE FUNCTION resumen_voluntario(p_voluntario_id UUID)
RETURNS TABLE (
    total_actividades INTEGER,
    total_horas_validadas DECIMAL(10,2),
    total_canjes_realizados INTEGER,
    horas_disponibles DECIMAL(10,2),
    entidades_colabora INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT va.actividad_id)::INTEGER,
        COALESCE(SUM(CASE WHEN h.estado = 'validada' THEN h.horas END), 0)::DECIMAL(10,2),
        COUNT(DISTINCT CASE WHEN c.estado = 'canjeado' THEN c.id END)::INTEGER,
        (SELECT horas_disponibles FROM calcular_horas_disponibles(p_voluntario_id)),
        COUNT(DISTINCT ve.entidad_id)::INTEGER
    FROM voluntarios v
    LEFT JOIN voluntario_actividad va ON v.id = va.voluntario_id
    LEFT JOIN horas_registradas h ON v.id = h.voluntario_id
    LEFT JOIN canjes_realizados c ON v.id = c.voluntario_id
    LEFT JOIN voluntario_entidad ve ON v.id = ve.voluntario_id AND ve.activo = true
    WHERE v.id = p_voluntario_id
    GROUP BY v.id;
END;
$$ LANGUAGE plpgsql;

-- Función: Top beneficios más canjeados
CREATE OR REPLACE FUNCTION top_beneficios_canjeados(p_limite INTEGER DEFAULT 10)
RETURNS TABLE (
    beneficio_nombre VARCHAR(255),
    empresa_nombre VARCHAR(255),
    total_canjes BIGINT,
    horas_totales DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.nombre,
        e.nombre_empresa,
        COUNT(c.id) AS total_canjes,
        SUM(c.horas_consumidas)::DECIMAL(10,2) AS horas_totales
    FROM canjes_realizados c
    JOIN beneficios b ON c.beneficio_id = b.id
    JOIN empresas_culturales e ON b.empresa_id = e.id
    WHERE c.estado = 'canjeado'
    GROUP BY b.id, b.nombre, e.nombre_empresa
    ORDER BY COUNT(c.id) DESC
    LIMIT p_limite;
END;
$$ LANGUAGE plpgsql;

-- Función: Estadísticas de entidad social
CREATE OR REPLACE FUNCTION estadisticas_entidad(p_entidad_id UUID)
RETURNS TABLE (
    total_actividades INTEGER,
    actividades_activas INTEGER,
    total_voluntarios_unicos INTEGER,
    total_horas_registradas DECIMAL(10,2),
    promedio_horas_por_voluntario DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT a.id)::INTEGER,
        COUNT(DISTINCT CASE WHEN a.estado = 'publicada' THEN a.id END)::INTEGER,
        COUNT(DISTINCT va.voluntario_id)::INTEGER,
        COALESCE(SUM(h.horas), 0)::DECIMAL(10,2),
        CASE 
            WHEN COUNT(DISTINCT va.voluntario_id) > 0 
            THEN (COALESCE(SUM(h.horas), 0) / COUNT(DISTINCT va.voluntario_id))::DECIMAL(10,2)
            ELSE 0::DECIMAL(10,2)
        END
    FROM entidades_sociales e
    LEFT JOIN actividades a ON e.id = a.entidad_id
    LEFT JOIN voluntario_actividad va ON a.id = va.actividad_id
    LEFT JOIN horas_registradas h ON a.id = h.actividad_id AND h.estado = 'validada'
    WHERE e.id = p_entidad_id
    GROUP BY e.id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. BÚSQUEDA Y FILTROS
-- =====================================================

-- Función: Buscar actividades disponibles
CREATE OR REPLACE FUNCTION buscar_actividades(
    p_texto_busqueda TEXT DEFAULT NULL,
    p_municipio VARCHAR(100) DEFAULT NULL,
    p_fecha_desde DATE DEFAULT NULL,
    p_fecha_hasta DATE DEFAULT NULL
)
RETURNS TABLE (
    actividad_id UUID,
    nombre VARCHAR(255),
    descripcion TEXT,
    entidad_nombre VARCHAR(255),
    municipio VARCHAR(100),
    fecha_inicio DATE,
    fecha_fin DATE,
    plazas_disponibles INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.nombre,
        a.descripcion,
        e.nombre_legal,
        a.municipio,
        a.fecha_inicio,
        a.fecha_fin,
        CASE 
            WHEN a.num_voluntarios_objetivo IS NULL THEN NULL
            ELSE a.num_voluntarios_objetivo - COUNT(va.id)::INTEGER
        END AS plazas_disponibles
    FROM actividades a
    JOIN entidades_sociales e ON a.entidad_id = e.id
    LEFT JOIN voluntario_actividad va ON a.id = va.actividad_id 
        AND va.estado IN ('inscrito', 'confirmado')
    WHERE a.estado = 'publicada'
      AND a.publicar_buscador = true
      AND (p_texto_busqueda IS NULL OR 
           to_tsvector('spanish', a.nombre || ' ' || a.descripcion) @@ plainto_tsquery('spanish', p_texto_busqueda))
      AND (p_municipio IS NULL OR a.municipio ILIKE '%' || p_municipio || '%')
      AND (p_fecha_desde IS NULL OR a.fecha_fin >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR a.fecha_inicio <= p_fecha_hasta)
    GROUP BY a.id, e.nombre_legal
    ORDER BY a.fecha_inicio;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS EN FUNCIONES
-- =====================================================

COMMENT ON FUNCTION calcular_horas_disponibles IS 'Calcula horas validadas, consumidas, disponibles y caducadas para un voluntario';
COMMENT ON FUNCTION validar_horas IS 'Valida o rechaza horas registradas por un responsable';
COMMENT ON FUNCTION generar_canje IS 'Genera un código de canje para que un voluntario obtenga un beneficio';
COMMENT ON FUNCTION validar_codigo_canje IS 'Valida si un código de canje es válido y devuelve información del beneficio';
COMMENT ON FUNCTION marcar_canje_utilizado IS 'Marca un canje como utilizado cuando la empresa lo redime';
COMMENT ON FUNCTION duplicar_actividad IS 'Crea una copia de una actividad con nuevas fechas';
COMMENT ON FUNCTION inscribir_voluntario_actividad IS 'Inscribe un voluntario a una actividad verificando cupo y estado';
COMMENT ON FUNCTION resumen_voluntario IS 'Devuelve estadísticas generales de un voluntario';
COMMENT ON FUNCTION top_beneficios_canjeados IS 'Lista los beneficios más canjeados';
COMMENT ON FUNCTION estadisticas_entidad IS 'Devuelve estadísticas de una entidad social';
COMMENT ON FUNCTION buscar_actividades IS 'Búsqueda avanzada de actividades disponibles';
