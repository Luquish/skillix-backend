import { Response } from 'express';
import { z } from 'zod';
import { LearningPlan, SkillAnalysisSchema, OnboardingPreferencesSchema, SkillAnalysisSchemaRaw } from '../services/llm/schemas';
import * as DataConnectService from '../services/dataConnect.service';
import * as llmService from '../services/llm/learningPlanner.service';
import * as pedagogicalExpert from '../services/llm/pedagogicalExpert.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as ContentOrchestrator from '../services/contentOrchestrator.service';
import { createError } from '../utils/errorHandler';

// Esquema de validación para la CREACIÓN (usando el schema RAW)
const CreatePlanInputSchema = z.object({
  onboardingPrefs: OnboardingPreferencesSchema,
  skillAnalysis: SkillAnalysisSchemaRaw, // Usar el schema RAW para validación
});

// Esquema para la inscripción
const EnrollInputSchema = z.object({
  learningPlanId: z.string().min(1, 'learningPlanId is required.'),
});

/**
 * Controlador para crear un nuevo plan de aprendizaje.
 */
export const createLearningPlanController = async (req: AuthenticatedRequest, res: Response) => {
  const { onboardingPrefs, skillAnalysis: rawSkillAnalysis } = CreatePlanInputSchema.parse(req.body);
  const skillAnalysis = SkillAnalysisSchema.parse(rawSkillAnalysis);

  const user = req.user;
  if (!user) {
    throw createError('User not authenticated.', 401);
  }
  
  if (!onboardingPrefs.skill || !onboardingPrefs.experience || !onboardingPrefs.time || !onboardingPrefs.goal) {
    throw createError('Incomplete onboarding preferences: skill, experience, time, and goal are required.', 400);
  }

  const initialPlan = await llmService.generateLearningPlanWithOpenAI({
    onboardingData: {
      skill: onboardingPrefs.skill,
      experience: onboardingPrefs.experience,
      time: onboardingPrefs.time,
      goal: onboardingPrefs.goal,
      learning_style: onboardingPrefs.learning_style || 'visual',
      preferred_study_time: onboardingPrefs.preferred_study_time || 'flexible',
      learning_context: onboardingPrefs.learning_context || 'personal_growth',
      challenge_preference: onboardingPrefs.challenge_preference || 'balanced',
    },
    skillAnalysis: skillAnalysis,
  });

  if (!initialPlan) {
    throw createError('Failed to generate the learning plan.', 500);
  }
  initialPlan.skillName = onboardingPrefs.skill;

  const pedagogicalAnalysis = await pedagogicalExpert.analyzePlanPedagogically({
    learningPlan: initialPlan,
    userContext: {
      skill: onboardingPrefs.skill,
      experience: onboardingPrefs.experience,
      goal: onboardingPrefs.goal,
      time: onboardingPrefs.time,
    },
  });

  let finalPlan: LearningPlan = initialPlan;
  if (pedagogicalAnalysis) {
    const refinedPlanAttempt = await llmService.generateLearningPlanWithOpenAI({
      onboardingData: {
        skill: onboardingPrefs.skill,
        experience: onboardingPrefs.experience,
        time: onboardingPrefs.time,
        goal: onboardingPrefs.goal,
        learning_style: onboardingPrefs.learning_style || 'visual',
        preferred_study_time: onboardingPrefs.preferred_study_time || 'flexible',
        learning_context: onboardingPrefs.learning_context || 'personal_growth',
        challenge_preference: onboardingPrefs.challenge_preference || 'balanced',
      },
      skillAnalysis: skillAnalysis,
      pedagogicalAnalysis: pedagogicalAnalysis,
    });
    if (refinedPlanAttempt) {
      finalPlan = refinedPlanAttempt;
      finalPlan.skillName = onboardingPrefs.skill;
    }
  }

  const createdPlanResponse = await DataConnectService.createFullLearningPlanInDB(
    user.firebaseUid,
    finalPlan,
    skillAnalysis,
    pedagogicalAnalysis
  );

  const createdPlan = createdPlanResponse?.data?.learningPlan;
  if (!createdPlan || !createdPlan.id) {
    throw createError("Failed to save the learning plan to the database.", 500);
  }

  const enrollment = await DataConnectService.createEnrollment({
    userFirebaseUid: user.firebaseUid,
    learningPlanId: createdPlan.id,
    status: 'ACTIVE',
  });

  const day1Result = await ContentOrchestrator.generateAndSaveContentForDay({
    userId: user.firebaseUid,
    learningPlanId: createdPlan.id,
    dayNumber: 1,
  });

  res.status(201).json({
    message: 'Learning plan created successfully!',
    planId: createdPlan.id,
    initialContent: day1Result.success ? day1Result.data : null,
  });
};

/**
 * Controlador para obtener todos los 'enrollments' de un usuario.
 */
export const getUserEnrollmentsController = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw createError('User not authenticated.', 401);
  }

  const enrollments = await DataConnectService.getUserEnrollments(user.firebaseUid);
  
  if (!enrollments || enrollments.length === 0) {
    throw createError('No enrollments found for this user.', 404);
  }

  res.status(200).json({
    message: 'Enrollments retrieved successfully.',
    data: enrollments,
  });
};

/**
 * Controlador para obtener todos los planes de aprendizaje de un usuario.
 */
export const getUserLearningPlansController = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw createError('User not authenticated.', 401);
  }

  const learningPlans = await DataConnectService.getUserLearningPlans(user.firebaseUid);

  if (!learningPlans || learningPlans.length === 0) {
    throw createError('No learning plans found for this user.', 404);
  }

  res.status(200).json({
    message: 'Learning plans retrieved successfully.',
    data: learningPlans,
  });
};

/**
 * Controlador para inscribir a un usuario en un plan de aprendizaje.
 */
export const enrollInLearningPlanController = async (req: AuthenticatedRequest, res: Response) => {
  const { learningPlanId } = EnrollInputSchema.parse(req.body);
  
  const user = req.user;
  if (!user) {
    throw createError('User not authenticated.', 401);
  }

  const plan = await DataConnectService.getLearningPlanStructure(learningPlanId);
  if (!plan) {
    throw createError('Learning plan not found.', 404);
  }
  if (plan.userFirebaseUid !== user.firebaseUid) {
    throw createError('You can only enroll in your own learning plans.', 403);
  }

  const enrollment = await DataConnectService.createEnrollment({
    userFirebaseUid: user.firebaseUid,
    learningPlanId: learningPlanId,
    status: 'ACTIVE',
  });

  res.status(201).json({
    message: 'User enrolled successfully.',
    data: enrollment,
  });
};

/**
 * Controlador para obtener el plan de aprendizaje actual del usuario autenticado.
 */
export const getCurrentLearningPlanController = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw createError('User not authenticated.', 401);
  }

  // Obtener el plan activo del usuario
  const currentPlan = await DataConnectService.getCurrentUserLearningPlan(user.firebaseUid);

  if (!currentPlan) {
    throw createError('No active learning plan found for the user.', 404);
  }

  res.status(200).json({
    message: 'Current learning plan retrieved successfully.',
    plan: currentPlan,
  });
};

/**
 * Controlador para obtener un plan de aprendizaje específico por ID.
 */
export const getLearningPlanByIdController = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    throw createError('User not authenticated.', 401);
  }
  const { id } = req.params;

  if (!id) {
    throw createError('Learning plan ID is required.', 400);
  }

  // Obtener el plan por ID
  const plan = await DataConnectService.getLearningPlanStructure(id);

  if (!plan) {
    throw createError('Learning plan not found.', 404);
  }

  // Verificar que el plan pertenece al usuario autenticado
  if (plan.userFirebaseUid !== user.firebaseUid) {
    throw createError('Access denied. You can only access your own learning plans.', 403);
  }

  res.status(200).json({
    message: 'Learning plan retrieved successfully.',
    plan: plan,
  });
};
