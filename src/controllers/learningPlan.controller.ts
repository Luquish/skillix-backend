import { Response } from 'express';
import { z } from 'zod';
import { LearningPlan, SkillAnalysisSchema, OnboardingPreferencesSchema } from '../services/llm/schemas';
import * as DataConnectService from '../services/dataConnect.service';
import * as llmService from '../services/llm/learningPlanner.service';
import * as pedagogicalExpert from '../services/llm/pedagogicalExpert.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as ContentOrchestrator from '../services/contentOrchestrator.service';

// Esquema de validación para la creación del plan (copiado de onboarding.controller.ts)
const CreatePlanInputSchema = z.object({
  onboardingPrefs: OnboardingPreferencesSchema,
  skillAnalysis: SkillAnalysisSchema,
});


/**
 * Controlador para crear un nuevo plan de aprendizaje completo.
 */
export const createLearningPlanController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { onboardingPrefs, skillAnalysis } = CreatePlanInputSchema.parse(req.body);
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    // `onboardingPrefs.time` llega como '30 minutes', '1h', etc.  Extraemos
    // los dígitos para convertirlo a minutos y almacenarlo de forma numérica.
    const availableTimeMinutes = parseInt(onboardingPrefs.time?.replace(/\D/g, '') || '15', 10);
    
    // Guardar las preferencias del usuario
    await DataConnectService.createUserPreference({
      userFirebaseUid: user.firebaseUid,
      user: user,
      skill: onboardingPrefs.skill,
      experienceLevel: onboardingPrefs.experience,
      motivation: onboardingPrefs.motivation,
      availableTimeMinutes: availableTimeMinutes,
      goal: onboardingPrefs.goal,
      learningStyle: onboardingPrefs.learning_style,
      preferredStudyTime: onboardingPrefs.preferred_study_time,
      learningContext: onboardingPrefs.learning_context,
      challengePreference: onboardingPrefs.challenge_preference,
    });
    const initialPlan = await llmService.generateLearningPlanWithOpenAI({
      onboardingData: {
        skill: onboardingPrefs.skill,
        experience: onboardingPrefs.experience,
        time: onboardingPrefs.time,
        goal: onboardingPrefs.goal,
        learning_style: onboardingPrefs.learning_style,
        preferred_study_time: onboardingPrefs.preferred_study_time,
        learning_context: onboardingPrefs.learning_context,
        challenge_preference: onboardingPrefs.challenge_preference,
      },
      skillAnalysis: skillAnalysis,
    });

    if (!initialPlan) {
      console.error('Learning plan generation from LLM failed.');
      return res.status(500).json({ message: 'Failed to generate the learning plan.' });
    }

    // Asegurar que el skillName esté presente (el LLM a veces no lo incluye)
    initialPlan.skillName = onboardingPrefs.skill;
    const pedagogicalAnalysis = await pedagogicalExpert.analyzePlanPedagogically({
      learningPlan: initialPlan,
      userContext: {
        skill: onboardingPrefs.skill,
        experience: onboardingPrefs.experience,
        time: onboardingPrefs.time,
        goal: onboardingPrefs.goal,
        learning_style: onboardingPrefs.learning_style,
        preferred_study_time: onboardingPrefs.preferred_study_time,
        learning_context: onboardingPrefs.learning_context,
        challenge_preference: onboardingPrefs.challenge_preference,
      },
    });

    if (!pedagogicalAnalysis) {
      // No es un error fatal, el plan sigue siendo útil.
      console.warn(`Pedagogical analysis failed for plan on skill "${onboardingPrefs.skill}". Proceeding without it.`);
    } else {
      console.log(`Pedagogical analysis completed for skill: ${onboardingPrefs.skill}`);
    }

    // 4. NEW: Refinar el plan utilizando el análisis pedagógico
    let finalPlan: LearningPlan = initialPlan; // Usar el plan inicial como fallback
    if (pedagogicalAnalysis) {
      const refinedPlanAttempt = await llmService.generateLearningPlanWithOpenAI({
        onboardingData: {
          skill: onboardingPrefs.skill,
          experience: onboardingPrefs.experience,
          time: onboardingPrefs.time,
          goal: onboardingPrefs.goal,
          learning_style: onboardingPrefs.learning_style,
          preferred_study_time: onboardingPrefs.preferred_study_time,
          learning_context: onboardingPrefs.learning_context,
          challenge_preference: onboardingPrefs.challenge_preference,
        },
        skillAnalysis: skillAnalysis,
        pedagogicalAnalysis: pedagogicalAnalysis, // Incluir el análisis para el refinamiento
      });

      if (refinedPlanAttempt) {
        finalPlan = refinedPlanAttempt;
        // Asegurar que el skillName esté presente también en el plan refinado
        finalPlan.skillName = onboardingPrefs.skill;

      } else {
        console.warn('LLM plan refinement failed. Proceeding with the initial plan.');
      }
    }

    // Mapear y guardar el plan completo en Data Connect
    const createdPlanResponse = await DataConnectService.createFullLearningPlanInDB(
      user.firebaseUid,
      finalPlan,
      skillAnalysis,
      pedagogicalAnalysis
    );

    const createdPlan = createdPlanResponse?.data?.learningPlan;

    if (!createdPlan || !createdPlan.id) {
        return res.status(500).json({ message: "Failed to save the learning plan to the database." });
    }
    // Crear la inscripción (enrollment) para el usuario en este plan
    const enrollment = await DataConnectService.createEnrollment({
      userFirebaseUid: user.firebaseUid,
      learningPlanId: createdPlan.id,
      status: 'ACTIVE',
    });

    if (!enrollment) {
      console.error(`Failed to create enrollment for user ${user.firebaseUid} in plan ${createdPlan.id}.`);
      // No devolvemos un error fatal aquí, pero es una advertencia importante.
    } else {
      console.log(`Enrollment created successfully for user ${user.firebaseUid} in plan ${createdPlan.id}.`);
    }

    // Generar el contenido para el Día 1 usando el orquestador
    const day1Result = await ContentOrchestrator.generateAndSaveContentForDay({
      userId: user.firebaseUid,
      learningPlanId: createdPlan.id,
      dayNumber: 1,
    });

    if (!day1Result.success) {
      // Si la generación del día 1 falla, no hacemos fallar toda la solicitud,
      // pero sí lo registramos como un error crítico. El usuario aún tiene su plan.
      // Se podría reintentar más tarde.
      console.error(`CRITICAL: Learning plan ${createdPlan.id} was created, but content generation for Day 1 failed: ${day1Result.message}`);
    } else {
      console.log(`Content for Day 1 of plan ${createdPlan.id} generated successfully.`);
    }

    // 7. Devolver la respuesta final al cliente
    res.status(201).json({
      message: 'Learning plan created successfully!',
      planId: createdPlan.id,
      skillAnalysis: skillAnalysis,
      pedagogicalAnalysis: pedagogicalAnalysis,
      initialContent: day1Result.success ? day1Result.data : null,
    });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      // 🔍 DEBUG: Logs detallados de errores de validación Zod
      console.error('❌ BACKEND - Error de validación Zod:', JSON.stringify(error.errors, null, 2));
      error.errors.forEach((err, index) => {
        console.error(`❌ Error ${index + 1}:`, {
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
          fullError: err
        });
      });
      return res.status(400).json({ 
        message: 'Invalid input data for plan creation.', 
        errors: error.errors,
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      });
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in createLearningPlanController:', errorMessage);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Controlador para obtener el plan de aprendizaje actual del usuario autenticado.
 */
export const getCurrentLearningPlanController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    // Obtener el plan activo del usuario
    const currentPlan = await DataConnectService.getCurrentUserLearningPlan(user.firebaseUid);

    if (!currentPlan) {
      return res.status(404).json({ 
        message: 'No active learning plan found for the user.' 
      });
    }

    res.status(200).json({
      message: 'Current learning plan retrieved successfully.',
      plan: currentPlan,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in getCurrentLearningPlanController:', errorMessage);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Controlador para obtener un plan de aprendizaje específico por ID.
 */
export const getLearningPlanByIdController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Learning plan ID is required.' });
    }

    // Obtener el plan por ID
    const plan = await DataConnectService.getLearningPlanStructureById(id);

    if (!plan) {
      return res.status(404).json({ 
        message: 'Learning plan not found.' 
      });
    }

    // Verificar que el plan pertenece al usuario autenticado
    if (plan.userFirebaseUid !== user.firebaseUid) {
      return res.status(403).json({ 
        message: 'Access denied. You can only access your own learning plans.' 
      });
    }

    res.status(200).json({
      message: 'Learning plan retrieved successfully.',
      plan: plan,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in getLearningPlanByIdController:', errorMessage);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
