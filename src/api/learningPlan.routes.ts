import { Router } from 'express';
import * as LearningPlanController from '../controllers/learningPlan.controller';
import { isAuthenticated } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/errorHandler';

const router = Router();

/**
 * @route   POST /api/learning-plan/create
 * @desc    Crea un nuevo plan de aprendizaje completo para el usuario autenticado.
 * @access  Private (Requiere token de Firebase)
 */
router.post('/create', isAuthenticated, asyncHandler(LearningPlanController.createLearningPlanController));

/**
 * @route   GET /api/learning-plan/current
 * @desc    Obtiene el plan de aprendizaje actual del usuario autenticado.
 * @access  Private (Requiere token de Firebase)
 */
router.get('/current', isAuthenticated, asyncHandler(LearningPlanController.getCurrentLearningPlanController));

/**
 * @route   GET /api/learning-plan/:id
 * @desc    Obtiene un plan de aprendizaje específico por ID.
 * @access  Private (Requiere token de Firebase)
 */
router.get('/:id', isAuthenticated, asyncHandler(LearningPlanController.getLearningPlanByIdController));

/**
 * @route   GET /api/learning-plan/user/enrollments
 * @desc    Obtiene todas las inscripciones del usuario autenticado.
 * @access  Private (Requiere token de Firebase)
 */
router.get('/user/enrollments', isAuthenticated, asyncHandler(LearningPlanController.getUserEnrollmentsController));

/**
 * @route   GET /api/learning-plan/user/plans
 * @desc    Obtiene todos los planes de aprendizaje del usuario autenticado.
 * @access  Private (Requiere token de Firebase)
 */
router.get('/user/plans', isAuthenticated, asyncHandler(LearningPlanController.getUserLearningPlansController));

/**
 * @route   POST /api/learning-plan/enroll
 * @desc    Crea una nueva inscripción para el usuario autenticado.
 * @access  Private (Requiere token de Firebase)
 */
router.post('/enroll', isAuthenticated, asyncHandler(LearningPlanController.enrollInLearningPlanController));

export default router;
