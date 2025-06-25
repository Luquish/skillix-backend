import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import * as UserController from '../controllers/user.controller';
import { asyncHandler } from '../utils/errorHandler';

const router = Router();

/**
 * @route   GET /api/user/stats
 * @desc    Obtiene estadísticas completas del usuario (streak, XP, progreso)
 * @access  Private (Requiere token de Firebase)
 */
router.get('/stats', isAuthenticated, asyncHandler(UserController.getUserStatsController));

/**
 * @route   GET /api/user/streak
 * @desc    Obtiene datos de streak del usuario
 * @access  Private (Requiere token de Firebase)
 */
router.get('/streak', isAuthenticated, asyncHandler(UserController.getUserStreakController));

/**
 * @route   GET /api/user/xp
 * @desc    Obtiene el XP total acumulado del usuario
 * @access  Private (Requiere token de Firebase)
 */
router.get('/xp', isAuthenticated, asyncHandler(UserController.getUserXPController));

/**
 * @route   GET /api/user/progress
 * @desc    Obtiene el progreso completo del usuario (enrollments + streak)
 * @access  Private (Requiere token de Firebase)
 */
router.get('/progress', isAuthenticated, asyncHandler(UserController.getUserProgressController));

/**
 * @route   GET /api/user/analytics
 * @desc    Obtiene los analytics del usuario
 * @access  Private (Requiere token de Firebase)
 */
router.get('/analytics', isAuthenticated, asyncHandler(UserController.getUserAnalyticsController));

// Obtener el perfil del usuario autenticado
router.get('/profile', isAuthenticated, asyncHandler(UserController.getUserProfile));

// Actualizar el perfil del usuario autenticado
router.put('/profile', isAuthenticated, asyncHandler(UserController.updateUserProfile));

// Eliminar la cuenta del usuario autenticado
router.delete('/profile', isAuthenticated, asyncHandler(UserController.deleteUser));

export default router; 