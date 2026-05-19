import { Router } from 'express';
import {
  getPerfilEntidad,
  guardarPerfilEntidad,
  getMisActividades,
  crearActividad,
  getEntidadesPublicas,
  getSolicitudesVoluntarios,
  getTodosVoluntarios,
  getActividadesVoluntario,
  gestionarVoluntario,
  getDelegadosParaActividad
} from '../controllers/entidadesController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Perfil y actividades
router.get('/mi-perfil', authenticate, getPerfilEntidad);
router.post('/perfil', authenticate, guardarPerfilEntidad);
router.get('/mis-actividades', authenticate, getMisActividades);
router.post('/actividades', authenticate, crearActividad);

// Lista pública de entidades (sin login, para el registro de voluntarios)
router.get('/publicas', getEntidadesPublicas);

// Gestión de voluntarios
router.get('/solicitudes-voluntarios', authenticate, getSolicitudesVoluntarios);
router.get('/todos-voluntarios', authenticate, getTodosVoluntarios);
router.get('/voluntario/:voluntarioId/actividades', authenticate, getActividadesVoluntario);
router.post('/voluntarios/:voluntarioId/:accion', authenticate, gestionarVoluntario);

// Delegados disponibles para asignar a actividades
router.get('/delegados-actividad', authenticate, getDelegadosParaActividad);

export default router;
