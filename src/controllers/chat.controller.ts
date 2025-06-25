import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createError } from '../utils/errorHandler';

const ChatMessageSchema = z.object({
  message: z.string().min(1, 'Message content cannot be empty.'),
});

/**
 * @description Inicia una nueva sesión de chat.
 * @status 🚧 PLACEHOLDER - No implementado aún
 */
export const startChatSession = async (req: AuthenticatedRequest, res: Response) => {
  // Lógica futura: crear un nuevo hilo/sesión de chat en la base de datos
  throw createError('Not Implemented', 501);
};

/**
 * @description Envía un mensaje en una sesión de chat existente.
 * @status 🚧 PLACEHOLDER - No implementado aún
 */
export const postChatMessage = async (req: AuthenticatedRequest, res: Response) => {
  ChatMessageSchema.parse(req.body);
  // Lógica futura: recibir el mensaje, procesarlo con el LLM y devolver la respuesta
  throw createError('Not Implemented', 501);
};
