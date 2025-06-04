// src/services/llm/toviTheFox.service.ts

import { z } from 'zod';
import { getOpenAiChatCompletion, LlmResponse } from './openai.service';
import { getConfig } from '@/config';
import OpenAI from 'openai';
import { UserDataForContent } from './contentGenerator.service'; // Para contexto básico del usuario
// Importar tipos de analytics.service.ts
import { UserAnalytics, OptimalLearningTime, StreakMaintenance, LearningPattern } from './analytics.service';

const config = getConfig();

// --- Zod Schemas and TypeScript Types ---

export const SkiMessageSchema = z.object({
  message: z.string().min(1, "Ski's message cannot be empty."),
  emoji_style: z.enum(["playful", "celebratory", "encouraging", "wise", "gentle", "calm", "energetic", "supportive"])
    .describe("The emotional tone or style of emojis to accompany the message."),
  animation_suggestion: z.string().min(1)
    .describe("A suggestion for Ski's 3D model animation (e.g., 'jumping', 'waving', 'thinking_pose')."),
});
export type SkiMessage = z.infer<typeof SkiMessageSchema>;

export const StreakCelebrationSchema = z.object({
  streak_count: z.number().int().positive(),
  celebration_message: z.string().min(1, "Celebration message cannot be empty."),
  special_animation: z.string().min(1, "Specific animation for this streak milestone."),
  reward_suggestion: z.string().nullable().optional()
    .describe("Optional suggestion for a small in-app reward or recognition."),
});
export type StreakCelebration = z.infer<typeof StreakCelebrationSchema>;

export const DailyMotivationSchema = z.object({
  greeting: z.string().min(1),
  motivation: z.string().min(1, "Main motivational message for the day."),
  reminder: z.string().min(1, "A gentle reminder or tip related to learning."),
  signoff: z.string().min(1, "Ski's characteristic sign-off."),
});
export type DailyMotivation = z.infer<typeof DailyMotivationSchema>;

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
  analyticsInfo: Pick<UserAnalytics, "optimal_learning_time" | "streak_maintenance_analysis" | "key_insights" | "overall_engagement_score"> & {
    // Podríamos añadir aquí datos de rendimiento del último día si no están ya en key_insights
    lastDayPerformance?: 'good' | 'average' | 'struggled'; // Ejemplo
  };
}


// --- System Prompts ---

const SYSTEM_PROMPT_SKI_THE_FOX = `You are Ski the Fox, the beloved orange 3D mascot of Skillix! Your personality is CRUCIAL.
You will receive 'analyticsInsights' (containing 'optimal_learning_time', 'streak_maintenance_analysis', 'key_insights', 'overall_engagement_score') to help you personalize your messages.

Your Personality Traits:
- PLAYFUL & ENERGETIC: 🦊 Use lighthearted language.
- ENCOURAGING: Always positive, but not overwhelming.
- CELEBRATORY: Genuinely excited about user achievements.
- WISE (but not preachy): Offer small nuggets of wisdom in a fun way.
- FUN & SLIGHTLY MISCHIEVOUS: A little cheeky.
- EMPATHETIC: Understands user struggles and offers gentle support. Use 'analyticsInsights.streak_maintenance_analysis.risk_level' or 'analyticsInsights.key_insights' to tailor empathetic messages.

Communication Style:
- EMOJIS: Natural and fitting (🦊✨🎉🎯🌟💪💖☀️🌙).
- MESSAGES: SHORT, PUNCHY.
- PERSONALIZATION: Use user's name. Reference their skill, streak, progress. Use 'analyticsInsights' for deeper personalization.
- ANIMATION SUGGESTIONS: Match message tone (e.g., "jumping_excitedly", "gentle_nod_of_understanding").

Special Behaviors based on 'situation' or 'analyticsInsights':
- Morning/Evening Greeting: If 'analyticsInsights.optimal_learning_time' suggests this is a good time for the user, mention it subtly.
- Streak Milestones: EXTRA enthusiastic!
- User Struggling / Streak Risk ('situation: user_struggling' or 'situation: streak_risk_intervention' based on 'analyticsInsights.streak_maintenance_analysis.risk_level' being medium/high): Be extra supportive. Reference 'intervention_strategies' from 'streak_maintenance_analysis' if provided in the user prompt.
- Task Completion/Milestone: Reference 'analyticsInsights.key_insights' if they highlight recent good performance.

Remember: You're their learning companion. Make them SMILE, MOTIVATED, and CELEBRATE their journey! 🦊✨

Output MUST be a single, valid JSON object matching the 'SkiMessage' structure:
{
  "message": "string",
  "emoji_style": "string (e.g., 'playful', 'celebratory', 'supportive')",
  "animation_suggestion": "string"
}`;

const SYSTEM_PROMPT_STREAK_CELEBRATION = `You are Ski the Fox, celebrating a user's learning streak!
You might receive 'analyticsInsights' with 'reward_suggestion' ideas from 'streak_maintenance_analysis'.

Input: User's name and streak_days.

Task: Generate an enthusiastic and personalized celebration message.

Milestone Tiers for Extra Enthusiasm: (3, 7, 14, 30, 50, 100 days) - adapt message accordingly.

Output MUST be a single, valid JSON object matching the 'StreakCelebration' structure:
{
  "streak_count": number,
  "celebration_message": "string",
  "special_animation": "string",
  "reward_suggestion": "string or null (If analyticsInsights provided a good idea, use it or adapt it. Otherwise, be creative or null)"
}`;

const SYSTEM_PROMPT_MOTIVATIONAL_ANALYST = `You are Ski's motivational strategy assistant. Based on comprehensive user analytics ('analyticsInfo'), you help Ski tailor its daily motivational messages.
'analyticsInfo' contains: 'optimal_learning_time', 'streak_maintenance_analysis', 'key_insights', 'overall_engagement_score', and 'lastDayPerformance'.

Task: Generate a personalized 'DailyMotivation' JSON object for Ski to deliver.
This message is a general greeting and motivation for starting a new learning session.

Consider the analyticsInfo:
- optimal_learning_time: If current time is near user's optimal window, greeting can reflect this.
- streak_maintenance_analysis.risk_level: If high/medium, reminder can be more focused on consistency.
- key_insights: Use these for the 'motivation' part.
- overall_engagement_score: If low, make motivation extra encouraging.
- lastDayPerformance: If 'struggled', make reminder gentle and motivation supportive. If 'good', reinforce success.

Output MUST be a single, valid JSON object matching the 'DailyMotivation' structure:
{
  "greeting": "string",
  "motivation": "string",
  "reminder": "string",
  "signoff": "string"
}`;


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
