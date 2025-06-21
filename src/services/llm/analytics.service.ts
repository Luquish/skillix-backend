// src/services/llm/analytics.service.ts

import { z } from 'zod';
import { getOpenAiChatCompletion, LlmResponse } from './openai.service';
import { getConfig } from '../../config';
import OpenAI from 'openai';
import { SYSTEM_PROMPT_LEARNING_ANALYTICS, SYSTEM_PROMPT_CHURN_PREDICTOR } from './prompts';
// Importar schemas y tipos desde el archivo centralizado
import {
  StreakMaintenanceSchema,
  UserAnalyticsSchema,
  type StreakMaintenance,
  type UserAnalytics
} from './schemas';
// Potentially import UserSkillContext or a more generic UserContext type
// import { UserSkillContext } from './skillAnalyzer.service';

const config = getConfig();

// --- Input Interfaces for Service Functions ---

// Define a more detailed structure for user history/metrics
export interface UserHistoryForAnalytics {
  user_id_internal_db?: string; // Your internal DB user ID
  firebase_uid: string;
  total_sessions?: number;
  avg_session_time_minutes?: number;
  common_learning_times?: string[]; // e.g., ["morning", "20:00-21:00"]
  current_streak_days?: number;
  longest_streak_days?: number;
  overall_completion_rate_percent?: number; // 0-100
  quiz_avg_score_percent?: number; // 0-100
  best_performing_content_types?: string[];
  struggle_areas_topics?: string[];
  days_since_last_session?: number;
  notification_response_rate_percent?: number; // 0-100
  action_day_completion_rate_percent?: number; // 0-100
  // Add any other relevant metrics you track
}

/**
 * Analyzes user learning patterns and provides comprehensive analytics.
 * @param userHistory The historical data and metrics for the user.
 * @returns A promise that resolves with the UserAnalytics object or null if an error occurs.
 */
export async function analyzeUserLearningPatterns(
  userHistory: UserHistoryForAnalytics
): Promise<UserAnalytics | null> {
  const userMessageContent = `Analyze the learning patterns, predict optimal conditions, and suggest optimizations for a Skillix user based on the following historical data:
${JSON.stringify(userHistory, null, 2)}

Provide a comprehensive analysis in the exact 'UserAnalytics' JSON format specified in the system instructions.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT_LEARNING_ANALYTICS },
    { role: 'user', content: userMessageContent },
  ];

  const response: LlmResponse = await getOpenAiChatCompletion({
    messages,
    model: config.openaiModel, // Or a model specialized for data analysis
    temperature: 0.4, // Lower temperature for more analytical and consistent output
    response_format: { type: 'json_object' },
  });

  if (!response.success || !response.content) {
    console.error('Error in OpenAI learning analytics generation:', response.error);
    return null;
  }

  try {
    const rawResult = JSON.parse(response.content);
    const validatedResult = UserAnalyticsSchema.parse(rawResult);
    
    return validatedResult;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error for UserAnalytics:', error.errors);
    } else {
      console.error('Error parsing JSON response for UserAnalytics from OpenAI:', error);
    }
    console.error('Original OpenAI content that failed parsing/validation:', response.content);
    return null;
  }
}

/**
 * Predicts user churn risk and suggests intervention strategies.
 * @param userHistory The historical data and metrics for the user.
 * @returns A promise that resolves with the StreakMaintenance object or null if an error occurs.
 */
export async function predictChurnAndSuggestInterventions(
  userHistory: UserHistoryForAnalytics
): Promise<StreakMaintenance | null> {
  const userMessageContent = `Analyze the following user data to predict churn risk and suggest intervention strategies for Skillix:
${JSON.stringify(userHistory, null, 2)}

Focus on providing a 'StreakMaintenance' JSON object as specified in the system instructions.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT_CHURN_PREDICTOR },
    { role: 'user', content: userMessageContent },
  ];

  const response: LlmResponse = await getOpenAiChatCompletion({
    messages,
    model: config.openaiModel, // Or a model specialized for predictive tasks
    temperature: 0.5,
    response_format: { type: 'json_object' },
  });

  if (!response.success || !response.content) {
    console.error('Error in OpenAI churn prediction:', response.error);
    return null;
  }

  try {
    const rawResult = JSON.parse(response.content);
    const validatedResult = StreakMaintenanceSchema.parse(rawResult);
    
    return validatedResult;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error for StreakMaintenance:', error.errors);
    } else {
      console.error('Error parsing JSON response for StreakMaintenance from OpenAI:', error);
    }
    console.error('Original OpenAI content that failed parsing/validation:', response.content);
    return null;
  }
}


// --- Helper functions (direct translation or adaptation from Python) ---

/**
 * Calculates an engagement score based on user metrics.
 * This is a direct TypeScript translation of your Python logic.
 * @param userMetrics Metrics like current_streak_days, completion_rate_percent, etc.
 * @returns Engagement score (0-1).
 */
export function calculateEngagementScore(
    userMetrics: {
        current_streak_days?: number;
        completion_rate_percent?: number; // 0-100
        quiz_avg_score_percent?: number; // 0-100
        session_regularity_score?: number; // 0-1 (e.g., based on days active in last 7/30 days)
        action_day_completion_rate_percent?: number; // 0-100
    }
): number {
    const weights = {
        streak_consistency: 0.3,        // e.g., consistency of maintaining streaks
        completion_rate: 0.25,          // Overall content completion
        quiz_performance: 0.2,          // Average quiz scores
        session_regularity: 0.15,       // How regularly they log in / complete sessions
        action_day_completion: 0.1      // Completion of practical action days
    };

    let score = 0;
    // Normalize streak: score of 1 for 30+ days, linear for less
    score += weights.streak_consistency * Math.min((userMetrics.current_streak_days || 0) / 30, 1);
    score += weights.completion_rate * (userMetrics.completion_rate_percent || 0) / 100;
    score += weights.quiz_performance * (userMetrics.quiz_avg_score_percent || 0) / 100;
    // session_regularity_score should be a pre-calculated value between 0 and 1
    score += weights.session_regularity * (userMetrics.session_regularity_score || 0);
    score += weights.action_day_completion * (userMetrics.action_day_completion_rate_percent || 0) / 100;
    
    return parseFloat(score.toFixed(2)); // Round to 2 decimal places
}

interface NotificationStrategy {
    primary_time: string; // HH:MM
    reminder_time: string; // HH:MM
    message_tone: 'energetic' | 'friendly' | 'relaxed' | 'calm' | string;
}
/**
 * Determines a notification strategy based on user learning pattern.
 * This is a direct TypeScript translation.
 * @param userTimePattern A string like 'morning_learner', 'evening_learner'.
 * @param timezone User's timezone (string, e.g., 'America/New_York') - currently not used in this logic but good to have.
 * @returns NotificationStrategy object.
 */
export function getNotificationStrategy(
    userTimePattern: 'morning_learner' | 'lunch_learner' | 'evening_learner' | 'night_owl' | string,
    // timezone: string // TODO: Consider using timezone for more accurate notification scheduling
): NotificationStrategy {
    const strategies: Record<string, NotificationStrategy> = {
        'morning_learner': { primary_time: '08:00', reminder_time: '07:30', message_tone: 'energetic' },
        'lunch_learner': { primary_time: '12:30', reminder_time: '12:00', message_tone: 'friendly' },
        'evening_learner': { primary_time: '20:00', reminder_time: '19:30', message_tone: 'relaxed' },
        'night_owl': { primary_time: '22:00', reminder_time: '21:30', message_tone: 'calm' }
    };
    return strategies[userTimePattern] || strategies['morning_learner']; // Default to morning
}

// The `run_daily_analytics` function from Python was a placeholder.
// The actual daily analytics would be a workflow in your Node.js backend:
// 1. Fetch `UserHistoryForAnalytics` from DataConnect for a user.
// 2. Call `analyzeUserLearningPatterns(userHistory)` to get `UserAnalytics` from LLM.
// 3. (Optional) Call `calculateEngagementScore(userHistory)` (or use LLM's estimate).
// 4. Store the new `UserAnalytics` (and score) back into DataConnect.
// 5. Use insights (e.g., from `optimal_learning_time` or `streak_maintenance_analysis`) to schedule notifications or trigger other actions.
