import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as DataConnectService from '../services/dataConnect.service';
import { z } from 'zod';
import * as FirebaseService from '../services/firebase.service';
import { createError } from '../utils/errorHandler';
import { DbUser } from '../services/dataConnect.types';

const assertUserAuthenticated = (user: AuthenticatedRequest['user']): DbUser => {
  if (!user || !('firebaseUid' in user)) {
    throw createError('User not authenticated or is not a valid DB user profile.', 401);
  }
  return user as DbUser;
};

/**
 * Obtiene estadísticas completas del usuario (streak, XP, progreso)
 */
export const getUserStatsController = async (req: AuthenticatedRequest, res: Response) => {
  const user = assertUserAuthenticated(req.user);

  const [currentPlan, streakData, totalXP] = await Promise.all([
    DataConnectService.getCurrentUserLearningPlan(user.firebaseUid),
    DataConnectService.getUserStreak(user.firebaseUid),
    DataConnectService.calculateUserXP(user.firebaseUid)
  ]);

  let progress = 0;
  let completedDays = 0;
  let totalDays = 0;
  if (currentPlan?.sections) {
    currentPlan.sections.forEach(section => {
      if (section.days) {
        totalDays += section.days.length;
        completedDays += section.days.filter(day => day.completionStatus === 'COMPLETED').length;
      }
    });
    progress = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  }

  res.status(200).json({
    message: 'User stats retrieved successfully',
    stats: {
      streak: {
        current: streakData?.currentStreak || 0,
        longest: streakData?.longestStreak || 0,
        lastContribution: streakData?.lastContributionDate || null
      },
      xp: {
        total: totalXP.total,
        daily_average: totalXP.total > 0 && completedDays > 0 ? Math.round(totalXP.total / completedDays) : 0
      },
      progress: {
        percentage: progress,
        completed_days: completedDays,
        total_days: totalDays
      },
      current_plan: currentPlan ? {
        id: currentPlan.id,
        skill_name: currentPlan.skillName,
        duration_weeks: currentPlan.totalDurationWeeks,
        daily_time_minutes: currentPlan.dailyTimeMinutes
      } : null
    }
  });
};

/**
 * Obtiene datos de streak del usuario
 */
export const getUserStreakController = async (req: AuthenticatedRequest, res: Response) => {
  const user = assertUserAuthenticated(req.user);
  const streakData = await DataConnectService.getUserStreak(user.firebaseUid);
  if (!streakData) {
    throw createError('No streak data found for user.', 404);
  }
  res.status(200).json({
    message: 'Streak data retrieved successfully',
    streak: {
      current: streakData.currentStreak,
      longest: streakData.longestStreak,
      last_contribution_date: streakData.lastContributionDate
    }
  });
};

/**
 * Obtiene el XP total acumulado del usuario
 */
export const getUserXPController = async (req: AuthenticatedRequest, res: Response) => {
  const user = assertUserAuthenticated(req.user);
  const totalXP = await DataConnectService.calculateUserXP(user.firebaseUid);
  res.status(200).json({
    message: 'User XP retrieved successfully',
    xp: {
      total: totalXP,
      breakdown: await DataConnectService.getUserXPBreakdown(user.firebaseUid)
    }
  });
};

/**
 * ✅ NUEVO - Obtiene el progreso completo del usuario (enrollments + streak)
 */
export const getUserProgressController = async (req: AuthenticatedRequest, res: Response) => {
  const user = assertUserAuthenticated(req.user);
  const progressData = await DataConnectService.getUserProgress(user.firebaseUid);
  if (!progressData) {
    throw createError('No progress data found for user.', 404);
  }
  res.status(200).json({
    message: 'User progress retrieved successfully',
    progress: progressData
  });
};

/**
 * ✅ NUEVO - Obtiene los analytics del usuario
 */
export const getUserAnalyticsController = async (req: AuthenticatedRequest, res: Response) => {
  const user = assertUserAuthenticated(req.user);
  const analyticsData = await DataConnectService.getUserAnalytics(user.firebaseUid);
  if (!analyticsData) {
    throw createError('No analytics data found for user.', 404);
  }
  res.status(200).json({
    message: 'User analytics retrieved successfully',
    analytics: analyticsData
  });
};

// --- NUEVAS FUNCIONES DE PERFIL DE USUARIO ---

// Schema para la validación de la actualización del perfil
const UpdateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long.').optional(),
  language: z.string().optional(),
  learningObjective: z.string().optional(),
}).strict(); // No permitir campos adicionales

/**
 * Obtiene el perfil del usuario autenticado.
 */
export const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  const user = assertUserAuthenticated(req.user);
  res.status(200).json({
    message: 'Profile retrieved successfully.',
    profile: user,
  });
};

/**
 * Actualiza el perfil del usuario autenticado.
 */
export const updateUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  const user = assertUserAuthenticated(req.user);
  const validatedData = UpdateProfileSchema.parse(req.body);
  const updatedUser = await DataConnectService.updateUser(user.firebaseUid, validatedData);
  res.status(200).json({
    message: 'Profile updated successfully.',
    profile: updatedUser,
  });
};

/**
 * Elimina la cuenta del usuario autenticado.
 */
export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  const user = assertUserAuthenticated(req.user);
  await FirebaseService.deleteFirebaseUser(user.firebaseUid);
  await DataConnectService.deleteUser(user.firebaseUid);
  res.status(200).json({ message: 'User account deleted successfully.' });
};
