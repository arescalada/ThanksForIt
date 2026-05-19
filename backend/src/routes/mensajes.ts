import { Router } from 'express';
import {
  getMisMensajes,
  getNoLeidos,
  getNoLeidosChat,
  enviarMensaje,
  marcarLeido,
  eliminarMensaje,
  getConversacion,
  getConversaciones,
  enviarDirecto,
  getConversacionActividad,
  enviarMensajeActividad,
  getConversacionesActividad,
} from '../controllers/mensajesController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Bandeja de entrada
router.get('/', getMisMensajes);
router.get('/no-leidos', getNoLeidos);
router.get('/no-leidos-chat', getNoLeidosChat);
router.post('/', enviarMensaje);
router.put('/:id/leido', marcarLeido);
router.delete('/:id', eliminarMensaje);

// Chat directo entre dos usuarios
router.get('/conversaciones', getConversaciones);
router.get('/conversacion/:otroUsuarioId', getConversacion);
router.post('/directo', enviarDirecto);

// Chat por actividad
router.get('/actividad-chats', getConversacionesActividad);
router.get('/actividad/:actividadId/:otroUsuarioId', getConversacionActividad);
router.post('/actividad', enviarMensajeActividad);

export default router;
