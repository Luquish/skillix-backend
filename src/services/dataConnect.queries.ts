// src/services/dataConnect.queries.ts
// Queries de Data Connect usando Firebase Admin SDK

import { getDataConnect } from './firebase.service';
import logger from '../utils/logger';
import * as Types from './dataConnect.types';

// --- QUERY FUNCTIONS ---

/**
 * GetUserByFirebaseUid - Obtiene un usuario por su Firebase UID
 */
export const getUserByFirebaseUid = async (firebaseUid: string): Promise<Types.DbUser | null> => {
  try {
    logger.info(`[Admin SDK] Getting user by Firebase UID: ${firebaseUid}`);
    
    const dc = getDataConnect();
    const query = `
      query GetUserByFirebaseUid($firebaseUid: String!) {
        user(key: { firebaseUid: $firebaseUid }) {
          firebaseUid
          email
          name
          authProvider
          platform
          photoUrl
          emailVerified
          appleUserIdentifier
          fcmTokens
          createdAt
          updatedAt
        }
      }`;
    
    const response = await dc.executeGraphql(query, { variables: { firebaseUid } });
    return (response as any).data.user as Types.DbUser ?? null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error getting user by Firebase UID: ${errorMessage}`);
    throw error;
  }
};

/**
 * GetLearningPlanStructure - Obtiene la estructura completa de un plan de aprendizaje
 */
export const getLearningPlanStructure = async (learningPlanId: string): Promise<any | null> => {
  try {
    logger.info(`[Admin SDK] Getting learning plan structure: ${learningPlanId}`);
    
    const dc = getDataConnect();
    const query = `
      query GetLearningPlanStructure($learningPlanId: UUID!) {
        learningPlans(where: { id: { eq: $learningPlanId } }) {
          id
          userFirebaseUid
          skillName
          sections: planSections_on_learningPlan {
            id
            title
            order
            days: dayContents_on_section {
              id
              dayNumber
              title
              focusArea
              isActionDay
              objectives
              completionStatus
            }
          }
          skillAnalysis: skillAnalysis_on_learningPlan {
            skillCategory
            marketDemand
            isSkillValid
            learningPathRecommendation
            realWorldApplications
            complementarySkills
            components: skillComponentDatas_on_skillAnalysis {
              name
              description
              difficultyLevel
              prerequisitesText
              estimatedLearningHours
              practicalApplications
              order
            }
          }
        }
      }`;
    
    const response = await dc.executeGraphql(query, { variables: { learningPlanId } });
    return (response as any).data.learningPlans?.[0] ?? null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error getting learning plan structure: ${errorMessage}`);
    throw error;
  }
};

/**
 * GetCurrentUserLearningPlan - Obtiene el plan activo más reciente del usuario
 */
export const getCurrentUserLearningPlan = async (userFirebaseUid: string): Promise<any | null> => {
  try {
    logger.info(`[Admin SDK] Getting current user learning plan: ${userFirebaseUid}`);
    
    const dc = getDataConnect();
    const query = `
      query GetCurrentUserLearningPlan($userFirebaseUid: String!) {
        learningPlans(
          where: { 
            userFirebaseUid: { eq: $userFirebaseUid }
          }
          orderBy: { generatedAt: DESC }
          limit: 1
        ) {
          id
          userFirebaseUid
          skillName
          generatedAt
          totalDurationWeeks
          dailyTimeMinutes
          skillLevelTarget
          milestones
          progressMetrics
          flexibilityOptions
          sections: planSections_on_learningPlan {
            id
            title
            order
            days: dayContents_on_section {
              id
              dayNumber
              title
              focusArea
              isActionDay
              objectives
              completionStatus
            }
          }
          skillAnalysis: skillAnalysis_on_learningPlan {
            skillCategory
            marketDemand
            isSkillValid
            learningPathRecommendation
            realWorldApplications
            complementarySkills
            components: skillComponentDatas_on_skillAnalysis {
              name
              description
              difficultyLevel
              prerequisitesText
              estimatedLearningHours
              practicalApplications
              order
            }
          }
        }
      }`;
    
    const response = await dc.executeGraphql(query, { variables: { userFirebaseUid } });
    return (response as any).data.learningPlans?.[0] ?? null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error getting current user learning plan: ${errorMessage}`);
    throw error;
  }
};

/**
 * GetUserFcmTokens - Obtiene los tokens FCM de un usuario
 */
export const getUserFcmTokens = async (firebaseUid: string): Promise<string[] | null> => {
  try {
    logger.info(`[Admin SDK] Getting user FCM tokens: ${firebaseUid}`);
    
    const dc = getDataConnect();
    const query = `
      query GetUserFcmTokens($firebaseUid: String!) {
        user(key: { firebaseUid: $firebaseUid }) {
          fcmTokens
        }
      }`;
    
    const response = await dc.executeGraphql(query, { variables: { firebaseUid } });
    return (response as any).data.user?.fcmTokens ?? null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error getting user FCM tokens: ${errorMessage}`);
    throw error;
  }
};

/**
 * GetUserStreak - Obtiene los datos de streak del usuario
 */
export const getUserStreak = async (userFirebaseUid: string): Promise<Types.DbStreakData | null> => {
  try {
    logger.info(`[Admin SDK] Getting user streak: ${userFirebaseUid}`);
    
    const dc = getDataConnect();
    const query = `
      query GetUserStreak($userFirebaseUid: String!) {
        streakData(key: { userFirebaseUid: $userFirebaseUid }) {
          currentStreak
          longestStreak
          lastContributionDate
        }
      }`;
    
    const response = await dc.executeGraphql(query, { variables: { userFirebaseUid } });
    return (response as any).data.streakData as Types.DbStreakData ?? null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error getting user streak: ${errorMessage}`);
    throw error;
  }
};

/**
 * CalculateUserXP - Calcula el XP total del usuario
 */
export const calculateUserXP = async (userFirebaseUid: string): Promise<Types.UserXPBreakdown> => {
  try {
    logger.info(`[Admin SDK] Calculating user XP: ${userFirebaseUid}`);
    
    const dc = getDataConnect();
    const query = `
      query CalculateUserXP($userFirebaseUid: String!) {
        mainContentItems(
          where: { 
            dayContent: { 
              section: { 
                learningPlan: { 
                  userFirebaseUid: { eq: $userFirebaseUid }
                }
              },
              completionStatus: { eq: "COMPLETED" }
            }
          }
        ) {
          xp
        }
        
        actionTaskItems(
          where: { 
            dayContent: { 
              section: { 
                learningPlan: { 
                  userFirebaseUid: { eq: $userFirebaseUid }
                }
              },
              completionStatus: { eq: "COMPLETED" }
            }
          }
        ) {
          xp
        }
        
        contentBlockItems(
          where: { 
            dayContent: { 
              section: { 
                learningPlan: { 
                  userFirebaseUid: { eq: $userFirebaseUid }
                }
              },
              completionStatus: { eq: "COMPLETED" }
            }
          }
        ) {
          xp
        }
      }`;
    
    const response = await dc.executeGraphql(query, { variables: { userFirebaseUid } });
    const data = (response as any).data;
    
    const mainContent = data.mainContentItems?.reduce((sum: number, item: any) => sum + (item.xp || 0), 0) || 0;
    const actionTasks = data.actionTaskItems?.reduce((sum: number, item: any) => sum + (item.xp || 0), 0) || 0;
    const exercises = data.contentBlockItems?.reduce((sum: number, item: any) => sum + (item.xp || 0), 0) || 0;
    
    const breakdown: Types.UserXPBreakdown = {
      mainContent,
      actionTasks,
      exercises,
      total: mainContent + actionTasks + exercises
    };
    
    logger.info(`[Admin SDK] XP calculated for user ${userFirebaseUid}:`, breakdown);
    return breakdown;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error calculating user XP: ${errorMessage}`);
    throw error;
  }
};

/**
 * GetDayContent - Obtiene el contenido de un día específico
 */
export const getDayContent = async (learningPlanId: string, dayNumber: number): Promise<any | null> => {
  try {
    logger.info(`[Admin SDK] Getting day content: Plan ${learningPlanId}, Day ${dayNumber}`);
    
    const dc = getDataConnect();
    const query = `
      query GetDayContent($learningPlanId: UUID!, $dayNumber: Int!) {
        dayContents(
          where: {
            section: { learningPlan: { id: { eq: $learningPlanId } } },
            dayNumber: { eq: $dayNumber }
          },
          limit: 1
        ) {
          id
          title
          focusArea
          isActionDay
          objectives
          completionStatus
          mainContentItem_on_dayContent {
            id
            title
            textContent
            audioUrl
            estimatedReadTimeMinutes
            audioDurationSeconds
            funFact
            xp
            keyConcepts_on_mainContentItem {
              concept
              explanation
              emoji
            }
          }
          contentBlockItems_on_dayContent(orderBy: { order: ASC }) {
            id
            blockType
            title
            xp
            order
            estimatedMinutes
            quizDetails {
              id
              description
              quizQuestionDatas_on_quizDetails {
                question
                questionType
                explanation
                quizOptionDatas_on_question {
                  optionText
                  isCorrect
                }
              }
            }
            exerciseDetails {
              id
              instructions
              exerciseType
              matchPairs_on_exercise {
                prompt
                correctAnswer
              }
            }
          }
          actionTaskItem_on_dayContent {
            id
            title
            challengeDescription
            timeEstimateString
            tips
            realWorldContext
            successCriteria
            toviMotivation
            difficultyAdaptation
            xp
            actionStepItems_on_actionTaskItem(orderBy: { stepNumber: ASC }) {
              stepNumber
              description
              estimatedTimeSeconds
              isCompleted
            }
          }
        }
      }`;
    
    const response = await dc.executeGraphql(query, { variables: { learningPlanId, dayNumber } });
    return (response as any).data.dayContents?.[0] ?? null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error getting day content: ${errorMessage}`);
    throw error;
  }
};

/**
 * GetUserAnalytics - Obtiene analytics del usuario
 */
export const getUserAnalytics = async (userFirebaseUid: string): Promise<Types.UserAnalytics | null> => {
  try {
    logger.info(`[Admin SDK] Getting user analytics: ${userFirebaseUid}`);
    
    const dc = getDataConnect();
    const query = `
      query GetUserAnalytics($userFirebaseUid: String!) {
        userAnalyticss(
          where: { userFirebaseUid: { eq: $userFirebaseUid } },
          limit: 1
        ) {
          id
          optimalLearningTimeStart
          optimalLearningTimeEnd
          optimalLearningTimeReasoning
          contentDifficultyRecommendation
          idealSessionLengthMinutes
          streakRiskLevel
          streakInterventionStrategies
          overallEngagementScore
          keyInsights
        }
      }`;
    
    const response = await dc.executeGraphql(query, { variables: { userFirebaseUid } });
    return (response as any).data.userAnalyticss?.[0] as Types.UserAnalytics ?? null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error getting user analytics: ${errorMessage}`);
    throw error;
  }
};

/**
 * GetUserProgress - Obtiene el progreso del usuario (enrollments + streak)
 */
export const getUserProgress = async (userFirebaseUid: string): Promise<Types.UserProgress | null> => {
  try {
    logger.info(`[Admin SDK] Getting user progress: ${userFirebaseUid}`);
    
    const dc = getDataConnect();
    const query = `
      query GetUserProgress($userFirebaseUid: String!) {
        enrollments(
          where: {
            userFirebaseUid: { eq: $userFirebaseUid },
            status: { eq: "ACTIVE" }
          },
          limit: 1
        ) {
          id
          status
          enrollmentDate
          learningPlan {
            id
            skillName
            totalDurationWeeks
          }
        }
        streakData(key: { userFirebaseUid: $userFirebaseUid }) {
          currentStreak
          longestStreak
          lastContributionDate
        }
      }`;
    
    const response = await dc.executeGraphql(query, { variables: { userFirebaseUid } });
    const data = (response as any).data;
    
    return {
      enrollments: data.enrollments || [],
      streakData: data.streakData || null
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error getting user progress: ${errorMessage}`);
    throw error;
  }
};

/**
 * GetToviMessages - Obtiene mensajes de Tovi para una situación específica
 */
export const getToviMessages = async (userFirebaseUid: string, situation: string): Promise<Types.ToviMessage[]> => {
  try {
    logger.info(`[Admin SDK] Getting Tovi messages: ${userFirebaseUid}, situation: ${situation}`);
    
    const dc = getDataConnect();
    const query = `
      query GetToviMessages($userFirebaseUid: String!, $situation: String!) {
        toviMessages(
          where: {
            userFirebaseUid: { eq: $userFirebaseUid },
            situation: { eq: $situation },
            isDelivered: { eq: false }
          },
          orderBy: { createdAt: DESC },
          limit: 5
        ) {
          id
          situation
          message
          toviEmojiStyle
          animationSuggestion
          createdAt
          isDelivered
        }
      }`;
    
    const response = await dc.executeGraphql(query, { variables: { userFirebaseUid, situation } });
    return (response as any).data.toviMessages || [];
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error getting Tovi messages: ${errorMessage}`);
    throw error;
  }
};

/**
 * GetUserEnrollments - Obtiene todas las inscripciones del usuario
 */
export const getUserEnrollments = async (userFirebaseUid: string): Promise<Types.Enrollment[]> => {
  try {
    logger.info(`[Admin SDK] Getting user enrollments: ${userFirebaseUid}`);
    
    const dc = getDataConnect();
    const query = `
      query GetUserEnrollments($userFirebaseUid: String!) {
        enrollments(
          where: { userFirebaseUid: { eq: $userFirebaseUid } }
        ) {
          id
          status
          learningPlan {
            id
            skillName
          }
        }
      }`;
    
    const response = await dc.executeGraphql(query, { variables: { userFirebaseUid } });
    return (response as any).data.enrollments || [];
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error getting user enrollments: ${errorMessage}`);
    throw error;
  }
};

/**
 * GetUserLearningPlans - Obtiene todos los planes de aprendizaje del usuario
 */
export const getUserLearningPlans = async (userFirebaseUid: string): Promise<any[]> => {
  try {
    logger.info(`[Admin SDK] Getting user learning plans: ${userFirebaseUid}`);
    
    const dc = getDataConnect();
    const query = `
      query GetUserLearningPlans($userFirebaseUid: String!) {
        learningPlans(
          where: { userFirebaseUid: { eq: $userFirebaseUid } }
        ) {
          id
          skillName
        }
      }`;
    
    const response = await dc.executeGraphql(query, { variables: { userFirebaseUid } });
    return (response as any).data.learningPlans || [];
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error getting user learning plans: ${errorMessage}`);
    throw error;
  }
};

/**
 * GetUserXPBreakdown - Obtiene el desglose detallado de XP del usuario
 */
export const getUserXPBreakdown = async (userFirebaseUid: string): Promise<Types.UserXPBreakdown> => {
  try {
    logger.info(`[Admin SDK] Getting user XP breakdown: ${userFirebaseUid}`);
    
    const dc = getDataConnect();
    const query = `
      query GetUserXPBreakdown($userFirebaseUid: String!) {
        mainContentItems(
          where: { 
            dayContent: { 
              section: { 
                learningPlan: { 
                  userFirebaseUid: { eq: $userFirebaseUid }
                }
              },
              completionStatus: { eq: "COMPLETED" }
            }
          }
        ) {
          xp
        }
        
        actionTaskItems(
          where: { 
            dayContent: { 
              section: { 
                learningPlan: { 
                  userFirebaseUid: { eq: $userFirebaseUid }
                }
              },
              completionStatus: { eq: "COMPLETED" }
            }
          }
        ) {
          xp
        }
        
        contentBlockItems(
          where: { 
            dayContent: { 
              section: { 
                learningPlan: { 
                  userFirebaseUid: { eq: $userFirebaseUid }
                }
              },
              completionStatus: { eq: "COMPLETED" }
            }
          }
        ) {
          xp
        }
      }`;
    
    const response = await dc.executeGraphql(query, { variables: { userFirebaseUid } });
    const data = (response as any).data;
    
    const mainContent = data.mainContentItems?.reduce((sum: number, item: any) => sum + (item.xp || 0), 0) || 0;
    const actionTasks = data.actionTaskItems?.reduce((sum: number, item: any) => sum + (item.xp || 0), 0) || 0;
    const exercises = data.contentBlockItems?.reduce((sum: number, item: any) => sum + (item.xp || 0), 0) || 0;
    
    const breakdown: Types.UserXPBreakdown = {
      mainContent,
      actionTasks,
      exercises,
      total: mainContent + actionTasks + exercises
    };
    
    logger.info(`[Admin SDK] XP breakdown calculated for user ${userFirebaseUid}:`, breakdown);
    return breakdown;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error getting user XP breakdown: ${errorMessage}`);
    throw error;
  }
}; 