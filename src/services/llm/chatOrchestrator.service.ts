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
import { UserAnalytics, OptimalLearningTime, StreakMaintenance, LearningPattern, ContentOptimization } from './schemas'; 
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
    "optimal_learning_time" | 
    "streak_maintenance_analysis" | 
    "learning_patterns" | 
    "content_optimization"
  > | null;
  // Campo para pasar datos detallados cargados bajo demanda por el controlador
  detailedContext?: {
    learningPlan?: any; // Aquí iría el tipo LearningPlan completo si se carga
    dayContent?: any;   // Aquí iría el tipo DayContent completo si se carga
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
    if (analytics.optimal_learning_time) {
      contextStringForLlm += `  - Optimal Learning Window: ${analytics.optimal_learning_time.best_time_window_start} - ${analytics.optimal_learning_time.best_time_window_end} (Reason: ${analytics.optimal_learning_time.reason})\n`;
    }
    if (analytics.content_optimization) {
      contextStringForLlm += `  - Content Suggestions: Difficulty should be '${analytics.content_optimization.difficulty_adjustment}'. User prefers: ${analytics.content_optimization.content_type_preferences?.join('/') || 'varied types'}. Ideal session: ${analytics.content_optimization.ideal_session_length_minutes} mins. Pacing: ${analytics.content_optimization.pacing_recommendation}\n`;
    }
     if (analytics.streak_maintenance_analysis) {
      contextStringForLlm += `  - Streak Status: Risk level is '${analytics.streak_maintenance_analysis.risk_level}'. Potential factors: ${analytics.streak_maintenance_analysis.risk_factors?.join(', ') || 'N/A'}.\n`;
    }
    if (typeof analytics.overall_engagement_score === 'number') { 
        contextStringForLlm += `  - Current Engagement Score: ${analytics.overall_engagement_score.toFixed(2)}/1.0\n`;
    }
    if (analytics.learning_patterns && analytics.learning_patterns.length > 0) {
        contextStringForLlm += `  - Identified Learning Patterns: ${analytics.learning_patterns.map(p => p.description).join('; ')}\n`;
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

  if (chatHistory.length > 0) {
    const recentHistory = chatHistory.slice(-10); 
    // Correctly map ChatMessage[] to OpenAI.Chat.ChatCompletionMessageParam[]
    const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = recentHistory.map(
      (msg: ChatMessage): OpenAI.Chat.ChatCompletionMessageParam => {
        // The 'as const' assertions help TypeScript narrow down the role type.
        // Alternatively, use if/else if/else as shown in thought process.
        if (msg.role === 'user') {
          return { role: msg.role, content: msg.content };
        } else if (msg.role === 'assistant') {
          return { role: msg.role, content: msg.content };
        } else { // system
          return { role: msg.role, content: msg.content };
        }
      }
    );
    messages.push(...historyMessages);
  }

  messages.push({
    role: 'user',
    content: `${contextStringForLlm}\nUser Message: ${userInput}`,
  });

  console.log(`Requesting chat response for user: ${chatContext.user.firebaseUid}. Context string length: ${contextStringForLlm.length}, History items: ${messages.filter(m => m.role !== 'system').length -1 }`); // Log actual history items sent

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
    
    console.log(`Chat response generated and validated for user: ${chatContext.user.firebaseUid}`);
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
