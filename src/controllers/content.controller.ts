import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as ContentOrchestrator from '../services/contentOrchestrator.service';
import * as DataConnectService from '../services/dataConnect.service';

/**
 * Controlador para generar el contenido del día siguiente en un plan de aprendizaje.
 */
export const generateNextDayContentController = async (req: AuthenticatedRequest, res: Response) => {
  const { learningPlanId, completedDayNumber } = req.body;
  
  // El ID de usuario de nuestra DB se adjunta a la request por el middleware isAuthenticated
  const userId = req.user?.firebaseUid;

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
      success: true,
      message: result.message,
      data: result.data,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`CRITICAL: Unhandled error in generateNextDayContentController for plan ${learningPlanId}, user ${userId}.`, errorMessage);
    res.status(500).json({ message: 'An unexpected server error occurred while generating content.' });
  }
};

/**
 * ✅ NUEVO - Obtiene el contenido completo de un día específico
 */
export const getDayContentController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    const { learningPlanId, dayNumber } = req.params;

    if (!learningPlanId || !dayNumber) {
      return res.status(400).json({ message: 'Learning plan ID and day number are required.' });
    }

    const dayNumberInt = parseInt(dayNumber, 10);
    if (isNaN(dayNumberInt)) {
      return res.status(400).json({ message: 'Day number must be a valid integer.' });
    }

    // Verificar que el usuario tiene acceso al plan
    const plan = await DataConnectService.getLearningPlanStructureById(learningPlanId);
    if (!plan) {
      return res.status(404).json({ message: 'Learning plan not found.' });
    }

    if (plan.userFirebaseUid !== user.firebaseUid) {
      return res.status(403).json({ 
        message: 'Access denied. You can only access content from your own learning plans.' 
      });
    }

    const dayContent = await DataConnectService.getDayContent(learningPlanId, dayNumberInt);

    if (!dayContent) {
      return res.status(404).json({ 
        message: `Content for day ${dayNumber} not found.` 
      });
    }

    res.status(200).json({
      message: 'Day content retrieved successfully.',
      dayContent: dayContent,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in getDayContentController:', errorMessage);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * ✅ NUEVO - Crea un nuevo paso de acción para una tarea
 */
export const createActionStepController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    const { actionTaskItemId, stepNumber, description, estimatedTimeSeconds } = req.body;

    if (!actionTaskItemId || !stepNumber || !description || !estimatedTimeSeconds) {
      return res.status(400).json({ 
        message: 'actionTaskItemId, stepNumber, description, and estimatedTimeSeconds are required.' 
      });
    }

    const actionStep = await DataConnectService.createActionStepItem({
      actionTaskItemId,
      stepNumber,
      description,
      estimatedTimeSeconds
    });

    if (!actionStep) {
      return res.status(500).json({ message: 'Failed to create action step.' });
    }

    res.status(201).json({
      message: 'Action step created successfully.',
      actionStep: actionStep,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in createActionStepController:', errorMessage);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
