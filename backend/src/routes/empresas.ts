import { Router } from 'express';
import { getPerfilEmpresa, guardarPerfilEmpresa, getMisBeneficios, crearBeneficio } from '../controllers/empresasController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/mi-perfil', authenticate, getPerfilEmpresa);
router.post('/perfil', authenticate, guardarPerfilEmpresa);
router.get('/mis-beneficios', authenticate, getMisBeneficios);
router.post('/beneficios', authenticate, crearBeneficio);

export default router;
