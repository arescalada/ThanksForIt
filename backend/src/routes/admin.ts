import { Router } from 'express';
import {
  getEstadisticas,
  getUsuarios,
  getHorasPendientes,
  validarHoras,
  rechazarHoras
} from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/estadisticas', getEstadisticas);
router.get('/usuarios', getUsuarios);
router.get('/horas-pendientes', getHorasPendientes);
router.put('/horas/:id/validar', validarHoras);
router.put('/horas/:id/rechazar', rechazarHoras);

export default router;
