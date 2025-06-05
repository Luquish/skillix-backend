import { Response } from 'express';
import { z } from 'zod';
import { SkillAnalysisSchema } from '../services/llm/schemas';
import * as DataConnectService from '../services/dataConnect.service';
import * as llmService from '../services/llm/learningPlanner.service';
import { UserExperienceLevel, LearningStyle } from '../services/dataConnect.types';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as ContentOrchestrator from '../services/contentOrchestrator.service';

// Esquema de validación para la creación del plan
const CreatePlanInputSchema = z.object({
  onboardingPrefs: z.object({
      skill: z.string(),
      experience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
      availableTimeMinutes: z.number().positive(),
      learningStyle: z.enum(['VISUAL', 'AUDITORY', 'KINESTHETIC', 'READING_WRITING', 'MIXED']),
      motivation: z.string(),
      goal: z.string(),
  }),
  skillAnalysis: SkillAnalysisSchema,
});


/**
 * Controlador para crear un nuevo plan de aprendizaje completo.
 */
export const createLearningPlanController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { onboardingPrefs, skillAnalysis } = CreatePlanInputSchema.parse(req.body);
    const user = req.user!; // El middleware isAuthenticated garantiza que user exista

    // Guardar las preferencias del usuario
    await DataConnectService.createUserPreference({
      userId: user.id,
      skill: onboardingPrefs.skill,
      experienceLevel: onboardingPrefs.experience,
      motivation: onboardingPrefs.motivation,
      availableTimeMinutes: onboardingPrefs.availableTimeMinutes,
      learningStyle: onboardingPrefs.learningStyle,
      goal: onboardingPrefs.goal,
    });
    console.log(`Preferencias guardadas para el usuario ${user.id}`);

    // 2. Generar el plan de aprendizaje con el LLM
    console.log(`Generating learning plan for skill: "${onboardingPrefs.skill}"...`);
    const llmResponse = await llmService.generateLearningPlanWithOpenAI({
      onboardingData: {
        skill: onboardingPrefs.skill,
        experience: onboardingPrefs.experience,
        time: `${onboardingPrefs.availableTimeMinutes} minutes daily`,
        goal: onboardingPrefs.goal,
        learning_style: onboardingPrefs.learningStyle,
      },
      skillAnalysis: skillAnalysis,
    });

    if (!llmResponse) {
      console.error('Learning plan generation from LLM failed.');
      return res.status(500).json({ message: 'Failed to generate the learning plan.' });
    }
    console.log(`Plan de aprendizaje generado por LLM para: ${onboardingPrefs.skill}`);

    // Mapear y guardar el plan completo en Data Connect
    // NOTA: Con los schemas.ts corregidos para ser estrictos, este mapeo debería funcionar sin errores de tipo.
    const planInputForDb: DataConnectService.CreateFullLearningPlanInputForService = {
        userId: user.id,
        skillName: llmResponse.skillName,
        generatedBy: llmResponse.generatedBy,
        generatedAt: new Date().toISOString(),
        totalDurationWeeks: llmResponse.totalDurationWeeks,
        dailyTimeMinutes: llmResponse.dailyTimeMinutes,
        skillLevelTarget: llmResponse.skillLevelTarget,
        milestones: llmResponse.milestones,
        progressMetrics: llmResponse.progressMetrics,
        flexibilityOptions: llmResponse.flexibilityOptions,
        skillAnalysis: skillAnalysis as DataConnectService.CreateFullLearningPlanInputForService['skillAnalysis'],
        pedagogicalAnalysis: llmResponse.pedagogicalAnalysis as DataConnectService.CreateFullLearningPlanInputForService['pedagogicalAnalysis'],
        sections: llmResponse.sections as DataConnectService.CreateFullLearningPlanInputForService['sections'],
        dailyActivityTemplates: llmResponse.dailyActivities as DataConnectService.CreateFullLearningPlanInputForService['dailyActivityTemplates'],
        suggestedResources: llmResponse.resources as DataConnectService.CreateFullLearningPlanInputForService['suggestedResources'],
    };
    
    const createdPlan = await DataConnectService.createFullLearningPlanInDB(planInputForDb);

    if (!createdPlan) {
        return res.status(500).json({ message: "Failed to save the learning plan to the database." });
    }
    console.log(`Plan de aprendizaje guardado en DB con ID: ${createdPlan.id}`);
    
    // Crear la inscripción (enrollment) para el usuario en este plan
    const enrollment = await DataConnectService.createEnrollment({
      userId: user.id,
      learningPlanId: createdPlan.id,
      status: 'IN_PROGRESS',
      currentDayNumber: 1, // Empieza en el día 1
      totalXpEarned: 0,
    });

    if (!enrollment) {
      console.error(`Failed to create enrollment for user ${user.id} in plan ${createdPlan.id}.`);
      // No devolvemos un error fatal aquí, pero es una advertencia importante.
    } else {
      console.log(`Enrollment created successfully for user ${user.id} in plan ${createdPlan.id}.`);
    }

    // Generar el contenido para el Día 1 usando el orquestador
    console.log(`Triggering content generation for Day 1 of plan ${createdPlan.id}...`);
    const day1Result = await ContentOrchestrator.generateAndSaveContentForDay({
      userId: user.id,
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
      pedagogicalAnalysis: llmResponse.pedagogicalAnalysis,
      initialContent: day1Result.success ? day1Result.data : null,
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input data for plan creation.', errors: error.errors });
    }
    console.error('Error in createLearningPlanController:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
