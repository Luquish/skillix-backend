import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as ContentOrchestrator from '../services/contentOrchestrator.service';
import * as DataConnectService from '../services/dataConnect.service';
import { 
  CreateActionStepInputSchema, 
  GenerateNextDayContentInputSchema, 
  GetDayContentParamsSchema 
} from '../services/llm/schemas';
import { createError } from '../utils/errorHandler';

/**
 * Controlador para generar el contenido del día siguiente en un plan de aprendizaje.
 */
export const generateNextDayContentController = async (req: AuthenticatedRequest, res: Response) => {
  const { learningPlanId, completedDayNumber, performanceSummary } = GenerateNextDayContentInputSchema.parse(req.body);
  
  const userId = req.user?.firebaseUid;
  if (!userId) {
    throw createError('Authentication error: User ID is missing.', 401);
  }

  const nextDayNumber = completedDayNumber + 1;
  
  const result = await ContentOrchestrator.generateAndSaveContentForDay({
    userId,
    learningPlanId,
    dayNumber: nextDayNumber,
    performanceSummary,
  });

  if (!result.success) {
    throw createError(result.message || 'Failed to generate content', result.statusCode || 500);
  }
  
  res.status(201).json({
    success: true,
    message: result.message,
    data: result.data,
  });
};

/**
 * ✅ NUEVO - Obtiene el contenido completo de un día específico
 */
export const getDayContentController = async (req: AuthenticatedRequest, res: Response) => {
  const { learningPlanId, dayNumber } = GetDayContentParamsSchema.parse(req.params);

  const user = req.user;
  if (!user) {
    throw createError('User not authenticated.', 401);
  }

  const dayNumberInt = parseInt(dayNumber, 10);

  const plan = await DataConnectService.getLearningPlanStructure(learningPlanId);
  if (!plan) {
    throw createError('Learning plan not found.', 404);
  }

  if (plan.userFirebaseUid !== user.firebaseUid) {
    throw createError('Access denied. You can only access content from your own learning plans.', 403);
  }

  const dayContent = await DataConnectService.getDayContent(learningPlanId, dayNumberInt);

  if (!dayContent) {
    throw createError(`Content for day ${dayNumber} not found.`, 404);
  }

  res.status(200).json({
    message: 'Day content retrieved successfully.',
    dayContent: dayContent,
  });
};

export const createActionStepController = async (req: AuthenticatedRequest, res: Response) => {
  const { 
    actionTaskItemId, 
    stepNumber, 
    description, 
    estimatedTimeSeconds 
  } = CreateActionStepInputSchema.parse(req.body);

  const user = req.user;
  if (!user) {
    throw createError('User not authenticated.', 401);
  }

  const actionStep = await DataConnectService.createActionStepItem({
    actionTaskItemId,
    stepNumber,
    description,
    estimatedTimeSeconds
  });

  if (!actionStep) {
    throw createError('Failed to create action step.', 500);
  }

  res.status(201).json({
    message: 'Action step created successfully.',
    actionStep: actionStep,
  });
};
