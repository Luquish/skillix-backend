// src/services/llm/toviTheFox.service.ts

import { z } from 'zod';
import { getOpenAiChatCompletion, LlmResponse } from './openai.service';
import { getConfig } from '@/config';
import OpenAI from 'openai';
import { UserDataForContent } from './contentGenerator.service'; // Para contexto básico del usuario

// Importar schemas y tipos desde el archivo centralizado
import {
  SkiMessageSchema,
  StreakCelebrationSchema,
  DailyMotivationSchema,
  type SkiMessage,
  type StreakCelebration,
  type DailyMotivation,
  UserAnalytics,
  OptimalLearningTime,
  StreakMaintenance,
} from './schemas';
import { SYSTEM_PROMPT_SKI_THE_FOX, SYSTEM_PROMPT_STREAK_CELEBRATION, SYSTEM_PROMPT_MOTIVATIONAL_ANALYST } from './prompts';

const config = getConfig();

// --- Input Interfaces for Service Functions ---

// Interfaz para los insights de analytics que se pasarán a Ski
export interface SkiAdaptiveContext {
    optimal_learning_time?: OptimalLearningTime;
    streak_maintenance_analysis?: StreakMaintenance;
    key_insights?: string[];
    overall_engagement_score?: number;
    // Puedes añadir más campos de UserAnalytics si son relevantes para Ski
}

export interface SkiMessageInput {
  userContext: Partial<UserDataForContent> & { name?: string }; 
  situation: 
    | "generic_encouragement"
    | "task_completion"
    | "milestone_achieved"
    | "user_struggling" // Para esta, los insights de analytics son muy útiles
    | "action_day_start"
    | "daily_greeting_morning"
    | "daily_greeting_evening"
    | "streak_risk_intervention" // Nueva situación basada en analytics
    | "custom_prompt"; 
  customPromptDetails?: string; 
  currentStreakDays?: number;
  analyticsInsights?: SkiAdaptiveContext | null; // Insights de analytics.service
}

export interface StreakCelebrationInput {
  userName: string;
  streakDays: number;
  analyticsInsights?: SkiAdaptiveContext | null; // Para refinar el mensaje o sugerencia de recompensa
}

export interface DailyMotivationInput {
  userName?: string;
  // Reemplazar userLearningPatterns con una estructura más rica de UserAnalytics
  analyticsInfo: Pick<UserAnalytics, "optimal_learning_time_start" | "optimal_learning_time_end" | "streak_risk_level" | "streak_intervention_strategies" | "key_insights" | "overall_engagement_score"> & {
    // Podríamos añadir aquí datos de rendimiento del último día si no están ya en key_insights
    lastDayPerformance?: 'good' | 'average' | 'struggled'; // Ejemplo
  };
}


// --- System Prompts ---

// --- Service Functions ---

/**
 * Generates a contextual motivational message from Ski the Fox.
 */
export async function getSkiMotivationalMessage(
  input: SkiMessageInput
): Promise<SkiMessage | null> {
  const { userContext, situation, customPromptDetails, currentStreakDays, analyticsInsights } = input;

  let userMessageForLlm = `Generate a Ski the Fox message.
Situation: ${situation}.
User Name: ${userContext.name || 'Learner'}.
Current Skill (if relevant): ${userContext.skill || 'their learning journey'}.
Experience Level (if relevant): ${userContext.experience || 'any'}.
Daily Time (if relevant): ${userContext.time || 'any'}.
Current Streak (if relevant and > 0): ${currentStreakDays || 0} days.
`;

  if (analyticsInsights) {
    userMessageForLlm += `\nUser Analytics Insights (use these to personalize the tone and content):
    ${analyticsInsights.key_insights ? `- Key Insights: ${analyticsInsights.key_insights.join(', ')}` : ''}
    ${analyticsInsights.streak_maintenance_analysis ? `- Streak Risk: ${analyticsInsights.streak_maintenance_analysis.risk_level}` : ''}
    ${analyticsInsights.overall_engagement_score ? `- Engagement Score: ${analyticsInsights.overall_engagement_score}` : ''}
`;
  }

  if (situation === "custom_prompt" && customPromptDetails) {
    userMessageForLlm += `Specific details for this message: ${customPromptDetails}\n`;
  }
  if (situation === "streak_risk_intervention" && analyticsInsights?.streak_maintenance_analysis?.intervention_strategies) {
      userMessageForLlm += `Focus on this intervention strategy: ${analyticsInsights.streak_maintenance_analysis.intervention_strategies[0]}\n`;
  }

  userMessageForLlm += `Please craft a message according to Ski's personality and the system prompt.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT_SKI_THE_FOX },
    { role: 'user', content: userMessageForLlm },
  ];

  console.log(`Requesting Ski message for situation: "${situation}"`);
  const response: LlmResponse = await getOpenAiChatCompletion({
    messages,
    model: config.openaiModel, 
    temperature: 0.75, 
    response_format: { type: 'json_object' },
  });

  if (!response.success || !response.content) {
    console.error('Error generating Ski message from OpenAI:', response.error);
    return null;
  }
  try {
    const rawResult = JSON.parse(response.content);
    const validatedResult = SkiMessageSchema.parse(rawResult);
    console.log(`Ski message generated: "${validatedResult.message}"`);
    return validatedResult;
  } catch (error) {
    if (error instanceof z.ZodError) console.error('Zod validation error for SkiMessage:', error.errors);
    else console.error('Error parsing JSON for SkiMessage:', error);
    console.error('Original OpenAI content:', response.content);
    return null;
  }
}

/**
 * Generates a streak celebration message from Ski the Fox.
 */
export async function getSkiStreakCelebration(
  input: StreakCelebrationInput
): Promise<StreakCelebration | null> {
  const { userName, streakDays, analyticsInsights } = input;

  let milestoneText = `¡${streakDays} días seguidos!`;
  if (streakDays === 3) milestoneText = "¡PRIMERA META! 3 días seguidos";
  else if (streakDays === 7) milestoneText = "¡UNA SEMANA COMPLETA! Esto se está volviendo un hábito";
  else if (streakDays === 14) milestoneText = "¡DOS SEMANAS! Eres imparable";
  else if (streakDays === 30) milestoneText = "¡UN MES ENTERO! Eres oficialmente una leyenda";
  else if (streakDays === 50) milestoneText = "¡50 DÍAS! Medio centenar de aprendizaje";
  else if (streakDays === 100) milestoneText = "¡100 DÍAS! Eres un MAESTRO del aprendizaje constante";

  let userMessageForLlm = `User: ${userName}
Streak: ${streakDays} days
Milestone context: ${milestoneText}
`;
  userMessageForLlm += `Generate an enthusiastic Ski the Fox streak celebration.`;


  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT_STREAK_CELEBRATION },
    { role: 'user', content: userMessageForLlm },
  ];

  console.log(`Requesting Ski streak celebration for ${userName} at ${streakDays} days.`);
  const response: LlmResponse = await getOpenAiChatCompletion({
    messages,
    model: config.openaiModel,
    temperature: 0.8, 
    response_format: { type: 'json_object' },
  });

  if (!response.success || !response.content) {
    console.error('Error generating Ski streak celebration:', response.error);
    return null;
  }
  try {
    const rawResult = JSON.parse(response.content);
    const validatedResult = StreakCelebrationSchema.parse(rawResult);
    if (validatedResult.streak_count !== streakDays) {
        console.warn(`Streak count mismatch from LLM. Input: ${streakDays}, LLM: ${validatedResult.streak_count}. Overriding with input.`);
        validatedResult.streak_count = streakDays;
    }
    console.log(`Ski streak celebration generated for ${userName}.`);
    return validatedResult;
  } catch (error) {
    if (error instanceof z.ZodError) console.error('Zod validation error for StreakCelebration:', error.errors);
    else console.error('Error parsing JSON for StreakCelebration:', error);
    console.error('Original OpenAI content:', response.content);
    return null;
  }
}

/**
 * Generates a daily personalized motivation structure for Ski, using rich analytics info.
 */
export async function getSkiDailyMotivation( // Renamed from getSkiDailyMotivationAnalysis for clarity
  input: DailyMotivationInput
): Promise<DailyMotivation | null> {
  const { userName, analyticsInfo } = input;

  let userMessageForLlm = `Generate a daily motivation structure for Ski the Fox.
User Name: ${userName || 'Learner'}.
User Analytics Info:
${JSON.stringify(analyticsInfo, null, 2)}
`;
  userMessageForLlm += `Craft the greeting, motivation, reminder, and signoff according to Ski's personality and considering these patterns from analyticsInfo.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT_MOTIVATIONAL_ANALYST },
    { role: 'user', content: userMessageForLlm },
  ];

  console.log(`Requesting Ski daily motivation for ${userName || 'user'}.`);
  const response: LlmResponse = await getOpenAiChatCompletion({
    messages,
    model: config.openaiModel,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  if (!response.success || !response.content) {
    console.error('Error generating Ski daily motivation:', response.error);
    return null;
  }
  try {
    const rawResult = JSON.parse(response.content);
    const validatedResult = DailyMotivationSchema.parse(rawResult);
    console.log(`Ski daily motivation generated for ${userName || 'user'}.`);
    return validatedResult;
  } catch (error) {
    if (error instanceof z.ZodError) console.error('Zod validation error for DailyMotivation:', error.errors);
    else console.error('Error parsing JSON for DailyMotivation:', error);
    console.error('Original OpenAI content:', response.content);
    return null;
  }
}

export const SKI_PHRASES_TS = {
    greetings: [
        "¡Hola amigo! 🦊",
        "¡Hey! ¿Listo para aprender? 🎯",
        "¡Qué alegría verte! 🌟",
        "¡Aquí estamos de nuevo! 💪"
    ],
    celebrations: [
        "¡Eso es! ¡Lo lograste! 🎉",
        "¡WOW! ¡Eres increíble! 🚀",
        "¡Sigue así, campeón! 🏆",
        "¡Me encanta tu progreso! 💖"
    ],
    encouragements: [
        "¡Tú puedes! Solo un poco más 💪",
        "Cada paso cuenta, ¡sigue adelante! 🦊",
        "¡Estoy orgulloso de ti! 🌟",
        "¡No te rindas, casi lo logras! 🎯"
    ]
};
