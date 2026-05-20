INSERT INTO voluntario_entidad (voluntario_id, entidad_id, estado)
SELECT v.id, e.id, 'aceptado'
FROM voluntarios v, entidades_sociales e;
