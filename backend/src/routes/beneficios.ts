import { Router } from 'express';
import {
  getBeneficios,
  createBeneficio,
  generarCanje,
  validarCanje,
  marcarCanjeUtilizado,
  getMisCanjes
} from '../controllers/beneficiosController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/beneficios
 * @desc    Obtener lista de beneficios culturales
 * @access  Public
 * @query   empresa_id, disponible_para_usuario
 */
router.get('/', getBeneficios);

/**
 * @route   POST /api/beneficios
 * @desc    Crear nuevo beneficio cultural
 * @access  Private (solo empresas culturales)
 */
router.post('/', authenticate, authorize('empresa_cultural'), createBeneficio);

/**
 * @route   POST /api/beneficios/canje
 * @desc    Generar código de canje para un beneficio
 * @access  Private (solo voluntarios)
 */
router.post('/canje', authenticate, authorize('voluntario'), generarCanje);

/**
 * @route   POST /api/beneficios/validar-canje
 * @desc    Validar código de canje
 * @access  Private (empresas culturales)
 */
router.post('/validar-canje', authenticate, authorize('empresa_cultural'), validarCanje);

/**
 * @route   POST /api/beneficios/usar-canje
 * @desc    Marcar código de canje como utilizado
 * @access  Private (empresas culturales)
 */
router.post('/usar-canje', authenticate, authorize('empresa_cultural'), marcarCanjeUtilizado);

/**
 * @route   GET /api/beneficios/mis-canjes
 * @desc    Obtener historial de canjes del voluntario
 * @access  Private (solo voluntarios)
 */
router.get('/mis-canjes', authenticate, authorize('voluntario'), getMisCanjes);

export default router;
