import { Router } from 'express';
import {
  getMisHoras, registrarHoras, validarHoras,
  getHorasPendientesDelegado, aprobarHorasDelegado, rechazarHorasDelegado,
  getHorasPendientesEntidad, validarHorasEntidad, rechazarHorasEntidad
} from '../controllers/horasController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/mis-horas', authenticate, getMisHoras);
router.post('/', authenticate, registrarHoras);
router.put('/:id/validar', authenticate, validarHoras); // legado / admin

// Flujo delegado
router.get('/pendientes-delegado', authenticate, getHorasPendientesDelegado);
router.put('/:id/aprobar-delegado', authenticate, aprobarHorasDelegado);
router.put('/:id/rechazar-delegado', authenticate, rechazarHorasDelegado);

// Flujo entidad
router.get('/pendientes-entidad', authenticate, getHorasPendientesEntidad);
router.put('/:id/validar-entidad', authenticate, validarHorasEntidad);
router.put('/:id/rechazar-entidad', authenticate, rechazarHorasEntidad);

export default router;
