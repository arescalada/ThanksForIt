import { Router } from 'express';
import { solicitarRecuperacion, resetearPassword } from '../controllers/passwordController';

const router = Router();
router.post('/solicitar', solicitarRecuperacion);
router.post('/reset', resetearPassword);
export default router;
