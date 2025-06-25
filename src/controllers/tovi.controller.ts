import { Response } from 'express';
import { z } from 'zod';
import { getSkiMotivationalMessage } from '../services/llm/toviTheFox.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createError } from '../utils/errorHandler';

// Helper unificado para obtener el mensaje
const getMessageForSituation = async (situation: string, user: AuthenticatedRequest['user']) => {
  if (!user) {
    throw createError('User not authenticated.', 401);
  }

  const messages = await getSkiMotivationalMessage({
    userContext: { name: user.name || 'Learner' },
    situation: situation as any, 
  });

  if (!messages) {
    throw createError(`No Tovi messages found for situation: ${situation}`, 404);
  }
  
  return messages;
};

/**
 * Maneja GET /api/tovi/messages/:situation (parámetro de ruta)
 */
export const getToviMessageFromPath = async (req: AuthenticatedRequest, res: Response) => {
  const { situation } = req.params;

  // La validación es implícita por la definición de la ruta.
  // Express no llamará a este controlador si :situation está ausente.

  const messages = await getMessageForSituation(situation, req.user);

  res.status(200).json({
    message: 'Tovi messages retrieved successfully.',
    data: messages,
  });
};

/**
 * Maneja GET /api/tovi/messages (query param)
 */
export const getToviMessageFromQuery = async (req: AuthenticatedRequest, res: Response) => {
  const SituationQuerySchema = z.object({
    situation: z.string().min(1, 'Situation query parameter is required and cannot be empty.'),
  });
  
  const validationResult = SituationQuerySchema.safeParse(req.query);

  if (!validationResult.success) {
    // Usar el primer error para el mensaje
    const firstError = validationResult.error.errors[0];
    throw createError(firstError.message, 400);
  }

  const { situation } = validationResult.data;
  const messages = await getMessageForSituation(situation, req.user);

  res.status(200).json({
    message: 'Tovi messages retrieved successfully.',
    data: messages,
  });
}; 