// src/services/llm/learningPlanner.service.ts

import { getOpenAiChatCompletion, LlmResponse } from './openai.service';
import { getConfig } from '../../config';
import OpenAI from 'openai';
import { z } from 'zod';
import { SkillAnalysis, UserSkillContext } from './skillAnalyzer.service'; 
import { PedagogicalAnalysis } from './pedagogicalExpert.service';

const config = getConfig();

// --- Zod Schemas y TypeScript Interfaces ---

export const LearningDaySchema = z.object({
  day_number: z.number().int().positive(),
  title: z.string().min(1),
  focus_area: z.string().min(1),
  is_action_day: z.boolean(),
  description: z.string().nullable().optional(),
});
export type LearningDay = z.infer<typeof LearningDaySchema>;

export const LearningSectionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  days: z.array(LearningDaySchema),
});
export type LearningSection = z.infer<typeof LearningSectionSchema>;

// Esquema Zod principal para LearningPlan
export const LearningPlanSchema = z.object({
  total_duration_weeks: z.number().int().positive("Total duration must be a positive number of weeks."),
  daily_time_minutes: z.number().int().positive("Daily time must be a positive number of minutes."),
  skill_level_target: z.enum(['beginner', 'intermediate', 'advanced']).or(z.string()).describe("Target skill level: 'beginner', 'intermediate', or 'advanced'."),
  milestones: z.array(z.string().min(1)).min(1, "At least one milestone is required."),
  daily_activities: z.array(
    z.object({
      type: z.string().min(1, "Activity type cannot be empty."),
      duration_minutes: z.number().int().positive("Activity duration must be positive."),
      description: z.string().min(1, "Activity description cannot be empty."),
    })
  ).min(1, "At least one daily activity is required."),
  resources: z.array(
    z.object({
      name: z.string().min(1, "Resource name cannot be empty."),
      url: z.string().url("Resource URL must be a valid URL.").or(z.string().min(1, "Resource description cannot be empty if not a URL.")),
    })
  ),
  progress_metrics: z.array(z.string().min(1)).min(1, "At least one progress metric is required."),
  flexibility_options: z.array(z.string().min(1)),
  // sections: z.array(LearningSectionSchema).optional(), // Descomentar si el LLM debe generar esto
});
export type LearningPlan = z.infer<typeof LearningPlanSchema>;

// Interfaz para los datos de entrada de la función
export interface OnboardingDataForPlanner extends UserSkillContext {
  skill: string;
  name?: string; 
  learning_style?: string; 
}
export interface LearningPlanInput {
  onboardingData: OnboardingDataForPlanner;
  skillAnalysis: SkillAnalysis; 
  pedagogicalAnalysis?: PedagogicalAnalysis | null; // Usar el tipo importado y permitir null
}

const SYSTEM_PROMPT_LEARNING_PLANNER = `You are an expert in creating personalized, actionable, and engaging learning plans. Your role is to:

1.  ANALYZE user goals (from onboardingData.goal), current experience (onboardingData.experience), available time (onboardingData.time), learning style (onboardingData.learning_style, if provided), and the detailed skill_analysis provided.
2.  CREATE a realistic and motivating learning schedule structured as a 'LearningPlan'.
3.  INCORPORATE pedagogical best practices: ensure progressive difficulty, clear milestones, and a balance between theory and practice.
4.  BALANCE challenge with achievability to keep the user engaged.
5.  PROVIDE clear progress metrics and suggest resources.
6.  DEFINE daily activities that fit within the user's specified 'daily_time_minutes' (derived from onboardingData.time).
7.  If 'pedagogical_analysis_result' is provided (it will be a JSON object with fields like effectiveness_score, cognitive_load_assessment, recommendations, etc.), you MUST incorporate its recommendations and insights into the plan structure, activities, resource suggestions, and assessment strategies to enhance its pedagogical soundness.

Key Planning Principles:
- Realistic Time Allocation: Distribute learning activities across the 'total_duration_weeks'.
- Progressive Difficulty: Structure content from basic to advanced.
- Regular Milestones: Define clear, achievable milestones.
- Flexible Scheduling: Include 'flexibility_options'.
- Clear Success Criteria: Define 'progress_metrics'.

Consider:
- User's available daily time (e.g., "15 minutes daily" implies daily_time_minutes should be 15).
- User's prior experience level.
- User's learning preferences (if provided).
- The components and recommendations from the 'skill_analysis_result'.
- (If provided) Insights from 'pedagogical_analysis_result' (e.g., cognitive load, engagement techniques, assessment strategies, improvement_areas).

IMPORTANT: You MUST ALWAYS respond with a valid JSON object that strictly matches the 'LearningPlan' structure provided below. Ensure all string fields that are not optional are non-empty. Numerical fields like 'total_duration_weeks' and 'daily_time_minutes' must be positive integers. Arrays like 'milestones', 'daily_activities', and 'progress_metrics' should not be empty.
{
  "total_duration_weeks": number,
  "daily_time_minutes": number, // Should be derived from user's input 'time'
  "skill_level_target": "string ('beginner', 'intermediate', or 'advanced')",
  "milestones": ["string"],
  "daily_activities": [
    {
      "type": "string (e.g., 'focused_reading', 'video_tutorial', 'interactive_quiz', 'small_exercise', 'project_milestone')",
      "duration_minutes": number,
      "description": "string (brief description of the activity)"
    }
  ],
  "resources": [
    {
      "name": "string (name of the resource)",
      "url": "string (URL if applicable, or description like 'Book: Clean Code')"
    }
  ],
  "progress_metrics": ["string (e.g., 'Completion of daily tasks', 'Quiz scores > 80%', 'Mini-project submission')"],
  "flexibility_options": ["string (e.g., 'Designated catch-up day per week', 'Optional deep-dive topics')"]
}

Ensure the sum of 'duration_minutes' for 'daily_activities' roughly matches the user's 'daily_time_minutes'.
The plan should be actionable and provide a clear path for the user.
`;

/**
 * Genera un plan de aprendizaje personalizado utilizando OpenAI.
 * @param input Contiene onboardingData, skillAnalysis, y opcionalmente pedagogicalAnalysis.
 * @returns Una promesa que se resuelve con el objeto LearningPlan o null si hay un error.
 */
export async function generateLearningPlanWithOpenAI(
  input: LearningPlanInput
): Promise<LearningPlan | null> {
  const { onboardingData, skillAnalysis, pedagogicalAnalysis } = input;

  if (!skillAnalysis.is_skill_valid) {
    console.error(`Intento de generar plan para habilidad no válida: "${skillAnalysis.skill_name}". Razón: ${skillAnalysis.viability_reason}`);
    return null; 
  }

  let userMessageContent = `Create a personalized learning plan.

User Profile:
- Skill to learn: ${onboardingData.skill}
- Current Experience: ${onboardingData.experience}
- Available Daily Time: ${onboardingData.time} (Please ensure the 'daily_time_minutes' in your JSON output reflects this value accurately, e.g., if "15 minutes daily", then daily_time_minutes should be 15.)
- Learning Goal: ${onboardingData.goal}
${onboardingData.name ? `- User Name: ${onboardingData.name}` : ''}
${onboardingData.learning_style ? `- Preferred Learning Style: ${onboardingData.learning_style}` : ''}

Detailed Skill Analysis (use this to structure the plan, define milestones, and inform daily activities):
${JSON.stringify(skillAnalysis, null, 2)}
`;

  if (pedagogicalAnalysis) {
    userMessageContent += `

Pedagogical Analysis Insights (incorporate these into the plan's structure, activities, resources, and assessment strategies to enhance pedagogical soundness):
${JSON.stringify(pedagogicalAnalysis, null, 2)}
`;
  }

  userMessageContent += `
Provide a detailed learning plan in the exact JSON format specified in the system instructions.
The 'daily_time_minutes' in the output JSON must accurately reflect the user's "Available Daily Time" from their profile.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT_LEARNING_PLANNER,
    },
    {
      role: 'user',
      content: userMessageContent,
    },
  ];

  console.log(`Solicitando plan de aprendizaje para: "${onboardingData.skill}"`);

  const response: LlmResponse = await getOpenAiChatCompletion({
    messages,
    model: config.openaiModel, 
    temperature: 0.6, 
    response_format: { type: 'json_object' },
  });

  if (!response.success || !response.content) {
    console.error('Error en la generación del plan de aprendizaje de OpenAI:', response.error);
    return null;
  }

  try {
    const rawLearningPlanResult = JSON.parse(response.content);
    // Validar con Zod
    const validatedLearningPlan = LearningPlanSchema.parse(rawLearningPlanResult);
    
    console.log(`Plan de aprendizaje generado y validado para: "${onboardingData.skill}"`);
    return validatedLearningPlan;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Error de validación Zod para LearningPlan:', error.errors);
    } else {
      console.error('Error parseando la respuesta JSON de LearningPlan de OpenAI:', error);
    }
    console.error('Contenido original de OpenAI que falló al parsear/validar:', response.content);
    return null;
  }
}
