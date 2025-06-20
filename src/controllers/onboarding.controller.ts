import { Request, Response } from 'express';
import { z } from 'zod';
import { analyzeSkillWithOpenAI, UserSkillContext } from '../services/llm/skillAnalyzer.service';
import { OnboardingPreferencesSchema } from '../services/llm/schemas';

// Esquema de validación para la entrada del onboarding (lo mantenemos cerca del controlador que lo usa)
const OnboardingInputSchema = OnboardingPreferencesSchema;

/**
 * Controlador para analizar una habilidad durante el onboarding.
 */
export const analyzeSkillController = async (req: Request, res: Response) => {
  try {
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
      return res.status(500).json({
        message: 'There was an error analyzing the skill. Please try again later.',
      });
    }

    if (!analysis.isSkillValid) {
      return res.status(400).json({
        message: analysis.viabilityReason || 'This skill is not suitable for our learning platform at the moment.',
        data: analysis,
      });
    }

    res.status(200).json({
      message: 'Skill analysis successful.',
      data: analysis,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input data.', errors: error.errors });
    }
    console.error('Error in analyzeSkillController:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
