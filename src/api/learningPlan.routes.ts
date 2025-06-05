import { Router } from 'express';
import { createLearningPlanController } from '../controllers/learningPlan.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/learning-plan/create
 * @desc    Crea un nuevo plan de aprendizaje completo para el usuario autenticado.
 * @access  Private (Requiere token de Firebase)
 */
router.post('/create', isAuthenticated, createLearningPlanController);

export default router;
