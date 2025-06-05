import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { generateNextDayContentController } from '../controllers/content.controller';

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

export default router;
