import { Router } from 'express';
import {
  guardarPerfilVoluntario,
  getPerfilVoluntario,
  solicitarEntidades,
  getTodosVoluntarios
} from '../controllers/voluntariosController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/perfil', authenticate, getPerfilVoluntario);
router.post('/perfil', authenticate, guardarPerfilVoluntario);
router.post('/solicitar-entidades', authenticate, solicitarEntidades);
router.get('/todos', authenticate, getTodosVoluntarios);

export default router;
