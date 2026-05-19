import { Router } from 'express';
import {
  inscribirse,
  getInscripciones,
  cancelarInscripcion,
  responderInvitacion,
  getInscripcionesActividad,
  gestionarInscripcion,
  invitarVoluntario
} from '../controllers/inscripcionesController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Voluntario
router.get('/mis-inscripciones', authenticate, getInscripciones);
router.post('/invitar/:actividadId/:voluntarioId', authenticate, invitarVoluntario); // antes que /:actividadId
router.post('/:inscripcionId/responder', authenticate, responderInvitacion);         // ✅ usa inscripcionId
router.post('/:actividadId', authenticate, inscribirse);
router.delete('/:actividadId', authenticate, cancelarInscripcion);

// Entidad
router.get('/actividad/:actividadId', authenticate, getInscripcionesActividad);
router.put('/gestionar/:inscripcionId', authenticate, gestionarInscripcion);

export default router;
