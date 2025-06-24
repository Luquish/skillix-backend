import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { 
  startChatController,
  sendMessageController
} from '../controllers/chat.controller';

const router = Router();

/**
 * @route   POST /api/chat/start
 * @desc    Inicia una nueva conversación de chat
 * @access  Private (Requiere token de Firebase)
 * @status  🚧 PLACEHOLDER - No implementado aún
 */
router.post('/start', isAuthenticated, startChatController);

/**
 * @route   POST /api/chat/message
 * @desc    Envía un mensaje en el chat
 * @access  Private (Requiere token de Firebase)
 * @body    { message: string }
 * @status  🚧 PLACEHOLDER - No implementado aún
 */
router.post('/message', isAuthenticated, sendMessageController);

export default router;
