import { Router } from 'express';
import {
  crearDelegado,
  getDelegados,
  toggleDelegado,
  eliminarDelegado,
  getMiEntidad,
  getActividadesDelegado,
  getVoluntariosDelegado,
  getActividadesVoluntarioDelegado,
  getInscripcionesDelegado,
  actualizarMiPerfil,
  enviarMensajeADelegado,
  enviarMensajeAEntidad,
  getEquipoDelegado,
} from '../controllers/delegadosController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Rutas para la entidad (gestiona sus delegados)
router.get('/', getDelegados);
router.post('/', crearDelegado);
router.put('/:delegadoId/toggle', toggleDelegado);
router.delete('/:delegadoId', eliminarDelegado);

// Mensajería entidad ↔ delegado
router.post('/:delegadoId/mensaje', enviarMensajeADelegado);  // entidad → delegado
router.post('/mensaje-entidad', enviarMensajeAEntidad);        // delegado → entidad

// Rutas para el delegado (accede a recursos de su entidad)
router.get('/mi-entidad', getMiEntidad);
router.get('/mi-equipo', getEquipoDelegado);
router.put('/mi-perfil', actualizarMiPerfil);
router.get('/mis-actividades', getActividadesDelegado);
router.get('/mis-voluntarios', getVoluntariosDelegado);
router.get('/voluntario/:voluntarioId/actividades', getActividadesVoluntarioDelegado);
router.get('/inscripciones/:actividadId', getInscripcionesDelegado);

export default router;
