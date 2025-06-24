import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { 
  generateNextDayContentController,
  getDayContentController,
  createActionStepController
} from '../controllers/content.controller';

const router = Router();

/**
 * @route   POST /api/content/generate-next
 * @desc    Genera el contenido para el siguiente día de un plan de aprendizaje.
 * @access  Private
 * @body    { learningPlanId: string, completedDayNumber: number, performanceSummary?: string }
 * 
 * Este endpoint se activa cuando un usuario completa un día.
 * Valida que el usuario sea el propietario del plan, calcula el día siguiente,
 * y orquesta la generación y guardado del nuevo contenido a través del LLM.
 */
router.post(
  '/generate-next',
  isAuthenticated,
  generateNextDayContentController
);

/**
 * @route   GET /api/content/day/:learningPlanId/:dayNumber
 * @desc    Obtiene el contenido completo de un día específico.
 * @access  Private
 * @params  learningPlanId: string, dayNumber: number
 */
router.get(
  '/day/:learningPlanId/:dayNumber',
  isAuthenticated,
  getDayContentController
);

/**
 * @route   POST /api/content/action-step
 * @desc    Crea un nuevo paso de acción para una tarea.
 * @access  Private
 * @body    { actionTaskItemId: string, stepNumber: number, description: string, estimatedTimeSeconds: number }
 */
router.post(
  '/action-step',
  isAuthenticated,
  createActionStepController
);

export default router;
