import { Router } from 'express';
import { 
  getUserStatsController,
  getUserStreakController,
  getUserXPController
} from '../controllers/user.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/user/stats
 * @desc    Obtiene estadísticas completas del usuario (streak, XP, progreso)
 * @access  Private (Requiere token de Firebase)
 */
router.get('/stats', isAuthenticated, getUserStatsController);

/**
 * @route   GET /api/user/streak
 * @desc    Obtiene datos de streak del usuario
 * @access  Private (Requiere token de Firebase)
 */
router.get('/streak', isAuthenticated, getUserStreakController);

/**
 * @route   GET /api/user/xp
 * @desc    Obtiene el XP total acumulado del usuario
 * @access  Private (Requiere token de Firebase)
 */
router.get('/xp', isAuthenticated, getUserXPController);

export default router; 