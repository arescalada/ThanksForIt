import { Router } from 'express';
import {
  getActividades,
  createActividad,
  getActividadById,
  updateActividad,
  deleteActividad,
  getMisActividades,
} from '../controllers/actividadesController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/mis-actividades', authenticate, getMisActividades);
router.get('/', getActividades);
router.get('/:id', getActividadById);
router.post('/', authenticate, authorize('entidad_social'), createActividad);
router.put('/:id', authenticate, updateActividad);
router.delete('/:id', authenticate, authorize('entidad_social'), deleteActividad);

export default router;
