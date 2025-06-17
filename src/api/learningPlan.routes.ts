import { Router } from 'express';
import { 
  createLearningPlanController,
  getCurrentLearningPlanController,
  getLearningPlanByIdController
} from '../controllers/learningPlan.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/learning-plan/create
 * @desc    Crea un nuevo plan de aprendizaje completo para el usuario autenticado.
 * @access  Private (Requiere token de Firebase)
 */
router.post('/create', isAuthenticated, createLearningPlanController);

/**
 * @route   GET /api/learning-plan/current
 * @desc    Obtiene el plan de aprendizaje actual del usuario autenticado.
 * @access  Private (Requiere token de Firebase)
 */
router.get('/current', isAuthenticated, getCurrentLearningPlanController);

/**
 * @route   GET /api/learning-plan/:id
 * @desc    Obtiene un plan de aprendizaje específico por ID.
 * @access  Private (Requiere token de Firebase)
 */
router.get('/:id', isAuthenticated, getLearningPlanByIdController);

export default router;
