import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as DataConnectService from '../services/dataConnect.service';

/**
 * Obtiene estadísticas completas del usuario (streak, XP, progreso)
 */
export const getUserStatsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    // Obtener datos del plan actual
    const currentPlan = await DataConnectService.getCurrentUserLearningPlan(user.firebaseUid);
    
    // Obtener datos de streak
    const streakData = await DataConnectService.getUserStreakData(user.firebaseUid);
    
    // Calcular XP total
    const totalXP = await DataConnectService.calculateUserTotalXP(user.firebaseUid);

    // Calcular progreso general
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
          total: totalXP,
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in getUserStatsController:', errorMessage);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Obtiene datos de streak del usuario
 */
export const getUserStreakController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }
    
    const streakData = await DataConnectService.getUserStreakData(user.firebaseUid);
    
    if (!streakData) {
      return res.status(404).json({ 
        message: 'No streak data found for user.' 
      });
    }

    res.status(200).json({
      message: 'Streak data retrieved successfully',
      streak: {
        current: streakData.currentStreak,
        longest: streakData.longestStreak,
        last_contribution_date: streakData.lastContributionDate
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in getUserStreakController:', errorMessage);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Obtiene el XP total acumulado del usuario
 */
export const getUserXPController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }
    
    const totalXP = await DataConnectService.calculateUserTotalXP(user.firebaseUid);

    res.status(200).json({
      message: 'User XP retrieved successfully',
      xp: {
        total: totalXP,
        breakdown: await DataConnectService.getUserXPBreakdown(user.firebaseUid)
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in getUserXPController:', errorMessage);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * ✅ NUEVO - Obtiene el progreso completo del usuario (enrollments + streak)
 */
export const getUserProgressController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }
    
    const progressData = await DataConnectService.getUserProgress(user.firebaseUid);
    
    if (!progressData) {
      return res.status(404).json({ 
        message: 'No progress data found for user.' 
      });
    }

    res.status(200).json({
      message: 'User progress retrieved successfully',
      progress: progressData
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in getUserProgressController:', errorMessage);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * ✅ NUEVO - Obtiene los analytics del usuario
 */
export const getUserAnalyticsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }
    
    const analyticsData = await DataConnectService.getUserAnalytics(user.firebaseUid);
    
    if (!analyticsData) {
      return res.status(404).json({ 
        message: 'No analytics data found for user.' 
      });
    }

    res.status(200).json({
      message: 'User analytics retrieved successfully',
      analytics: analyticsData
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in getUserAnalyticsController:', errorMessage);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
