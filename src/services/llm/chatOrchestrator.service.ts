// src/services/llm/chatOrchestrator.service.ts

import { z } from 'zod';
import { getOpenAiChatCompletion, LlmResponse } from './openai.service';
import { getConfig } from '../../config';
import OpenAI from 'openai';

// Importar tipos relevantes de otros servicios para el contexto
// Importar schemas y tipos desde el archivo centralizado
import { 
  ChatResponseSchema,
  type ChatMessage, 
  type ChatResponse 
} from './schemas';
import { UserAnalytics, LearningPlan, DayContent } from './schemas';
import { UserDataForContent } from './contentGenerator.service'; 
import { SYSTEM_PROMPT_CHAT_ORCHESTRATOR } from './prompts';

const config = getConfig();

// --- Contexto que se puede pasar al chat orchestrator ---

export interface ChatContext {
  user: Partial<UserDataForContent> & { firebaseUid: string; internalDbId?: string };
  currentSkill?: string | null;
  currentLearningPlanSummary?: { 
    planId: string;
    skillName: string;
    totalDurationWeeks: number;
    currentDayNumber?: number; 
    currentSectionTitle?: string; 
    nextDayTitle?: string; 
    milestones?: string[];
  } | null;
  recentDayContentSummary?: { 
    dayTitle: string;
    objectives: string[];
    focusArea?: string; 
    keyConcepts?: Array<{ term: string; definition: string }>; // Conceptos clave del día
    // Podrías añadir un resumen muy breve del contenido principal si es útil
    // mainContentSummary?: string; 
  } | null;
  userAnalyticsSummary?: Pick<UserAnalytics, 
    "key_insights" | 
    "overall_engagement_score" | 
    "optimal_learning_time_start" | 
    "optimal_learning_time_end" | 
    "optimal_learning_time_reasoning" |
    "streak_risk_level" | 
    "streak_intervention_strategies" | 
    "content_difficulty_recommendation" |
    "ideal_session_length_minutes"
  > | null;
  // Campo para pasar datos detallados cargados bajo demanda por el controlador
  detailedContext?: {
    learningPlan?: Partial<LearningPlan>; // Detalles completos del plan si se cargan
    dayContent?: Partial<DayContent>;   // Detalles completos del día si se cargan
    // Otros datos específicos
  } | null;
}

export interface ChatTurnInput {
  userInput: string;
  chatHistory?: ChatMessage[]; 
  chatContext: ChatContext;
}

export async function orchestrateChatResponse(
  input: ChatTurnInput
): Promise<ChatResponse | null> {
  const { userInput, chatHistory = [], chatContext } = input;

  let contextStringForLlm = "--- Relevant Context for Ski the Chatbot ---\n";
  contextStringForLlm += `User: ${chatContext.user.name || 'Learner'} (FirebaseUID: ${chatContext.user.firebaseUid})\n`;
  if (chatContext.user.skill) {
    contextStringForLlm += `- Current Skill Focus: ${chatContext.user.skill}\n`;
  } else if (chatContext.currentSkill) {
    contextStringForLlm += `- Current Skill Focus: ${chatContext.currentSkill}\n`;
  }

  if (chatContext.currentLearningPlanSummary) {
    const plan = chatContext.currentLearningPlanSummary;
    contextStringForLlm += `- Active Learning Plan: '${plan.skillName}' (ID: ${plan.planId})\n`;
    contextStringForLlm += `  - Progress: Around Day ${plan.currentDayNumber || 'N/A'} of ${plan.totalDurationWeeks} weeks.\n`;
    if (plan.currentSectionTitle) contextStringForLlm += `  - Current Section: '${plan.currentSectionTitle}'\n`;
    if (plan.nextDayTitle) contextStringForLlm += `  - Next Day Topic: '${plan.nextDayTitle}'\n`;
    if (plan.milestones && plan.milestones.length > 0) {
      contextStringForLlm += `  - Key Plan Milestones: ${plan.milestones.join('; ')}\n`;
    }
  }

  if (chatContext.recentDayContentSummary) {
    const content = chatContext.recentDayContentSummary;
    contextStringForLlm += `- Recently Viewed Content Summary ('${content.dayTitle}'):\n`;
    if (content.focusArea) contextStringForLlm += `    - Focus Area: ${content.focusArea}\n`;
    contextStringForLlm += `    - Objectives: ${content.objectives.join('; ')}\n`;
    if (content.keyConcepts && content.keyConcepts.length > 0) {
      contextStringForLlm += `    - Key Concepts: ${content.keyConcepts.map(kc => `${kc.term}: "${kc.definition}"`).join('; ')}\n`;
    }
  }

  if (chatContext.userAnalyticsSummary) {
    const analytics = chatContext.userAnalyticsSummary;
    contextStringForLlm += "- User Learning Insights Summary:\n";
    if (analytics.key_insights && analytics.key_insights.length > 0) {
      contextStringForLlm += `  - General Observations: ${analytics.key_insights.join('; ')}\n`;
    }
    if (analytics.optimal_learning_time_start && analytics.optimal_learning_time_end) {
      contextStringForLlm += `  - Optimal Learning Window: ${analytics.optimal_learning_time_start} - ${analytics.optimal_learning_time_end}${analytics.optimal_learning_time_reasoning ? ` (Reason: ${analytics.optimal_learning_time_reasoning})` : ''}\n`;
    }
    if (analytics.content_difficulty_recommendation || analytics.ideal_session_length_minutes) {
      contextStringForLlm += `  - Content Suggestions:${analytics.content_difficulty_recommendation ? ` Difficulty: ${analytics.content_difficulty_recommendation}.` : ''}${analytics.ideal_session_length_minutes ? ` Ideal session: ${analytics.ideal_session_length_minutes} mins.` : ''}\n`;
    }
    if (analytics.streak_risk_level) {
      contextStringForLlm += `  - Streak Status: Risk level is '${analytics.streak_risk_level}'.${analytics.streak_intervention_strategies?.length ? ` Strategies: ${analytics.streak_intervention_strategies.join(', ')}.` : ''}\n`;
    }
    if (typeof analytics.overall_engagement_score === 'number') { 
        contextStringForLlm += `  - Current Engagement Score: ${analytics.overall_engagement_score.toFixed(2)}/1.0\n`;
    }
  }
  
  if (chatContext.detailedContext) {
    contextStringForLlm += "- Detailed Context (fetched on demand):\n";
    if (chatContext.detailedContext.learningPlan) {
        contextStringForLlm += `  - Full Learning Plan Details: (Summary/Relevant parts of ${JSON.stringify(chatContext.detailedContext.learningPlan).substring(0, 300)}...)\n`; 
    }
    if (chatContext.detailedContext.dayContent) {
        contextStringForLlm += `  - Full Day Content Details: (Summary/Relevant parts of ${JSON.stringify(chatContext.detailedContext.dayContent).substring(0, 300)}...)\n`; 
    }
  }
  contextStringForLlm += "-------------------------------------------\n";

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT_CHAT_ORCHESTRATOR },
  ];

  messages.push({
    role: 'user',
    content: contextStringForLlm,
  });

  let historyItemCount = 0;
  if (chatHistory.length > 0) {
    const recentHistory = chatHistory.slice(-10);
    historyItemCount = recentHistory.length;
    // Correctly map ChatMessage[] to OpenAI.Chat.ChatCompletionMessageParam[]
    const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = recentHistory.map(
      (msg: ChatMessage): OpenAI.Chat.ChatCompletionMessageParam => ({ role: msg.role, content: msg.content })
    );
    messages.push(...historyMessages);
  }

  messages.push({
    role: 'user',
    content: userInput,
  });

  const response: LlmResponse = await getOpenAiChatCompletion({
    messages,
    model: config.openaiModel, 
    temperature: 0.6, 
    response_format: { type: 'json_object' },
  });

  if (!response.success || !response.content) {
    console.error('Error in OpenAI chat response generation:', response.error);
    return { 
        responseText: "Lo siento, no puedo responder en este momento. Por favor, intenta de nuevo más tarde. 🦊",
        needs_more_info_prompt: null,
        suggested_actions: []
    };
  }

  try {
    const rawResult = JSON.parse(response.content);
    const validatedResult = ChatResponseSchema.parse(rawResult);
    
    return validatedResult;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error for ChatResponse:', error.errors);
    } else {
      console.error('Error parsing JSON response for ChatResponse from OpenAI:', error);
    }
    console.error('Original OpenAI content that failed parsing/validation:', response.content);
    return { 
        responseText: "Tuve un pequeño problema procesando esa información. ¿Podrías intentar reformular tu pregunta? 🦊",
        needs_more_info_prompt: null,
        suggested_actions: []
    };
  }
}
