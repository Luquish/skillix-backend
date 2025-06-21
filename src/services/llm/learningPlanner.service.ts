// src/services/llm/learningPlanner.service.ts

import { getOpenAiChatCompletion, LlmResponse } from './openai.service';
import { getConfig } from '../../config';
import OpenAI from 'openai';
import { z } from 'zod';
import { UserSkillContext } from './skillAnalyzer.service'; 

// Importar schemas y tipos desde el archivo centralizado
import {
  LearningPlanSchema,
  type PedagogicalAnalysis,
  type SkillAnalysis,
  type LearningPlan
} from './schemas';
import { SYSTEM_PROMPT_LEARNING_PLANNER } from './prompts';

const config = getConfig();

// --- Interfaces para los datos de entrada ---

export interface OnboardingDataForPlanner extends UserSkillContext {
  skill: string;
  name?: string; 
  learning_style?: string; 
  preferred_study_time?: string;
  learning_context?: string;
  challenge_preference?: string;
}
export interface LearningPlanInput {
  onboardingData: OnboardingDataForPlanner;
  skillAnalysis: SkillAnalysis; 
  pedagogicalAnalysis?: PedagogicalAnalysis | null; // Usar el tipo importado y permitir null
}

/**
 * Genera un plan de aprendizaje personalizado utilizando OpenAI.
 * @param input Contiene onboardingData, skillAnalysis, y opcionalmente pedagogicalAnalysis.
 * @returns Una promesa que se resuelve con el objeto LearningPlan o null si hay un error.
 */
export async function generateLearningPlanWithOpenAI(
  input: LearningPlanInput
): Promise<LearningPlan | null> {
  const { onboardingData, skillAnalysis, pedagogicalAnalysis } = input;

  if (!skillAnalysis.isSkillValid) {
    console.error(`Intento de generar plan para habilidad no válida: "${skillAnalysis.skillName}". Razón: ${skillAnalysis.viabilityReason}`);
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
${onboardingData.preferred_study_time ? `- Preferred Study Time: ${onboardingData.preferred_study_time}` : ''}
${onboardingData.learning_context ? `- Learning Context: ${onboardingData.learning_context}` : ''}
${onboardingData.challenge_preference ? `- Challenge Preference: ${onboardingData.challenge_preference}` : ''}

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
    if (!rawLearningPlanResult.skillName) {
      rawLearningPlanResult.skillName = skillAnalysis.skillName;
    }
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
