--
-- PostgreSQL database dump
--

\restrict 0ZphNjVd47ftlDtuliJoO9Qe4lKSZJ1kFBzvabo8kBIO6qL3n8kaQLjucksgjrD

-- Dumped from database version 15.17 (Debian 15.17-1.pgdg13+1)
-- Dumped by pg_dump version 15.17 (Debian 15.17-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: estado_actividad_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_actividad_enum AS ENUM (
    'borrador',
    'publicada',
    'cerrada'
);


ALTER TYPE public.estado_actividad_enum OWNER TO postgres;

--
-- Name: estado_canje_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_canje_enum AS ENUM (
    'generado',
    'canjeado',
    'expirado',
    'cancelado'
);


ALTER TYPE public.estado_canje_enum OWNER TO postgres;

--
-- Name: estado_entidad_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_entidad_enum AS ENUM (
    'pendiente',
    'verificada',
    'rechazada'
);


ALTER TYPE public.estado_entidad_enum OWNER TO postgres;

--
-- Name: estado_horas_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_horas_enum AS ENUM (
    'pendiente',
    'validada',
    'rechazada',
    'pendiente_delegado',
    'pendiente_entidad'
);


ALTER TYPE public.estado_horas_enum OWNER TO postgres;

--
-- Name: estado_inscripcion_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_inscripcion_enum AS ENUM (
    'pendiente',
    'inscrito',
    'confirmado',
    'completado',
    'cancelado',
    'rechazado'
);


ALTER TYPE public.estado_inscripcion_enum OWNER TO postgres;

--
-- Name: sistema_canje_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sistema_canje_enum AS ENUM (
    'manual',
    'api',
    'plugin',
    'middleware'
);


ALTER TYPE public.sistema_canje_enum OWNER TO postgres;

--
-- Name: tipo_usuario_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_usuario_enum AS ENUM (
    'voluntario',
    'entidad',
    'empresa',
    'admin',
    'delegado'
);


ALTER TYPE public.tipo_usuario_enum OWNER TO postgres;

--
-- Name: buscar_actividades(text, character varying, date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.buscar_actividades(p_texto_busqueda text DEFAULT NULL::text, p_municipio character varying DEFAULT NULL::character varying, p_fecha_desde date DEFAULT NULL::date, p_fecha_hasta date DEFAULT NULL::date) RETURNS TABLE(actividad_id uuid, nombre character varying, descripcion text, entidad_nombre character varying, municipio character varying, fecha_inicio date, fecha_fin date, plazas_disponibles integer)
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.buscar_actividades(p_texto_busqueda text, p_municipio character varying, p_fecha_desde date, p_fecha_hasta date) OWNER TO postgres;

--
-- Name: FUNCTION buscar_actividades(p_texto_busqueda text, p_municipio character varying, p_fecha_desde date, p_fecha_hasta date); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.buscar_actividades(p_texto_busqueda text, p_municipio character varying, p_fecha_desde date, p_fecha_hasta date) IS 'B??squeda avanzada de actividades disponibles';


--
-- Name: calcular_horas_disponibles(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calcular_horas_disponibles(p_voluntario_id uuid) RETURNS TABLE(horas_validadas numeric, horas_consumidas numeric, horas_disponibles numeric, horas_caducadas numeric)
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.calcular_horas_disponibles(p_voluntario_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION calcular_horas_disponibles(p_voluntario_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.calcular_horas_disponibles(p_voluntario_id uuid) IS 'Calcula horas validadas, consumidas, disponibles y caducadas para un voluntario';


--
-- Name: duplicar_actividad(uuid, date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.duplicar_actividad(p_actividad_id uuid, p_nueva_fecha_inicio date, p_nueva_fecha_fin date) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.duplicar_actividad(p_actividad_id uuid, p_nueva_fecha_inicio date, p_nueva_fecha_fin date) OWNER TO postgres;

--
-- Name: FUNCTION duplicar_actividad(p_actividad_id uuid, p_nueva_fecha_inicio date, p_nueva_fecha_fin date); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.duplicar_actividad(p_actividad_id uuid, p_nueva_fecha_inicio date, p_nueva_fecha_fin date) IS 'Crea una copia de una actividad con nuevas fechas';


--
-- Name: estadisticas_entidad(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.estadisticas_entidad(p_entidad_id uuid) RETURNS TABLE(total_actividades integer, actividades_activas integer, total_voluntarios_unicos integer, total_horas_registradas numeric, promedio_horas_por_voluntario numeric)
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.estadisticas_entidad(p_entidad_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION estadisticas_entidad(p_entidad_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.estadisticas_entidad(p_entidad_id uuid) IS 'Devuelve estad??sticas de una entidad social';


--
-- Name: generar_canje(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generar_canje(p_voluntario_id uuid, p_beneficio_id uuid, p_dias_validez integer DEFAULT 30) RETURNS TABLE(canje_id uuid, codigo_canje character varying, mensaje text)
    LANGUAGE plpgsql
    AS $$
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
    
    -- Generar c??digo ??nico
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
$$;


ALTER FUNCTION public.generar_canje(p_voluntario_id uuid, p_beneficio_id uuid, p_dias_validez integer) OWNER TO postgres;

--
-- Name: FUNCTION generar_canje(p_voluntario_id uuid, p_beneficio_id uuid, p_dias_validez integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.generar_canje(p_voluntario_id uuid, p_beneficio_id uuid, p_dias_validez integer) IS 'Genera un c??digo de canje para que un voluntario obtenga un beneficio';


--
-- Name: generar_codigo_canje(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generar_codigo_canje() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    codigo VARCHAR(50);
BEGIN
    -- Formato: TBC-XXXX-YY (donde XXXX = n??mero aleatorio, YY = hash corto)
    LOOP
        codigo := 'TBC-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') || '-' || 
                  UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 2));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM canjes_realizados WHERE codigo_canje = codigo);
    END LOOP;
    RETURN codigo;
END;
$$;


ALTER FUNCTION public.generar_codigo_canje() OWNER TO postgres;

--
-- Name: inscribir_voluntario_actividad(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.inscribir_voluntario_actividad(p_voluntario_id uuid, p_actividad_id uuid) RETURNS TABLE(exito boolean, mensaje text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_actividad RECORD;
    v_inscritos INTEGER;
BEGIN
    -- Verificar que la actividad existe y est?? publicada
    SELECT * INTO v_actividad
    FROM actividades
    WHERE id = p_actividad_id
      AND estado = 'publicada'
      AND publicar_buscador = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Actividad no disponible para inscripci??n'::TEXT;
        RETURN;
    END IF;
    
    -- Verificar si ya est?? inscrito
    IF EXISTS (
        SELECT 1 FROM voluntario_actividad
        WHERE voluntario_id = p_voluntario_id
          AND actividad_id = p_actividad_id
    ) THEN
        RETURN QUERY SELECT false, 'Ya est??s inscrito en esta actividad'::TEXT;
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
    
    RETURN QUERY SELECT true, 'Inscripci??n exitosa'::TEXT;
END;
$$;


ALTER FUNCTION public.inscribir_voluntario_actividad(p_voluntario_id uuid, p_actividad_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION inscribir_voluntario_actividad(p_voluntario_id uuid, p_actividad_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.inscribir_voluntario_actividad(p_voluntario_id uuid, p_actividad_id uuid) IS 'Inscribe un voluntario a una actividad verificando cupo y estado';


--
-- Name: marcar_canje_utilizado(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.marcar_canje_utilizado(p_codigo character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.marcar_canje_utilizado(p_codigo character varying) OWNER TO postgres;

--
-- Name: FUNCTION marcar_canje_utilizado(p_codigo character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.marcar_canje_utilizado(p_codigo character varying) IS 'Marca un canje como utilizado cuando la empresa lo redime';


--
-- Name: marcar_horas_caducadas(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.marcar_horas_caducadas() RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.marcar_horas_caducadas() OWNER TO postgres;

--
-- Name: resumen_voluntario(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.resumen_voluntario(p_voluntario_id uuid) RETURNS TABLE(total_actividades integer, total_horas_validadas numeric, total_canjes_realizados integer, horas_disponibles numeric, entidades_colabora integer)
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.resumen_voluntario(p_voluntario_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION resumen_voluntario(p_voluntario_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.resumen_voluntario(p_voluntario_id uuid) IS 'Devuelve estad??sticas generales de un voluntario';


--
-- Name: set_fecha_caducidad(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_fecha_caducidad() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado = 'validada' AND (OLD.estado IS NULL OR OLD.estado != 'validada') THEN
        NEW.fecha_validacion = CURRENT_TIMESTAMP;
        NEW.fecha_caducidad = CURRENT_DATE + INTERVAL '1 year';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_fecha_caducidad() OWNER TO postgres;

--
-- Name: set_trimestre_anio(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_trimestre_anio() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.anio = EXTRACT(YEAR FROM NEW.fecha_registro);
    NEW.trimestre = CEIL(EXTRACT(MONTH FROM NEW.fecha_registro) / 3.0);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_trimestre_anio() OWNER TO postgres;

--
-- Name: top_beneficios_canjeados(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.top_beneficios_canjeados(p_limite integer DEFAULT 10) RETURNS TABLE(beneficio_nombre character varying, empresa_nombre character varying, total_canjes bigint, horas_totales numeric)
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.top_beneficios_canjeados(p_limite integer) OWNER TO postgres;

--
-- Name: FUNCTION top_beneficios_canjeados(p_limite integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.top_beneficios_canjeados(p_limite integer) IS 'Lista los beneficios m??s canjeados';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: validar_codigo_canje(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_codigo_canje(p_codigo character varying) RETURNS TABLE(valido boolean, beneficio_nombre character varying, voluntario_nombre text, mensaje text)
    LANGUAGE plpgsql
    AS $$
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
        RETURN QUERY SELECT false, NULL::VARCHAR(255), NULL::TEXT, 'C??digo no encontrado'::TEXT;
        RETURN;
    END IF;
    
    IF v_canje.estado = 'canjeado' THEN
        RETURN QUERY SELECT false, v_canje.beneficio, v_canje.voluntario, 'C??digo ya utilizado'::TEXT;
        RETURN;
    END IF;
    
    IF v_canje.estado = 'expirado' OR v_canje.fecha_expiracion < CURRENT_TIMESTAMP THEN
        RETURN QUERY SELECT false, v_canje.beneficio, v_canje.voluntario, 'C??digo expirado'::TEXT;
        RETURN;
    END IF;
    
    IF v_canje.estado = 'cancelado' THEN
        RETURN QUERY SELECT false, v_canje.beneficio, v_canje.voluntario, 'C??digo cancelado'::TEXT;
        RETURN;
    END IF;
    
    -- C??digo v??lido
    RETURN QUERY SELECT true, v_canje.beneficio, v_canje.voluntario, 'C??digo v??lido'::TEXT;
END;
$$;


ALTER FUNCTION public.validar_codigo_canje(p_codigo character varying) OWNER TO postgres;

--
-- Name: FUNCTION validar_codigo_canje(p_codigo character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.validar_codigo_canje(p_codigo character varying) IS 'Valida si un c??digo de canje es v??lido y devuelve informaci??n del beneficio';


--
-- Name: validar_horas(uuid, uuid, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_horas(p_hora_id uuid, p_responsable_id uuid, p_aprobar boolean DEFAULT true) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.validar_horas(p_hora_id uuid, p_responsable_id uuid, p_aprobar boolean) OWNER TO postgres;

--
-- Name: FUNCTION validar_horas(p_hora_id uuid, p_responsable_id uuid, p_aprobar boolean); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.validar_horas(p_hora_id uuid, p_responsable_id uuid, p_aprobar boolean) IS 'Valida o rechaza horas registradas por un responsable';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: actividades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.actividades (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entidad_id uuid NOT NULL,
    responsable_id uuid NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text NOT NULL,
    objetivo text,
    municipio character varying(100) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    horarios text,
    num_voluntarios_objetivo integer,
    publicar_buscador boolean DEFAULT true,
    actividad_base_id uuid,
    version_trimestre integer,
    estado public.estado_actividad_enum DEFAULT 'borrador'::public.estado_actividad_enum,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    delegado_id uuid,
    CONSTRAINT chk_duracion CHECK ((fecha_fin <= (fecha_inicio + '3 mons'::interval))),
    CONSTRAINT chk_fechas CHECK ((fecha_fin >= fecha_inicio))
);


ALTER TABLE public.actividades OWNER TO postgres;

--
-- Name: TABLE actividades; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.actividades IS 'Actividades de voluntariado publicadas por entidades';


--
-- Name: beneficios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.beneficios (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    empresa_id uuid NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text NOT NULL,
    coste_horas numeric(6,2) NOT NULL,
    categoria character varying(100),
    condiciones text,
    activo boolean DEFAULT true,
    stock integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT beneficios_coste_horas_check CHECK ((coste_horas > (0)::numeric))
);


ALTER TABLE public.beneficios OWNER TO postgres;

--
-- Name: TABLE beneficios; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.beneficios IS 'Cat??logo de beneficios culturales ofrecidos';


--
-- Name: COLUMN beneficios.stock; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.beneficios.stock IS 'NULL significa stock ilimitado';


--
-- Name: canjes_realizados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.canjes_realizados (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    voluntario_id uuid NOT NULL,
    beneficio_id uuid NOT NULL,
    codigo_canje character varying(50) NOT NULL,
    horas_consumidas numeric(6,2) NOT NULL,
    fecha_generacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion timestamp with time zone NOT NULL,
    fecha_canje timestamp with time zone,
    estado public.estado_canje_enum DEFAULT 'generado'::public.estado_canje_enum,
    notas text
);


ALTER TABLE public.canjes_realizados OWNER TO postgres;

--
-- Name: TABLE canjes_realizados; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.canjes_realizados IS 'Historial de canjes de horas por beneficios';


--
-- Name: COLUMN canjes_realizados.codigo_canje; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.canjes_realizados.codigo_canje IS 'C??digo ??nico generado para validar el canje (ej: TBC-4821-KQ)';


--
-- Name: delegados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delegados (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid,
    entidad_id uuid,
    nombre character varying(255) NOT NULL,
    cargo character varying(255),
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    telefono character varying(20),
    dni character varying(20),
    direccion character varying(255),
    fecha_nacimiento date
);


ALTER TABLE public.delegados OWNER TO postgres;

--
-- Name: empresas_culturales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empresas_culturales (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    nombre_empresa character varying(255) NOT NULL,
    cif character varying(20) NOT NULL,
    direccion text NOT NULL,
    web character varying(255),
    contacto_nombre character varying(200) NOT NULL,
    contacto_email character varying(255) NOT NULL,
    contacto_telefono character varying(20) NOT NULL,
    tipo_oferta character varying(100),
    sistema_canje public.sistema_canje_enum DEFAULT 'manual'::public.sistema_canje_enum,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.empresas_culturales OWNER TO postgres;

--
-- Name: TABLE empresas_culturales; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.empresas_culturales IS 'Empresas que ofrecen beneficios culturales';


--
-- Name: entidades_sociales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entidades_sociales (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    nombre_legal character varying(255) NOT NULL,
    nif character varying(20) NOT NULL,
    direccion text NOT NULL,
    web character varying(255),
    fecha_inscripcion date,
    numero_registro character varying(100),
    admin_nombre character varying(200) NOT NULL,
    admin_email character varying(255) NOT NULL,
    admin_telefono character varying(20) NOT NULL,
    contacto_nombre character varying(200),
    contacto_email character varying(255),
    contacto_telefono character varying(20),
    documentacion_url text,
    estado public.estado_entidad_enum DEFAULT 'pendiente'::public.estado_entidad_enum,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.entidades_sociales OWNER TO postgres;

--
-- Name: TABLE entidades_sociales; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.entidades_sociales IS 'ONGs, fundaciones y asociaciones que publican actividades';


--
-- Name: horas_registradas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.horas_registradas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    voluntario_id uuid NOT NULL,
    actividad_id uuid NOT NULL,
    responsable_id uuid,
    horas numeric(6,2) NOT NULL,
    fecha_registro date DEFAULT CURRENT_DATE NOT NULL,
    notas text,
    estado public.estado_horas_enum DEFAULT 'pendiente'::public.estado_horas_enum,
    fecha_validacion timestamp with time zone,
    trimestre integer NOT NULL,
    anio integer NOT NULL,
    fecha_caducidad date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT horas_registradas_horas_check CHECK (((horas > (0)::numeric) AND (horas <= (24)::numeric)))
);


ALTER TABLE public.horas_registradas OWNER TO postgres;

--
-- Name: TABLE horas_registradas; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.horas_registradas IS 'Registro de horas de voluntariado realizadas';


--
-- Name: COLUMN horas_registradas.fecha_caducidad; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.horas_registradas.fecha_caducidad IS 'Las horas caducan 1 a??o despu??s de su validaci??n';


--
-- Name: mensajes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mensajes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    remitente_id uuid NOT NULL,
    destinatario_id uuid NOT NULL,
    asunto character varying(255) NOT NULL,
    cuerpo text NOT NULL,
    leido boolean DEFAULT false,
    relacionado_tipo character varying(50),
    relacionado_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    actividad_id uuid
);


ALTER TABLE public.mensajes OWNER TO postgres;

--
-- Name: responsables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.responsables (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entidad_id uuid NOT NULL,
    nombre character varying(200) NOT NULL,
    email character varying(255) NOT NULL,
    telefono character varying(20),
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.responsables OWNER TO postgres;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    tipo_usuario public.tipo_usuario_enum NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    reset_token character varying(255),
    reset_token_expira timestamp with time zone
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.usuarios IS 'Tabla base para autenticaci??n de todos los usuarios del sistema';


--
-- Name: voluntarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.voluntarios (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    nombre character varying(100) NOT NULL,
    apellidos character varying(150) NOT NULL,
    fecha_nacimiento date NOT NULL,
    dni_nie character varying(20) NOT NULL,
    telefono character varying(20),
    direccion text,
    preferencias text,
    acepta_rgpd boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_edad CHECK ((fecha_nacimiento <= (CURRENT_DATE - '16 years'::interval)))
);


ALTER TABLE public.voluntarios OWNER TO postgres;

--
-- Name: TABLE voluntarios; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.voluntarios IS 'Datos personales de voluntarios';


--
-- Name: v_horas_disponibles; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_horas_disponibles AS
 SELECT v.id AS voluntario_id,
    v.nombre,
    v.apellidos,
    COALESCE(sum(
        CASE
            WHEN ((h.estado = 'validada'::public.estado_horas_enum) AND (h.fecha_caducidad > CURRENT_DATE)) THEN h.horas
            ELSE (0)::numeric
        END), (0)::numeric) AS horas_validadas,
    COALESCE(sum(
        CASE
            WHEN (c.estado = 'canjeado'::public.estado_canje_enum) THEN c.horas_consumidas
            ELSE (0)::numeric
        END), (0)::numeric) AS horas_consumidas,
    (COALESCE(sum(
        CASE
            WHEN ((h.estado = 'validada'::public.estado_horas_enum) AND (h.fecha_caducidad > CURRENT_DATE)) THEN h.horas
            ELSE (0)::numeric
        END), (0)::numeric) - COALESCE(sum(
        CASE
            WHEN (c.estado = 'canjeado'::public.estado_canje_enum) THEN c.horas_consumidas
            ELSE (0)::numeric
        END), (0)::numeric)) AS horas_disponibles
   FROM ((public.voluntarios v
     LEFT JOIN public.horas_registradas h ON ((v.id = h.voluntario_id)))
     LEFT JOIN public.canjes_realizados c ON ((v.id = c.voluntario_id)))
  GROUP BY v.id, v.nombre, v.apellidos;


ALTER TABLE public.v_horas_disponibles OWNER TO postgres;

--
-- Name: v_beneficios_disponibles; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_beneficios_disponibles AS
 SELECT b.id AS beneficio_id,
    b.nombre,
    b.descripcion,
    b.coste_horas,
    b.categoria,
    e.nombre_empresa,
    v.voluntario_id,
    v.horas_disponibles,
        CASE
            WHEN (v.horas_disponibles >= b.coste_horas) THEN true
            ELSE false
        END AS puede_canjear
   FROM ((public.beneficios b
     JOIN public.empresas_culturales e ON ((b.empresa_id = e.id)))
     CROSS JOIN public.v_horas_disponibles v)
  WHERE ((b.activo = true) AND ((b.stock IS NULL) OR (b.stock > 0)));


ALTER TABLE public.v_beneficios_disponibles OWNER TO postgres;

--
-- Name: voluntario_actividad; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.voluntario_actividad (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    voluntario_id uuid NOT NULL,
    actividad_id uuid NOT NULL,
    fecha_inscripcion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    estado public.estado_inscripcion_enum DEFAULT 'inscrito'::public.estado_inscripcion_enum
);


ALTER TABLE public.voluntario_actividad OWNER TO postgres;

--
-- Name: v_resumen_actividades; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_resumen_actividades AS
 SELECT e.id AS entidad_id,
    e.nombre_legal,
    count(DISTINCT a.id) AS total_actividades,
    count(DISTINCT
        CASE
            WHEN (a.estado = 'publicada'::public.estado_actividad_enum) THEN a.id
            ELSE NULL::uuid
        END) AS actividades_activas,
    count(DISTINCT va.voluntario_id) AS total_voluntarios_inscritos
   FROM ((public.entidades_sociales e
     LEFT JOIN public.actividades a ON ((e.id = a.entidad_id)))
     LEFT JOIN public.voluntario_actividad va ON ((a.id = va.actividad_id)))
  GROUP BY e.id, e.nombre_legal;


ALTER TABLE public.v_resumen_actividades OWNER TO postgres;

--
-- Name: voluntario_entidad; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.voluntario_entidad (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    voluntario_id uuid NOT NULL,
    entidad_id uuid NOT NULL,
    fecha_asociacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    activo boolean DEFAULT true,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT voluntario_entidad_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aceptado'::character varying])::text[])))
);


ALTER TABLE public.voluntario_entidad OWNER TO postgres;

--
-- Name: actividades actividades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_pkey PRIMARY KEY (id);


--
-- Name: beneficios beneficios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficios
    ADD CONSTRAINT beneficios_pkey PRIMARY KEY (id);


--
-- Name: canjes_realizados canjes_realizados_codigo_canje_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.canjes_realizados
    ADD CONSTRAINT canjes_realizados_codigo_canje_key UNIQUE (codigo_canje);


--
-- Name: canjes_realizados canjes_realizados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.canjes_realizados
    ADD CONSTRAINT canjes_realizados_pkey PRIMARY KEY (id);


--
-- Name: delegados delegados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delegados
    ADD CONSTRAINT delegados_pkey PRIMARY KEY (id);


--
-- Name: empresas_culturales empresas_culturales_cif_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresas_culturales
    ADD CONSTRAINT empresas_culturales_cif_key UNIQUE (cif);


--
-- Name: empresas_culturales empresas_culturales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresas_culturales
    ADD CONSTRAINT empresas_culturales_pkey PRIMARY KEY (id);


--
-- Name: empresas_culturales empresas_culturales_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresas_culturales
    ADD CONSTRAINT empresas_culturales_usuario_id_key UNIQUE (usuario_id);


--
-- Name: entidades_sociales entidades_sociales_nif_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entidades_sociales
    ADD CONSTRAINT entidades_sociales_nif_key UNIQUE (nif);


--
-- Name: entidades_sociales entidades_sociales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entidades_sociales
    ADD CONSTRAINT entidades_sociales_pkey PRIMARY KEY (id);


--
-- Name: entidades_sociales entidades_sociales_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entidades_sociales
    ADD CONSTRAINT entidades_sociales_usuario_id_key UNIQUE (usuario_id);


--
-- Name: horas_registradas horas_registradas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horas_registradas
    ADD CONSTRAINT horas_registradas_pkey PRIMARY KEY (id);


--
-- Name: mensajes mensajes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_pkey PRIMARY KEY (id);


--
-- Name: responsables responsables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsables
    ADD CONSTRAINT responsables_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: voluntario_actividad voluntario_actividad_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voluntario_actividad
    ADD CONSTRAINT voluntario_actividad_pkey PRIMARY KEY (id);


--
-- Name: voluntario_actividad voluntario_actividad_voluntario_id_actividad_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voluntario_actividad
    ADD CONSTRAINT voluntario_actividad_voluntario_id_actividad_id_key UNIQUE (voluntario_id, actividad_id);


--
-- Name: voluntario_entidad voluntario_entidad_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voluntario_entidad
    ADD CONSTRAINT voluntario_entidad_pkey PRIMARY KEY (id);


--
-- Name: voluntario_entidad voluntario_entidad_voluntario_id_entidad_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voluntario_entidad
    ADD CONSTRAINT voluntario_entidad_voluntario_id_entidad_id_key UNIQUE (voluntario_id, entidad_id);


--
-- Name: voluntarios voluntarios_dni_nie_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voluntarios
    ADD CONSTRAINT voluntarios_dni_nie_key UNIQUE (dni_nie);


--
-- Name: voluntarios voluntarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voluntarios
    ADD CONSTRAINT voluntarios_pkey PRIMARY KEY (id);


--
-- Name: voluntarios voluntarios_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voluntarios
    ADD CONSTRAINT voluntarios_usuario_id_key UNIQUE (usuario_id);


--
-- Name: idx_actividades_entidad; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_actividades_entidad ON public.actividades USING btree (entidad_id);


--
-- Name: idx_actividades_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_actividades_estado ON public.actividades USING btree (estado);


--
-- Name: idx_actividades_fechas; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_actividades_fechas ON public.actividades USING btree (fecha_inicio, fecha_fin);


--
-- Name: idx_actividades_municipio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_actividades_municipio ON public.actividades USING btree (municipio);


--
-- Name: idx_actividades_publicar; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_actividades_publicar ON public.actividades USING btree (publicar_buscador) WHERE (publicar_buscador = true);


--
-- Name: idx_actividades_texto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_actividades_texto ON public.actividades USING gin (to_tsvector('spanish'::regconfig, (((nombre)::text || ' '::text) || descripcion)));


--
-- Name: idx_beneficios_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficios_activo ON public.beneficios USING btree (activo) WHERE (activo = true);


--
-- Name: idx_beneficios_categoria; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficios_categoria ON public.beneficios USING btree (categoria);


--
-- Name: idx_beneficios_coste; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficios_coste ON public.beneficios USING btree (coste_horas);


--
-- Name: idx_beneficios_empresa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficios_empresa ON public.beneficios USING btree (empresa_id);


--
-- Name: idx_canjes_beneficio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_canjes_beneficio ON public.canjes_realizados USING btree (beneficio_id);


--
-- Name: idx_canjes_codigo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_canjes_codigo ON public.canjes_realizados USING btree (codigo_canje);


--
-- Name: idx_canjes_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_canjes_estado ON public.canjes_realizados USING btree (estado);


--
-- Name: idx_canjes_voluntario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_canjes_voluntario ON public.canjes_realizados USING btree (voluntario_id);


--
-- Name: idx_empresas_cif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empresas_cif ON public.empresas_culturales USING btree (cif);


--
-- Name: idx_empresas_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empresas_usuario ON public.empresas_culturales USING btree (usuario_id);


--
-- Name: idx_entidades_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entidades_estado ON public.entidades_sociales USING btree (estado);


--
-- Name: idx_entidades_nif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entidades_nif ON public.entidades_sociales USING btree (nif);


--
-- Name: idx_entidades_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entidades_usuario ON public.entidades_sociales USING btree (usuario_id);


--
-- Name: idx_horas_actividad; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_horas_actividad ON public.horas_registradas USING btree (actividad_id);


--
-- Name: idx_horas_caducidad; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_horas_caducidad ON public.horas_registradas USING btree (fecha_caducidad) WHERE (estado = 'validada'::public.estado_horas_enum);


--
-- Name: idx_horas_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_horas_estado ON public.horas_registradas USING btree (estado);


--
-- Name: idx_horas_trimestre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_horas_trimestre ON public.horas_registradas USING btree (anio, trimestre);


--
-- Name: idx_horas_voluntario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_horas_voluntario ON public.horas_registradas USING btree (voluntario_id);


--
-- Name: idx_mensajes_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mensajes_created ON public.mensajes USING btree (created_at DESC);


--
-- Name: idx_mensajes_destinatario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mensajes_destinatario ON public.mensajes USING btree (destinatario_id);


--
-- Name: idx_mensajes_leido; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mensajes_leido ON public.mensajes USING btree (leido);


--
-- Name: idx_mensajes_remitente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mensajes_remitente ON public.mensajes USING btree (remitente_id);


--
-- Name: idx_responsables_entidad; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsables_entidad ON public.responsables USING btree (entidad_id);


--
-- Name: idx_usuarios_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuarios_email ON public.usuarios USING btree (email);


--
-- Name: idx_usuarios_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuarios_tipo ON public.usuarios USING btree (tipo_usuario);


--
-- Name: idx_vol_act_actividad; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vol_act_actividad ON public.voluntario_actividad USING btree (actividad_id);


--
-- Name: idx_vol_act_voluntario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vol_act_voluntario ON public.voluntario_actividad USING btree (voluntario_id);


--
-- Name: idx_vol_ent_entidad; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vol_ent_entidad ON public.voluntario_entidad USING btree (entidad_id);


--
-- Name: idx_vol_ent_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vol_ent_estado ON public.voluntario_entidad USING btree (estado);


--
-- Name: idx_vol_ent_voluntario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vol_ent_voluntario ON public.voluntario_entidad USING btree (voluntario_id);


--
-- Name: idx_voluntarios_dni; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_voluntarios_dni ON public.voluntarios USING btree (dni_nie);


--
-- Name: idx_voluntarios_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_voluntarios_usuario ON public.voluntarios USING btree (usuario_id);


--
-- Name: horas_registradas set_caducidad_on_validacion; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_caducidad_on_validacion BEFORE UPDATE ON public.horas_registradas FOR EACH ROW EXECUTE FUNCTION public.set_fecha_caducidad();


--
-- Name: horas_registradas set_trimestre_before_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_trimestre_before_insert BEFORE INSERT ON public.horas_registradas FOR EACH ROW EXECUTE FUNCTION public.set_trimestre_anio();


--
-- Name: usuarios update_usuarios_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: actividades actividades_actividad_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_actividad_base_id_fkey FOREIGN KEY (actividad_base_id) REFERENCES public.actividades(id);


--
-- Name: actividades actividades_delegado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_delegado_id_fkey FOREIGN KEY (delegado_id) REFERENCES public.delegados(id) ON DELETE SET NULL;


--
-- Name: actividades actividades_entidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_entidad_id_fkey FOREIGN KEY (entidad_id) REFERENCES public.entidades_sociales(id) ON DELETE CASCADE;


--
-- Name: actividades actividades_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES public.responsables(id);


--
-- Name: beneficios beneficios_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficios
    ADD CONSTRAINT beneficios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas_culturales(id) ON DELETE CASCADE;


--
-- Name: canjes_realizados canjes_realizados_beneficio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.canjes_realizados
    ADD CONSTRAINT canjes_realizados_beneficio_id_fkey FOREIGN KEY (beneficio_id) REFERENCES public.beneficios(id);


--
-- Name: canjes_realizados canjes_realizados_voluntario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.canjes_realizados
    ADD CONSTRAINT canjes_realizados_voluntario_id_fkey FOREIGN KEY (voluntario_id) REFERENCES public.voluntarios(id) ON DELETE CASCADE;


--
-- Name: delegados delegados_entidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delegados
    ADD CONSTRAINT delegados_entidad_id_fkey FOREIGN KEY (entidad_id) REFERENCES public.entidades_sociales(id) ON DELETE CASCADE;


--
-- Name: delegados delegados_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delegados
    ADD CONSTRAINT delegados_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: empresas_culturales empresas_culturales_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresas_culturales
    ADD CONSTRAINT empresas_culturales_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: entidades_sociales entidades_sociales_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entidades_sociales
    ADD CONSTRAINT entidades_sociales_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: horas_registradas horas_registradas_actividad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horas_registradas
    ADD CONSTRAINT horas_registradas_actividad_id_fkey FOREIGN KEY (actividad_id) REFERENCES public.actividades(id);


--
-- Name: horas_registradas horas_registradas_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horas_registradas
    ADD CONSTRAINT horas_registradas_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES public.responsables(id);


--
-- Name: horas_registradas horas_registradas_voluntario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horas_registradas
    ADD CONSTRAINT horas_registradas_voluntario_id_fkey FOREIGN KEY (voluntario_id) REFERENCES public.voluntarios(id) ON DELETE CASCADE;


--
-- Name: mensajes mensajes_actividad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_actividad_id_fkey FOREIGN KEY (actividad_id) REFERENCES public.actividades(id) ON DELETE CASCADE;


--
-- Name: mensajes mensajes_destinatario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_destinatario_id_fkey FOREIGN KEY (destinatario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: mensajes mensajes_remitente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_remitente_id_fkey FOREIGN KEY (remitente_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: responsables responsables_entidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsables
    ADD CONSTRAINT responsables_entidad_id_fkey FOREIGN KEY (entidad_id) REFERENCES public.entidades_sociales(id) ON DELETE CASCADE;


--
-- Name: voluntario_actividad voluntario_actividad_actividad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voluntario_actividad
    ADD CONSTRAINT voluntario_actividad_actividad_id_fkey FOREIGN KEY (actividad_id) REFERENCES public.actividades(id) ON DELETE CASCADE;


--
-- Name: voluntario_actividad voluntario_actividad_voluntario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voluntario_actividad
    ADD CONSTRAINT voluntario_actividad_voluntario_id_fkey FOREIGN KEY (voluntario_id) REFERENCES public.voluntarios(id) ON DELETE CASCADE;


--
-- Name: voluntario_entidad voluntario_entidad_entidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voluntario_entidad
    ADD CONSTRAINT voluntario_entidad_entidad_id_fkey FOREIGN KEY (entidad_id) REFERENCES public.entidades_sociales(id) ON DELETE CASCADE;


--
-- Name: voluntario_entidad voluntario_entidad_voluntario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voluntario_entidad
    ADD CONSTRAINT voluntario_entidad_voluntario_id_fkey FOREIGN KEY (voluntario_id) REFERENCES public.voluntarios(id) ON DELETE CASCADE;


--
-- Name: voluntarios voluntarios_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voluntarios
    ADD CONSTRAINT voluntarios_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 0ZphNjVd47ftlDtuliJoO9Qe4lKSZJ1kFBzvabo8kBIO6qL3n8kaQLjucksgjrD

