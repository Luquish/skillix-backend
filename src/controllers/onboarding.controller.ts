import { Request, Response } from 'express';
import { z } from 'zod';
import { analyzeSkillWithOpenAI, UserSkillContext } from '../services/llm/skillAnalyzer.service';
import { OnboardingPreferencesSchema } from '../services/llm/schemas';
import { createError } from '../utils/errorHandler';

// Esquema de validación para la entrada del onboarding (lo mantenemos cerca del controlador que lo usa)
const OnboardingInputSchema = OnboardingPreferencesSchema;

/**
 * Controlador para analizar una habilidad durante el onboarding.
 */
export const analyzeSkillController = async (req: Request, res: Response) => {
  const onboardingData = OnboardingInputSchema.parse(req.body);

  const userContext: UserSkillContext = {
    experience: onboardingData.experience.toLowerCase(),
    goal: onboardingData.motivation,
    time: onboardingData.time,
    learning_style: onboardingData.learning_style,
    preferred_study_time: onboardingData.preferred_study_time,
    learning_context: onboardingData.learning_context,
    challenge_preference: onboardingData.challenge_preference,
  };

  const analysis = await analyzeSkillWithOpenAI(onboardingData.skill, userContext);

  if (!analysis) {
    throw createError('There was an error analyzing the skill. Please try again later.', 500);
  }

  if (!analysis.isSkillValid) {
    // Lanzamos un error que el manejador global convertirá en 400
    const error = createError(
      analysis.viabilityReason || 'This skill is not suitable for our learning platform at the moment.',
      400
    );
    // Adjuntamos los datos para que el cliente pueda usarlos
    (error as any).data = analysis; 
    throw error;
  }

  res.status(200).json({
    message: 'Skill analysis successful.',
    data: analysis,
  });
};
