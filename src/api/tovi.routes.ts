import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { 
  getToviMessagesController,
  getToviMessagesBySituationController
} from '../controllers/tovi.controller';

const router = Router();

/**
 * @route   GET /api/tovi/messages/:situation
 * @desc    Obtiene los mensajes de Tovi para una situación específica (path param)
 * @access  Private (Requiere token de Firebase)
 * @params  situation: string
 */
router.get('/messages/:situation', isAuthenticated, getToviMessagesController);

/**
 * @route   GET /api/tovi/messages
 * @desc    Obtiene los mensajes de Tovi para una situación específica (query param)
 * @access  Private (Requiere token de Firebase)
 * @query   situation: string
 */
router.get('/messages', isAuthenticated, getToviMessagesBySituationController);

export default router; 