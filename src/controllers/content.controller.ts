import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as ContentOrchestrator from '../services/contentOrchestrator.service';

/**
 * Controlador para generar el contenido del día siguiente en un plan de aprendizaje.
 */
export const generateNextDayContentController = async (req: AuthenticatedRequest, res: Response) => {
  const { learningPlanId, completedDayNumber } = req.body;
  
  // El ID de usuario de nuestra DB se adjunta a la request por el middleware isAuthenticated
  const userId = req.user?.id;

  if (!userId) {
    // Esta comprobación es una salvaguarda, el middleware ya debería haberlo manejado.
    return res.status(401).json({ message: 'Authentication error: User ID is missing.' });
  }

  if (!learningPlanId || typeof completedDayNumber !== 'number') {
    return res.status(400).json({ message: 'Request body must include "learningPlanId" (string) and "completedDayNumber" (number).' });
  }

  try {
    const nextDayNumber = completedDayNumber + 1;
    
    // Delegamos toda la lógica compleja al servicio orquestador.
    // Esto mantiene el controlador limpio y centrado en manejar la solicitud/respuesta HTTP.
    const result = await ContentOrchestrator.generateAndSaveContentForDay({
      userId,
      learningPlanId,
      dayNumber: nextDayNumber,
      performanceSummary: req.body.performanceSummary, // Opcional, puede ser undefined
    });

    if (!result.success) {
      // Si el orquestador devuelve un error controlado, lo usamos para la respuesta.
      return res.status(result.statusCode || 500).json({ message: result.message });
    }
    
    // Si todo va bien, devolvemos un 201 Created con el contenido generado.
    res.status(201).json({
      message: result.message,
      generatedContent: result.data,
    });

  } catch (error: any) {
    console.error(`CRITICAL: Unhandled error in generateNextDayContentController for plan ${learningPlanId}, user ${userId}. Error: ${error.message}`, { stack: error.stack });
    res.status(500).json({ message: 'An unexpected server error occurred while generating content.' });
  }
};
