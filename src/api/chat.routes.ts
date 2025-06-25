import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import * as ChatController from '../controllers/chat.controller';
import { asyncHandler } from '../utils/errorHandler';

const router = Router();

/**
 * @route   POST /api/chat/start
 * @desc    Inicia una nueva conversación de chat
 * @access  Private (Requiere token de Firebase)
 * @status  🚧 PLACEHOLDER - No implementado aún
 */
router.post(
  '/start', 
  isAuthenticated, 
  asyncHandler(ChatController.startChatSession)
);

/**
 * @route   POST /api/chat/message
 * @desc    Envía un mensaje en el chat
 * @access  Private (Requiere token de Firebase)
 * @body    { message: string }
 * @status  🚧 PLACEHOLDER - No implementado aún
 */
router.post(
  '/message', 
  isAuthenticated, 
  asyncHandler(ChatController.postChatMessage)
);

export default router;
