import { Request, Response } from 'express';
import { z } from 'zod';
import { analyzeSkillWithOpenAI, UserSkillContext } from '../services/llm/skillAnalyzer.service';

// Esquema de validación para la entrada del onboarding (lo mantenemos cerca del controlador que lo usa)
const OnboardingInputSchema = z.object({
  skill: z.string().min(1, 'Skill is required.'),
  experience: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  time: z.string().min(1, 'Time commitment is required.'), // ej: "10min / day"
  motivation: z.string().min(1, 'Motivation is required.'), // ej: "Career Growth"
  goal: z.string().optional(),
});

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
