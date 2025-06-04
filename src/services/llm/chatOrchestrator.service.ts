// src/services/llm/chatOrchestrator.service.ts

import { z } from 'zod';
import { getOpenAiChatCompletion, LlmResponse } from './openai.service';
import { getConfig } from '../../config';
import OpenAI from 'openai';

// Importar tipos relevantes de otros servicios para el contexto
// SkillAnalysis no se usa directamente en ChatContext, pero UserSkillContext sí (implícito en UserDataForContent)
// LearningPlan y DayContent (los tipos completos) no se pasan en cada turno, solo resúmenes.
// El controlador los cargaría bajo demanda si el chatbot lo solicita.
import { UserAnalytics, OptimalLearningTime, StreakMaintenance, LearningPattern, ContentOptimization } from './analytics.service'; 
import { UserDataForContent } from './contentGenerator.service'; 

const config = getConfig();

// --- Zod Schemas and TypeScript Types ---

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Contexto que se puede pasar al chat orchestrator
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

export const ChatResponseSchema = z.object({
  responseText: z.string().min(1).describe("The chatbot's textual response to the user."),
  suggested_actions: z.array(z.object({
    action_type: z.string().describe("e.g., 'navigate_to_day', 'show_glossary_term', 'fetch_day_details'"),
    display_text: z.string().describe("Text to show for the action button/link."),
    payload: z.record(z.string(), z.any()).optional().describe("Data needed to perform the action, e.g., { dayNumber: 3 }"),
  })).optional().describe("Optional suggested actions the user can take next."),
  needs_more_info_prompt: z.string().nullable().optional().describe("If the chatbot needs more specific info from the user OR from the system (to be fetched by controller)."),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;


const SYSTEM_PROMPT_CHAT_ORCHESTRATOR = `You are Ski the Chatbot, a friendly, helpful, and knowledgeable AI assistant for the Skillix learning platform. Your goal is to provide contextually relevant support to users about their learning journey.

**CRITICAL: You MUST heavily rely on the provided 'ChatContext'. Do not invent information if it's not in the context or your general knowledge relevant to the skill.**

You will receive:
1.  User's current message.
2.  Chat history.
3.  'ChatContext' containing:
    * \`user\`: Info like name, current skill.
    * \`currentLearningPlanSummary\`: Overview of their active plan (skill, current day, next day, milestones).
    * \`recentDayContentSummary\`: Details of a recent learning day (title, objectives, focus area, key concepts).
    * \`userAnalyticsSummary\`: Insights on learning patterns, engagement, optimal times, streak risks, content suggestions (\`key_insights\`, \`optimal_learning_time\`, \`streak_maintenance_analysis\`, \`learning_patterns\`, \`content_optimization\`).
    * \`detailedContext\` (optional): This field might contain full \`LearningPlan\` or \`DayContent\` objects if the system fetched them based on a previous request from you. Check this first if you previously asked for more details.

**Your Responsibilities & How to Use Context:**

1.  **Answer Questions about Skillix Platform:** General platform features.
2.  **Clarify Learning Content:**
    * If user asks about concepts from content summarized in \`recentDayContentSummary\`, use its \`objectives\`, \`focusArea\`, and especially \`keyConcepts\` to explain.
    * If user asks about content from a day NOT in \`recentDayContentSummary\` or \`detailedContext.dayContent\`, you MUST state that you don't have the specific details for that day in your current view. Respond by setting \`needs_more_info_prompt\` to something like, "I can help with that! To give you the best answer about Day X, I'll need to look up its specific content. Shall I fetch the details for Day X?" You can also suggest an action: \`suggested_actions: [{ "action_type": "fetch_day_details", "display_text": "Get details for Day X", "payload": {"day_identifier": "X"} }]\`.
3.  **Discuss Current Skill:** Use \`user.skill\` or \`currentLearningPlanSummary.skillName\` for context.
4.  **Provide Encouragement & Support:**
    * Use \`userAnalyticsSummary.key_insights\`, \`overall_engagement_score\`, or \`streak_maintenance_analysis\` to offer personalized encouragement.
    * If \`streak_maintenance_analysis.risk_level\` is 'high', your tone should be particularly supportive.
5.  **Use Provided Context Deeply:**
    * "What's next?": Use \`currentLearningPlanSummary.nextDayTitle\` or general plan structure.
    * "What did I learn recently?": Use \`recentDayContentSummary\`.
    * "How am I doing? / What to focus on?": Use \`userAnalyticsSummary.key_insights\`, \`userAnalyticsSummary.learning_patterns\`, and \`userAnalyticsSummary.content_optimization\`. Example: "Based on your recent progress, focusing on [specific area from insights] could be beneficial. You've shown great understanding of [strength from insights]!"
6.  **Handle Vague Questions:** If a question is ambiguous, ask for clarification using \`needs_more_info_prompt\`.
7.  **Suggest Actions (Optional):** Populate \`suggested_actions\` for relevant next steps.
8.  **Admit Limitations:** If you don't know or it's out of scope, say so.

**Output Structure (JSON matching 'ChatResponse'):**
{
  "responseText": "Your textual answer.",
  "suggested_actions": [ { "action_type": "...", "display_text": "...", "payload": {...} } ] or null,
  "needs_more_info_prompt": "Your question for clarification, or if you need the system to fetch more data." or null
}

**Example Interaction Flow (if user asks about Day 3, but context is Day 5):**
User: "What were the key concepts for Day 3?"
Your JSON Response:
{
  "responseText": "I have the details for your recent content (Day 5) handy. To tell you about Day 3, I'd need to look that up specifically.",
  "suggested_actions": [{ "action_type": "fetch_day_details", "display_text": "Yes, get details for Day 3", "payload": {"dayNumber": 3} }],
  "needs_more_info_prompt": null
}
(The system/controller would then see "fetch_day_details", get Day 3 content, and re-prompt you with it in \`detailedContext.dayContent\` for the next turn).
`;

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
