-- =====================================================
-- CONSULTAS ÚTILES Y REPORTES
-- Plataforma de Beneficios Culturales para Voluntariado
-- =====================================================

-- =====================================================
-- 1. CONSULTAS PARA ADMINISTRADORES
-- =====================================================

-- Dashboard general del sistema
CREATE OR REPLACE VIEW v_dashboard_admin AS
SELECT 
    (SELECT COUNT(*) FROM voluntarios) AS total_voluntarios,
    (SELECT COUNT(*) FROM entidades_sociales WHERE estado = 'verificada') AS entidades_activas,
    (SELECT COUNT(*) FROM empresas_culturales) AS empresas_activas,
    (SELECT COUNT(*) FROM actividades WHERE estado = 'publicada') AS actividades_publicadas,
    (SELECT COALESCE(SUM(horas), 0) FROM horas_registradas WHERE estado = 'validada') AS horas_totales_validadas,
    (SELECT COUNT(*) FROM canjes_realizados WHERE estado = 'canjeado') AS canjes_realizados,
    (SELECT COUNT(*) FROM beneficios WHERE activo = true) AS beneficios_activos;

-- Actividad mensual (nuevos registros)
CREATE OR REPLACE FUNCTION reporte_actividad_mensual(
    p_anio INTEGER,
    p_mes INTEGER
)
RETURNS TABLE (
    nuevos_voluntarios BIGINT,
    nuevas_actividades BIGINT,
    horas_registradas DECIMAL(10,2),
    canjes_generados BIGINT,
    canjes_utilizados BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT v.id) FILTER (
            WHERE EXTRACT(YEAR FROM v.created_at) = p_anio 
            AND EXTRACT(MONTH FROM v.created_at) = p_mes
        ),
        COUNT(DISTINCT a.id) FILTER (
            WHERE EXTRACT(YEAR FROM a.created_at) = p_anio 
            AND EXTRACT(MONTH FROM a.created_at) = p_mes
        ),
        COALESCE(SUM(h.horas) FILTER (
            WHERE EXTRACT(YEAR FROM h.fecha_registro) = p_anio 
            AND EXTRACT(MONTH FROM h.fecha_registro) = p_mes
            AND h.estado = 'validada'
        ), 0)::DECIMAL(10,2),
        COUNT(DISTINCT c.id) FILTER (
            WHERE EXTRACT(YEAR FROM c.fecha_generacion) = p_anio 
            AND EXTRACT(MONTH FROM c.fecha_generacion) = p_mes
        ),
        COUNT(DISTINCT c.id) FILTER (
            WHERE EXTRACT(YEAR FROM c.fecha_canje) = p_anio 
            AND EXTRACT(MONTH FROM c.fecha_canje) = p_mes
            AND c.estado = 'canjeado'
        )
    FROM voluntarios v
    FULL OUTER JOIN actividades a ON true
    FULL OUTER JOIN horas_registradas h ON true
    FULL OUTER JOIN canjes_realizados c ON true;
END;
$$ LANGUAGE plpgsql;

-- Top 10 voluntarios más activos
CREATE OR REPLACE VIEW v_top_voluntarios AS
SELECT 
    v.id,
    v.nombre || ' ' || v.apellidos AS nombre_completo,
    v.email,
    COUNT(DISTINCT va.actividad_id) AS actividades_participadas,
    COALESCE(SUM(CASE WHEN h.estado = 'validada' THEN h.horas END), 0) AS horas_totales,
    COUNT(DISTINCT CASE WHEN c.estado = 'canjeado' THEN c.id END) AS beneficios_canjeados
FROM voluntarios v
JOIN usuarios u ON v.usuario_id = u.id
LEFT JOIN voluntario_actividad va ON v.id = va.voluntario_id
LEFT JOIN horas_registradas h ON v.id = h.voluntario_id
LEFT JOIN canjes_realizados c ON v.id = c.voluntario_id
GROUP BY v.id, v.nombre, v.apellidos, v.email
ORDER BY horas_totales DESC
LIMIT 10;

-- Entidades con más actividad
CREATE OR REPLACE VIEW v_ranking_entidades AS
SELECT 
    e.id,
    e.nombre_legal,
    COUNT(DISTINCT a.id) AS total_actividades,
    COUNT(DISTINCT va.voluntario_id) AS voluntarios_participantes,
    COALESCE(SUM(CASE WHEN h.estado = 'validada' THEN h.horas END), 0) AS horas_generadas
FROM entidades_sociales e
LEFT JOIN actividades a ON e.id = a.entidad_id
LEFT JOIN voluntario_actividad va ON a.id = va.actividad_id
LEFT JOIN horas_registradas h ON a.id = h.actividad_id
WHERE e.estado = 'verificada'
GROUP BY e.id, e.nombre_legal
ORDER BY horas_generadas DESC;

-- =====================================================
-- 2. CONSULTAS PARA VOLUNTARIOS
-- =====================================================

-- Mis actividades y horas
CREATE OR REPLACE FUNCTION mis_actividades(p_voluntario_id UUID)
RETURNS TABLE (
    actividad_nombre VARCHAR(255),
    entidad VARCHAR(255),
    fecha_inicio DATE,
    fecha_fin DATE,
    estado_inscripcion estado_inscripcion_enum,
    horas_registradas DECIMAL(10,2),
    horas_pendientes_validacion DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.nombre,
        e.nombre_legal,
        a.fecha_inicio,
        a.fecha_fin,
        va.estado,
        COALESCE(SUM(CASE WHEN h.estado = 'validada' THEN h.horas END), 0)::DECIMAL(10,2),
        COALESCE(SUM(CASE WHEN h.estado = 'pendiente' THEN h.horas END), 0)::DECIMAL(10,2)
    FROM voluntario_actividad va
    JOIN actividades a ON va.actividad_id = a.id
    JOIN entidades_sociales e ON a.entidad_id = e.id
    LEFT JOIN horas_registradas h ON va.voluntario_id = h.voluntario_id AND va.actividad_id = h.actividad_id
    WHERE va.voluntario_id = p_voluntario_id
    GROUP BY a.id, a.nombre, e.nombre_legal, a.fecha_inicio, a.fecha_fin, va.estado
    ORDER BY a.fecha_inicio DESC;
END;
$$ LANGUAGE plpgsql;

-- Mis canjes y códigos activos
CREATE OR REPLACE FUNCTION mis_canjes(p_voluntario_id UUID)
RETURNS TABLE (
    codigo VARCHAR(50),
    beneficio VARCHAR(255),
    empresa VARCHAR(255),
    horas_consumidas DECIMAL(10,2),
    fecha_generacion TIMESTAMP WITH TIME ZONE,
    fecha_expiracion TIMESTAMP WITH TIME ZONE,
    fecha_canje TIMESTAMP WITH TIME ZONE,
    estado estado_canje_enum,
    dias_restantes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.codigo_canje,
        b.nombre,
        e.nombre_empresa,
        c.horas_consumidas,
        c.fecha_generacion,
        c.fecha_expiracion,
        c.fecha_canje,
        c.estado,
        CASE 
            WHEN c.estado = 'generado' AND c.fecha_expiracion > CURRENT_TIMESTAMP 
            THEN EXTRACT(DAY FROM (c.fecha_expiracion - CURRENT_TIMESTAMP))::INTEGER
            ELSE 0
        END
    FROM canjes_realizados c
    JOIN beneficios b ON c.beneficio_id = b.id
    JOIN empresas_culturales e ON b.empresa_id = e.id
    WHERE c.voluntario_id = p_voluntario_id
    ORDER BY 
        CASE c.estado
            WHEN 'generado' THEN 1
            WHEN 'canjeado' THEN 2
            WHEN 'expirado' THEN 3
            WHEN 'cancelado' THEN 4
        END,
        c.fecha_generacion DESC;
END;
$$ LANGUAGE plpgsql;

-- Beneficios que puedo canjear ahora
CREATE OR REPLACE FUNCTION beneficios_disponibles_para_mi(p_voluntario_id UUID)
RETURNS TABLE (
    beneficio_id UUID,
    nombre VARCHAR(255),
    descripcion TEXT,
    coste_horas DECIMAL(6,2),
    categoria VARCHAR(100),
    empresa VARCHAR(255),
    puedo_canjear BOOLEAN,
    horas_que_me_faltan DECIMAL(10,2)
) AS $$
DECLARE
    v_mis_horas DECIMAL(10,2);
BEGIN
    -- Obtener horas disponibles del voluntario
    SELECT horas_disponibles INTO v_mis_horas
    FROM calcular_horas_disponibles(p_voluntario_id);
    
    RETURN QUERY
    SELECT 
        b.id,
        b.nombre,
        b.descripcion,
        b.coste_horas,
        b.categoria,
        e.nombre_empresa,
        (v_mis_horas >= b.coste_horas) AS puedo_canjear,
        CASE 
            WHEN v_mis_horas >= b.coste_horas THEN 0
            ELSE (b.coste_horas - v_mis_horas)
        END::DECIMAL(10,2) AS horas_que_me_faltan
    FROM beneficios b
    JOIN empresas_culturales e ON b.empresa_id = e.id
    WHERE b.activo = true
      AND (b.stock IS NULL OR b.stock > 0)
    ORDER BY 
        (v_mis_horas >= b.coste_horas) DESC,
        b.coste_horas ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CONSULTAS PARA ENTIDADES SOCIALES
-- =====================================================

-- Resumen de mis actividades
CREATE OR REPLACE FUNCTION resumen_actividades_entidad(p_entidad_id UUID)
RETURNS TABLE (
    actividad_id UUID,
    nombre VARCHAR(255),
    fecha_inicio DATE,
    fecha_fin DATE,
    estado estado_actividad_enum,
    inscritos INTEGER,
    cupo_objetivo INTEGER,
    horas_validadas DECIMAL(10,2),
    horas_pendientes DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.nombre,
        a.fecha_inicio,
        a.fecha_fin,
        a.estado,
        COUNT(DISTINCT va.voluntario_id)::INTEGER,
        a.num_voluntarios_objetivo,
        COALESCE(SUM(CASE WHEN h.estado = 'validada' THEN h.horas END), 0)::DECIMAL(10,2),
        COALESCE(SUM(CASE WHEN h.estado = 'pendiente' THEN h.horas END), 0)::DECIMAL(10,2)
    FROM actividades a
    LEFT JOIN voluntario_actividad va ON a.id = va.actividad_id
    LEFT JOIN horas_registradas h ON a.id = h.actividad_id
    WHERE a.entidad_id = p_entidad_id
    GROUP BY a.id, a.nombre, a.fecha_inicio, a.fecha_fin, a.estado, a.num_voluntarios_objetivo
    ORDER BY a.fecha_inicio DESC;
END;
$$ LANGUAGE plpgsql;

-- Voluntarios de una actividad específica
CREATE OR REPLACE FUNCTION voluntarios_de_actividad(p_actividad_id UUID)
RETURNS TABLE (
    voluntario_id UUID,
    nombre_completo TEXT,
    email VARCHAR(255),
    telefono VARCHAR(20),
    estado_inscripcion estado_inscripcion_enum,
    horas_registradas DECIMAL(10,2),
    horas_pendientes DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.nombre || ' ' || v.apellidos,
        u.email,
        v.telefono,
        va.estado,
        COALESCE(SUM(CASE WHEN h.estado = 'validada' THEN h.horas END), 0)::DECIMAL(10,2),
        COALESCE(SUM(CASE WHEN h.estado = 'pendiente' THEN h.horas END), 0)::DECIMAL(10,2)
    FROM voluntario_actividad va
    JOIN voluntarios v ON va.voluntario_id = v.id
    JOIN usuarios u ON v.usuario_id = u.id
    LEFT JOIN horas_registradas h ON va.voluntario_id = h.voluntario_id AND va.actividad_id = h.actividad_id
    WHERE va.actividad_id = p_actividad_id
    GROUP BY v.id, v.nombre, v.apellidos, u.email, v.telefono, va.estado
    ORDER BY v.apellidos, v.nombre;
END;
$$ LANGUAGE plpgsql;

-- Horas pendientes de validación
CREATE OR REPLACE FUNCTION horas_pendientes_validacion_entidad(p_entidad_id UUID)
RETURNS TABLE (
    registro_id UUID,
    voluntario_nombre TEXT,
    actividad_nombre VARCHAR(255),
    horas DECIMAL(6,2),
    fecha_registro DATE,
    notas TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        v.nombre || ' ' || v.apellidos,
        a.nombre,
        h.horas,
        h.fecha_registro,
        h.notas
    FROM horas_registradas h
    JOIN actividades a ON h.actividad_id = a.id
    JOIN voluntarios v ON h.voluntario_id = v.id
    WHERE a.entidad_id = p_entidad_id
      AND h.estado = 'pendiente'
    ORDER BY h.fecha_registro DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CONSULTAS PARA EMPRESAS CULTURALES
-- =====================================================

-- Resumen de mis beneficios
CREATE OR REPLACE FUNCTION resumen_beneficios_empresa(p_empresa_id UUID)
RETURNS TABLE (
    beneficio_id UUID,
    nombre VARCHAR(255),
    coste_horas DECIMAL(6,2),
    activo BOOLEAN,
    stock_inicial INTEGER,
    stock_actual INTEGER,
    total_generados INTEGER,
    total_canjeados INTEGER,
    horas_totales_canjeadas DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.nombre,
        b.coste_horas,
        b.activo,
        b.stock,
        b.stock,
        COUNT(c.id)::INTEGER,
        COUNT(CASE WHEN c.estado = 'canjeado' THEN 1 END)::INTEGER,
        COALESCE(SUM(CASE WHEN c.estado = 'canjeado' THEN c.horas_consumidas END), 0)::DECIMAL(10,2)
    FROM beneficios b
    LEFT JOIN canjes_realizados c ON b.id = c.beneficio_id
    WHERE b.empresa_id = p_empresa_id
    GROUP BY b.id, b.nombre, b.coste_horas, b.activo, b.stock
    ORDER BY total_canjeados DESC;
END;
$$ LANGUAGE plpgsql;

-- Canjes recientes de mis beneficios
CREATE OR REPLACE FUNCTION canjes_recientes_empresa(
    p_empresa_id UUID,
    p_dias INTEGER DEFAULT 30
)
RETURNS TABLE (
    codigo VARCHAR(50),
    beneficio VARCHAR(255),
    voluntario TEXT,
    fecha_canje TIMESTAMP WITH TIME ZONE,
    horas_consumidas DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.codigo_canje,
        b.nombre,
        v.nombre || ' ' || v.apellidos,
        c.fecha_canje,
        c.horas_consumidas
    FROM canjes_realizados c
    JOIN beneficios b ON c.beneficio_id = b.id
    JOIN voluntarios v ON c.voluntario_id = v.id
    WHERE b.empresa_id = p_empresa_id
      AND c.estado = 'canjeado'
      AND c.fecha_canje >= CURRENT_TIMESTAMP - (p_dias || ' days')::INTERVAL
    ORDER BY c.fecha_canje DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CONSULTAS DE MANTENIMIENTO
-- =====================================================

-- Detectar horas próximas a caducar (alertas)
CREATE OR REPLACE FUNCTION horas_proximas_caducar(p_dias_aviso INTEGER DEFAULT 30)
RETURNS TABLE (
    voluntario_id UUID,
    voluntario_email VARCHAR(255),
    voluntario_nombre TEXT,
    horas DECIMAL(10,2),
    fecha_caducidad DATE,
    dias_restantes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        u.email,
        v.nombre || ' ' || v.apellidos,
        h.horas,
        h.fecha_caducidad,
        (h.fecha_caducidad - CURRENT_DATE)::INTEGER
    FROM horas_registradas h
    JOIN voluntarios v ON h.voluntario_id = v.id
    JOIN usuarios u ON v.usuario_id = u.id
    WHERE h.estado = 'validada'
      AND h.fecha_caducidad > CURRENT_DATE
      AND h.fecha_caducidad <= CURRENT_DATE + (p_dias_aviso || ' days')::INTERVAL
    ORDER BY h.fecha_caducidad ASC;
END;
$$ LANGUAGE plpgsql;

-- Detectar códigos de canje próximos a expirar
CREATE OR REPLACE FUNCTION codigos_proximos_expirar(p_dias_aviso INTEGER DEFAULT 7)
RETURNS TABLE (
    voluntario_email VARCHAR(255),
    voluntario_nombre TEXT,
    codigo VARCHAR(50),
    beneficio VARCHAR(255),
    fecha_expiracion TIMESTAMP WITH TIME ZONE,
    horas_perdidas DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.email,
        v.nombre || ' ' || v.apellidos,
        c.codigo_canje,
        b.nombre,
        c.fecha_expiracion,
        c.horas_consumidas
    FROM canjes_realizados c
    JOIN voluntarios v ON c.voluntario_id = v.id
    JOIN usuarios u ON v.usuario_id = u.id
    JOIN beneficios b ON c.beneficio_id = b.id
    WHERE c.estado = 'generado'
      AND c.fecha_expiracion > CURRENT_TIMESTAMP
      AND c.fecha_expiracion <= CURRENT_TIMESTAMP + (p_dias_aviso || ' days')::INTERVAL
    ORDER BY c.fecha_expiracion ASC;
END;
$$ LANGUAGE plpgsql;

-- Limpiar datos expirados automáticamente
CREATE OR REPLACE FUNCTION limpiar_datos_expirados()
RETURNS TABLE (
    canjes_expirados INTEGER,
    horas_caducadas INTEGER
) AS $$
DECLARE
    v_canjes INTEGER;
    v_horas INTEGER;
BEGIN
    -- Marcar canjes expirados
    UPDATE canjes_realizados
    SET estado = 'expirado'
    WHERE estado = 'generado'
      AND fecha_expiracion < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS v_canjes = ROW_COUNT;
    
    -- Las horas caducadas no se borran, solo se ignoran en las consultas
    -- pero podemos contarlas
    SELECT COUNT(*) INTO v_horas
    FROM horas_registradas
    WHERE estado = 'validada'
      AND fecha_caducidad < CURRENT_DATE;
    
    RETURN QUERY SELECT v_canjes, v_horas;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. ÍNDICES ADICIONALES DE RENDIMIENTO
-- =====================================================

-- Índices compuestos para mejorar consultas frecuentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_horas_voluntario_estado 
ON horas_registradas(voluntario_id, estado) 
WHERE estado = 'validada';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_canjes_voluntario_estado 
ON canjes_realizados(voluntario_id, estado);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_actividades_entidad_estado 
ON actividades(entidad_id, estado) 
WHERE estado = 'publicada';

-- Índice para búsqueda de actividades por fecha
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_actividades_fechas_publicadas 
ON actividades(fecha_inicio, fecha_fin) 
WHERE estado = 'publicada' AND publicar_buscador = true;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON VIEW v_dashboard_admin IS 'Vista con métricas principales del sistema para el dashboard de administración';
COMMENT ON FUNCTION reporte_actividad_mensual IS 'Genera reporte de actividad del sistema por mes';
COMMENT ON FUNCTION mis_actividades IS 'Lista las actividades de un voluntario con su estado y horas';
COMMENT ON FUNCTION beneficios_disponibles_para_mi IS 'Muestra beneficios que un voluntario puede canjear o cuántas horas le faltan';
COMMENT ON FUNCTION limpiar_datos_expirados IS 'Marca automáticamente canjes y horas como expirados (para ejecutar en cron job)';
