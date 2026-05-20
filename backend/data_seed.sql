--
-- PostgreSQL database dump
--

\restrict iGTR7Xyja6CAdJ891WdunMU8sZaX33XbfFvykg0jvvzAgVjmpnInfVbECxWGVCv

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
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, email, password_hash, tipo_usuario, created_at, updated_at, reset_token, reset_token_expira) FROM stdin;
30d4cf5e-bf41-4cf3-9886-15e4083f12f4	voluntario4@voluntario.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	voluntario	2026-05-11 08:50:06.314109+00	2026-05-11 08:50:06.314109+00	\N	\N
cee466da-8c59-468b-b3ec-07ae3a135b06	voluntario5@voluntario.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	voluntario	2026-05-11 08:50:06.317116+00	2026-05-11 08:50:06.317116+00	\N	\N
25009d4c-64ef-477d-82b9-00f7a09601bf	entidadsocial1@entidadsocial.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	entidad	2026-05-11 08:50:06.319697+00	2026-05-11 08:50:06.319697+00	\N	\N
a5aaf4cb-3a50-463c-b2d4-44274abf105e	entidadsocial2@entidadsocial.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	entidad	2026-05-11 08:50:06.322371+00	2026-05-11 08:50:06.322371+00	\N	\N
3547e88c-f08a-40a7-b563-e3e5010b1859	entidadsocial3@entidadsocial.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	entidad	2026-05-11 08:50:06.324827+00	2026-05-11 08:50:06.324827+00	\N	\N
5af2c85b-893e-405e-ace0-e5564cd45cfb	voluntario1@voluntario.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	voluntario	2026-05-11 08:50:06.294368+00	2026-05-11 08:50:06.294368+00	\N	\N
92c19043-9e3c-4a5f-bc86-bf24beb35288	voluntario2@voluntario.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	voluntario	2026-05-11 08:50:06.307325+00	2026-05-11 08:50:06.307325+00	\N	\N
02d1e4f1-d77c-419a-9e1d-1952f1f48a55	voluntario3@voluntario.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	voluntario	2026-05-11 08:50:06.31027+00	2026-05-11 08:50:06.31027+00	\N	\N
38c402b3-e578-458e-909d-2056596b4216	entidadsocial4@entidadsocial.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	entidad	2026-05-11 08:50:06.327216+00	2026-05-11 08:50:06.327216+00	\N	\N
39c37c12-42e4-461c-a8fb-c50069801b07	entidadsocial5@entidadsocial.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	entidad	2026-05-11 08:50:06.330945+00	2026-05-11 08:50:06.330945+00	\N	\N
8d451fd1-cec0-408b-95a7-102511fd964f	entidadcultural1@entidadcultural.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	empresa	2026-05-11 08:50:06.333567+00	2026-05-11 08:50:06.333567+00	\N	\N
6bc2be3e-d7d6-43ba-973e-b849bc7035f1	entidadcultural2@entidadcultural.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	empresa	2026-05-11 08:50:06.335752+00	2026-05-11 08:50:06.335752+00	\N	\N
d3020fbf-bc43-4491-ae98-16ab0106e701	entidadcultural3@entidadcultural.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	empresa	2026-05-11 08:50:06.337823+00	2026-05-11 08:50:06.337823+00	\N	\N
1cdc2c11-b756-41b0-9b3d-ee3f6109ee05	entidadcultural4@entidadcultural.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	empresa	2026-05-11 08:50:06.339847+00	2026-05-11 08:50:06.339847+00	\N	\N
09e39311-f4e8-47a2-80f3-3122af6c206f	entidadcultural5@entidadcultural.com	$2a$10$16S0JPKVx7uI8zAfqLupuuUizkzcqEMV4b/Q8QqtriMWl6Oequ0FO	empresa	2026-05-11 08:50:06.341912+00	2026-05-11 08:50:06.341912+00	\N	\N
35cd92a0-03ad-46be-b6ad-70a025e158cd	coordinadorsocial1@entidadsocial.com	$2a$10$o2EhhV0v/wHr0Jr1ouNHeucP7K3jaAwo9JPZCPzBsBIPuHIeEgOau	delegado	2026-05-11 11:35:57.391374+00	2026-05-11 11:35:57.391374+00	\N	\N
ac0d84d3-45a1-4b86-b8d4-3ff2315ea107	admin@thanksforit.com	$2a$10$flIk2ptFY1dfJivA57r9R.UMGoeUurUy3AajdOAHI/zG3cuSJvWfC	admin	2026-04-13 08:26:43.190738+00	2026-05-11 11:43:20.842418+00	\N	\N
bd99fc1d-8e9a-4e3c-befc-11a5dd0ffd59	coordinadorsocial2@entidadsocial.com	$2a$10$tDP9FVe2ezb2QNBwkqbny.PPQHfwP91GyXagWs/EkX3eBeFJ9l/E.	delegado	2026-05-12 10:18:10.617273+00	2026-05-12 10:18:10.617273+00	\N	\N
9ab12322-5cc8-4458-b157-580c45038b37	empresacultural1@empresacultural.com	$2a$10$OYnOpjVz16JSJYp13kcWaOndzlGq0hvPFNuU/HstHTULL8MZl1/Ra	empresa	2026-05-13 11:43:41.412783+00	2026-05-13 11:43:41.412783+00	\N	\N
\.


--
-- Data for Name: empresas_culturales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.empresas_culturales (id, usuario_id, nombre_empresa, cif, direccion, web, contacto_nombre, contacto_email, contacto_telefono, tipo_oferta, sistema_canje, created_at) FROM stdin;
9563f3a1-714d-4c47-8206-e7dace3ef596	9ab12322-5cc8-4458-b157-580c45038b37	Cines	B12345678	Avda Jos?? Abascal		Pablo Martinez	empresacultural11@empresacultural.com	699688677	cine	manual	2026-05-13 11:43:41.432434+00
\.


--
-- Data for Name: entidades_sociales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entidades_sociales (id, usuario_id, nombre_legal, nif, direccion, web, fecha_inscripcion, numero_registro, admin_nombre, admin_email, admin_telefono, contacto_nombre, contacto_email, contacto_telefono, documentacion_url, estado, created_at) FROM stdin;
89027711-95f2-4c4f-991a-8485970d3b18	25009d4c-64ef-477d-82b9-00f7a09601bf	Fundaci??n Entidad Social 1	1253456789A	CALLE DE LA NADA		\N	\N	ENTIDAD1	entidadsocial1@entidadsocial.com	666666666	\N	\N	\N	\N	pendiente	2026-05-11 09:27:35.545999+00
\.


--
-- Data for Name: voluntarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.voluntarios (id, usuario_id, nombre, apellidos, fecha_nacimiento, dni_nie, telefono, direccion, preferencias, acepta_rgpd, created_at) FROM stdin;
4987a6e3-bda5-4f89-a7a7-9d8db0bfdca6	30d4cf5e-bf41-4cf3-9886-15e4083f12f4	voluntario4	Apellido	1990-01-01	PEND-30d4cf5e	000000000	Sin direcci??n	\N	f	2026-05-11 09:38:47.143644+00
3ba360b6-501a-47ac-bbaf-49f816215adb	cee466da-8c59-468b-b3ec-07ae3a135b06	voluntario5	Apellido	1990-01-01	PEND-cee466da	000000000	Sin direcci??n	\N	f	2026-05-11 09:38:47.143644+00
343c29f9-3cec-473e-a715-9befa4a7f8b0	5af2c85b-893e-405e-ace0-e5564cd45cfb	voluntario1	Apellido	1990-01-01	PEND-5af2c85b	000000000	Sin direcci??n	\N	f	2026-05-11 09:38:47.143644+00
fbc411da-2473-4482-9fe4-95a699a347cd	92c19043-9e3c-4a5f-bc86-bf24beb35288	voluntario2	Apellido	1990-01-01	PEND-92c19043	000000000	Sin direcci??n	\N	f	2026-05-11 09:38:47.143644+00
9ed92e0e-9d0f-42dc-95ba-af4edd719905	02d1e4f1-d77c-419a-9e1d-1952f1f48a55	voluntario3	Apellido	1990-01-01	PEND-02d1e4f1	000000000	Sin direcci??n	\N	f	2026-05-11 09:38:47.143644+00
\.


--
-- PostgreSQL database dump complete
--

\unrestrict iGTR7Xyja6CAdJ891WdunMU8sZaX33XbfFvykg0jvvzAgVjmpnInfVbECxWGVCv

