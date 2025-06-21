// src/services/llm/contentGenerator.service.ts

import { z } from 'zod';
import { getOpenAiChatCompletion, LlmResponse } from './openai.service';
import { getConfig } from '@/config';
import OpenAI from 'openai';
import { UserSkillContext } from './skillAnalyzer.service';

// Importar schemas y tipos desde el archivo centralizado
import {
  ActionTaskSchema,
  DayContentSchema,
  type SkillAnalysis,
  type ActionTask,
  type DayContent
} from './schemas';

// Importar tipos de analytics.service.ts para los insights
import { ContentOptimization, LearningPattern } from './schemas';
import { SYSTEM_PROMPT_CONTENT_GENERATOR, SYSTEM_PROMPT_ACTION_DAY_CREATOR } from './prompts';

const config = getConfig();

// --- Input Interfaces for Service Functions ---
export interface DayInfoForContent { 
  day_number: number;
  title: string;
  focus_area: string;
  is_action_day: boolean;
  objectives?: string[]; 
}

export interface UserDataForContent extends UserSkillContext { 
  name?: string; 
  skill: string; 
  learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | string; 
  preferred_study_time?: 'morning' | 'afternoon' | 'evening' | 'flexible' | string;
  learning_context?: 'career_change' | 'skill_improvement' | 'hobby' | 'academic' | 'promotion' | string;
  challenge_preference?: 'gradual' | 'moderate' | 'intense' | string;
}

// Definición más específica para adaptiveInsights
export interface AdaptiveInsightsForContent {
    content_optimization?: ContentOptimization; // De analytics.service
    relevant_learning_patterns?: LearningPattern[]; // De analytics.service
    key_insights?: string[]; // De analytics.service
    // Puedes añadir más campos específicos si son necesarios
}

export interface ContentGenerationInput {
  dayInfo: DayInfoForContent;
  userData: UserDataForContent;
  previousDayContentSummary?: { 
    title: string;
    userPerformance?: string; // e.g., "completed successfully", "struggled with quizzes"
  };
  adaptiveInsights?: AdaptiveInsightsForContent | null; // Usar el tipo más específico
}

export interface ActionDayInput {
  dayInfo: DayInfoForContent; 
  userData: UserDataForContent;
  skillAnalysisContext: SkillAnalysis; 
  adaptiveInsights?: AdaptiveInsightsForContent | null; // Usar el tipo más específico
}

// --- Service Functions ---

function buildContentGenerationUserMessage(input: ContentGenerationInput): string {
  const { dayInfo, userData, previousDayContentSummary, adaptiveInsights } = input;
  let userMessage = `Generate engaging daily learning content for Skillix.

Target User Profile:
- Name: ${userData.name || 'Learner'}
- Skill: ${userData.skill}
- Experience Level: ${userData.experience}
- Available Daily Time: ${userData.time}
- Preferred Learning Style: ${userData.learning_style}
- Learning Goal: ${userData.goal}
${userData.preferred_study_time ? `- Preferred Study Time: ${userData.preferred_study_time}` : ''}
${userData.learning_context ? `- Learning Context: ${userData.learning_context}` : ''}
${userData.challenge_preference ? `- Challenge Preference: ${userData.challenge_preference}` : ''}

Day Specifics:
- Day Number: ${dayInfo.day_number}
- Day Title: ${dayInfo.title}
- Focus Area: ${dayInfo.focus_area}
- Is Action Day: ${dayInfo.is_action_day}
${dayInfo.objectives ? `- Objectives for today: ${dayInfo.objectives.join(', ')}` : ''}
`;

  if (previousDayContentSummary) {
    userMessage += `\nPrevious Day Summary:
- Title: ${previousDayContentSummary.title}
${previousDayContentSummary.userPerformance ? `- User Performance: ${previousDayContentSummary.userPerformance}` : ''}
`;
  }
  if (adaptiveInsights) {
    userMessage += `\nAdaptive Learning Insights to consider (use these to tailor content, difficulty, and style):
${JSON.stringify(adaptiveInsights, null, 2)}
`;
  }
  userMessage += `\nRemember to adhere strictly to the 'DayContent' JSON output structure and all guidelines provided in the system prompt. If 'is_action_day' is true, set 'main_content' to null and 'action_task' to null (it will be generated separately). Ensure 'main_content.type' matches user's learning style if specified as 'audio' or 'read' for non-action days, but give preference to 'adaptiveInsights.content_optimization.content_type_preferences' if available.`;
  return userMessage;
}

function buildActionDayUserMessage(input: ActionDayInput): string {
  const { dayInfo, userData, skillAnalysisContext, adaptiveInsights } = input;
   let userMessage = `Design an Action Day challenge for Skillix.

Target User Profile:
- Name: ${userData.name || 'Learner'}
- Skill: ${userData.skill}
- Experience Level: ${userData.experience}
- Available Daily Time: ${userData.time}
- Learning Goal: ${userData.goal}
${userData.preferred_study_time ? `- Preferred Study Time: ${userData.preferred_study_time}` : ''}
${userData.learning_context ? `- Learning Context: ${userData.learning_context}` : ''}
${userData.challenge_preference ? `- Challenge Preference: ${userData.challenge_preference}` : ''}

Action Day Specifics:
- Day Number: ${dayInfo.day_number}
- Day Title: ${dayInfo.title}
- Focus Area for this Action Day: ${dayInfo.focus_area}
`;
  if (skillAnalysisContext) {
    userMessage += `\nOverall Skill Context (from Skill Analysis):
- Skill Category: ${skillAnalysisContext.skillCategory}
- Key Components relevant to this action day: (Focus on components related to '${dayInfo.focus_area}')
`;
  }
  if (adaptiveInsights) {
    userMessage += `\nAdaptive Learning Insights to consider for challenge design (especially 'difficulty_adjustment'):
${JSON.stringify(adaptiveInsights, null, 2)}
`;
  }
  userMessage += `\nRemember to adhere strictly to the 'ActionTask' JSON output structure and all guidelines provided in the system prompt. Set the 'difficulty_adaptation' field in the JSON based on 'adaptiveInsights.content_optimization.difficulty_adjustment'.`;
  return userMessage;
}

export async function generateDailyContentStructureWithOpenAI(
  input: ContentGenerationInput
): Promise<DayContent | null> {

  const userMessage = buildContentGenerationUserMessage(input);
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT_CONTENT_GENERATOR },
    { role: 'user', content: userMessage },
  ];

  const response: LlmResponse = await getOpenAiChatCompletion({
    messages,
    model: config.openaiModel, 
    temperature: 0.7, 
    response_format: { type: 'json_object' },
  });

  if (!response.success || !response.content) {
    console.error('Error in OpenAI daily content structure generation:', response.error);
    return null;
  }

  try {
    const rawResult = JSON.parse(response.content);
    if (rawResult.is_action_day) {
        rawResult.main_content = null;
        rawResult.exercises = rawResult.exercises || null; 
        rawResult.action_task = null; 
    } else { 
        rawResult.action_task = null;
        if (rawResult.main_content === undefined || rawResult.main_content === null) {
             console.error("LLM Error: Non-action day MUST have main_content. LLM did not provide it.");
             console.error("Raw LLM output for non-action day missing main_content:", rawResult);
             throw new Error("Non-action day generated without main_content by LLM.");
        }
        rawResult.exercises = rawResult.exercises || []; 
    }

    const validatedResult = DayContentSchema.parse(rawResult);
    
    if (validatedResult.is_action_day && validatedResult.main_content !== null) {
        console.warn(`Action day (Day ${validatedResult.title}) structure has non-null main_content. Overriding to null.`);
        validatedResult.main_content = null;
    }
    if (!validatedResult.is_action_day && validatedResult.action_task !== null) {
        console.warn(`Content day (Day ${validatedResult.title}) structure has non-null action_task. Overriding to null.`);
        validatedResult.action_task = null;
    }
    if (!validatedResult.is_action_day && (!validatedResult.exercises || validatedResult.exercises.length === 0)) {
        console.warn(`Content day (Day ${validatedResult.title}) structure has no exercises. This might be acceptable depending on content type, but typically exercises are expected.`);
    }

    return validatedResult;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error for DayContent:', error.errors);
    } else {
      console.error('Error processing JSON response for DayContent from OpenAI:', error);
    }
    console.error('Original OpenAI content that failed parsing/validation:', response.content);
    return null;
  }
}

export async function generateActionDayTaskWithOpenAI(
  input: ActionDayInput
): Promise<ActionTask | null> {
  if (!input.dayInfo.is_action_day) {
    console.warn("generateActionDayTaskWithOpenAI called for a day not marked as action day. Ensure dayInfo.is_action_day is true in the input if an ActionTask is expected.");
  }

  const userMessage = buildActionDayUserMessage(input);
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT_ACTION_DAY_CREATOR },
    { role: 'user', content: userMessage },
  ];

  const response: LlmResponse = await getOpenAiChatCompletion({
    messages,
    model: config.openaiModel, 
    temperature: 0.75, 
    response_format: { type: 'json_object' },
  });

  if (!response.success || !response.content) {
    console.error('Error in OpenAI Action Day task generation:', response.error);
    return null;
  }

  try {
    const rawResult = JSON.parse(response.content);
    const validatedResult = ActionTaskSchema.parse(rawResult);
    
    return validatedResult;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error for ActionTask:', error.errors);
    } else {
      console.error('Error parsing JSON response for ActionTask from OpenAI:', error);
    }
    console.error('Original OpenAI content that failed parsing/validation:', response.content);
    return null;
  }
}
