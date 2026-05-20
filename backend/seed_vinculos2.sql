INSERT INTO voluntario_entidad (voluntario_id, entidad_id, estado)
SELECT v.id, e.id,
  CASE ROW_NUMBER() OVER ()
    WHEN 1 THEN 'aceptado'
    WHEN 2 THEN 'pendiente'
    ELSE 'pendiente'
  END
FROM voluntarios v, entidades_sociales e
WHERE e.usuario_id = 'b0000001-0000-0000-0000-000000000001';
