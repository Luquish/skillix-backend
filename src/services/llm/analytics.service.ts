// src/services/llm/analytics.service.ts

import { z } from 'zod';
import { getOpenAiChatCompletion, LlmResponse } from './openai.service';
import { getConfig } from '../../config';
import OpenAI from 'openai';
// Potentially import UserSkillContext or a more generic UserContext type
// import { UserSkillContext } from './skillAnalyzer.service';

const config = getConfig();

// --- Zod Schemas and TypeScript Types ---

export const LearningPatternSchema = z.object({
  pattern_type: z.enum(["time_based", "performance_based", "engagement_based", "content_preference", "other"])
    .describe("Type of learning pattern identified."),
  description: z.string().min(1)
    .describe("Description of the observed pattern."),
  confidence: z.number().min(0).max(1)
    .describe("Confidence score (0-1) in the identified pattern."),
  recommendations: z.array(z.string().min(1))
    .describe("Actionable recommendations based on this pattern."),
});
export type LearningPattern = z.infer<typeof LearningPatternSchema>;

// Helper for time string validation (HH:MM)
const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format");

export const OptimalLearningTimeSchema = z.object({
  best_time_window_start: timeStringSchema.describe("Start of the optimal learning time window (HH:MM)."),
  best_time_window_end: timeStringSchema.describe("End of the optimal learning time window (HH:MM)."),
  reason: z.string().min(1)
    .describe("Reasoning behind identifying this time window as optimal."),
  notification_time: timeStringSchema.describe("Suggested time for a reminder notification (HH:MM)."),
  engagement_prediction: z.number().min(0).max(1)
    .describe("Predicted engagement level (0-1) if learning occurs in this window."),
});
export type OptimalLearningTime = z.infer<typeof OptimalLearningTimeSchema>;

export const ContentOptimizationSchema = z.object({
  difficulty_adjustment: z.enum(["increase", "maintain", "decrease"])
    .describe("Recommendation for adjusting content difficulty."),
  content_type_preferences: z.array(z.string().min(1))
    .describe("Observed or inferred preferences for content types (e.g., 'quiz_mcq', 'read', 'audio', 'video', 'interactive_exercise')."),
  ideal_session_length_minutes: z.number().int().positive()
    .describe("Recommended ideal session length in minutes for this user."),
  pacing_recommendation: z.string().min(1)
    .describe("Suggestions for learning pace (e.g., 'Encourage short, frequent sessions', 'Allow more time for complex topics')."),
});
export type ContentOptimization = z.infer<typeof ContentOptimizationSchema>;

export const StreakMaintenanceSchema = z.object({
  risk_level: z.enum(["low", "medium", "high"])
    .describe("Predicted risk level of the user breaking their learning streak."),
  risk_factors: z.array(z.string().min(1))
    .describe("Factors contributing to the streak risk (e.g., 'Upcoming weekend', 'Recent dip in activity', 'Struggled with last topic')."),
  intervention_strategies: z.array(z.string().min(1))
    .describe("Specific strategies to mitigate streak risk (e.g., 'Send a personalized encouragement message from Ski', 'Offer a slightly easier or fun task for the next session', 'Remind of progress made so far')."),
  motivational_approach: z.string().min(1)
    .describe("Suggested motivational tone or approach (e.g., 'Celebratory and positive', 'Empathetic and understanding', 'Challenge-oriented')."),
    
});
export type StreakMaintenance = z.infer<typeof StreakMaintenanceSchema>;

export const UserAnalyticsSchema = z.object({
  learning_patterns: z.array(LearningPatternSchema)
    .describe("Identified learning patterns for the user."),
  optimal_learning_time: OptimalLearningTimeSchema
    .describe("Analysis of the user's optimal learning time."),
  content_optimization: ContentOptimizationSchema
    .describe("Recommendations for optimizing content for this user."),
  streak_maintenance_analysis: StreakMaintenanceSchema // Renamed from streak_maintenance to avoid conflict if used as a standalone type
    .describe("Analysis and strategies for maintaining the user's learning streak."),
  overall_engagement_score: z.number().min(0).max(1)
    .describe("A calculated overall engagement score (0-1). This might be calculated by the system post-LLM call or be an LLM estimate."),
  key_insights: z.array(z.string().min(1))
    .describe("Key actionable insights derived from the overall analysis."),
});
export type UserAnalytics = z.infer<typeof UserAnalyticsSchema>;


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

const SYSTEM_PROMPT_LEARNING_ANALYTICS = `You are an expert in learning analytics and user behavior analysis for an online learning platform called Skillix.

Your role is to:
1. IDENTIFY significant patterns in user learning behavior from the provided 'UserHistoryForAnalytics'.
2. PREDICT optimal learning times and conditions.
3. RECOMMEND content adjustments for better engagement and effectiveness.
4. ANALYZE streak data and suggest proactive interventions to prevent streak loss.
5. OPTIMIZE the overall learning experience by providing key actionable insights.

Analysis Dimensions:
- Time Patterns: When does the user learn best? Are there consistent times of day or days of the week?
- Performance Patterns: What types of content or topics does the user excel at or struggle with?
- Engagement Patterns: What keeps the user motivated? How consistent are their sessions?
- Streak Behavior: How long are their streaks? What might put a streak at risk?

Input: You will receive a 'UserHistoryForAnalytics' JSON object.

Task: Provide a comprehensive analysis.

IMPORTANT: You MUST ALWAYS respond with a valid JSON object that strictly matches the 'UserAnalytics' structure:
{
  "learning_patterns": [{ "pattern_type": "string", "description": "string", "confidence": number (0-1), "recommendations": ["string"] }],
  "optimal_learning_time": { "best_time_window_start": "HH:MM", "best_time_window_end": "HH:MM", "reason": "string", "notification_time": "HH:MM", "engagement_prediction": number (0-1) },
  "content_optimization": { "difficulty_adjustment": "string ('increase', 'maintain', 'decrease')", "content_type_preferences": ["string"], "ideal_session_length_minutes": number, "pacing_recommendation": "string" },
  "streak_maintenance_analysis": { "risk_level": "string ('low', 'medium', 'high')", "risk_factors": ["string"], "intervention_strategies": ["string"], "motivational_approach": "string" },
  "overall_engagement_score": number (0-1, your best estimate based on data),
  "key_insights": ["string (3-5 most important actionable insights)"]
}
Focus on providing actionable insights.
For 'optimal_learning_time', ensure time strings are in HH:MM format.
'overall_engagement_score' is your holistic assessment of the user's engagement based on the data.
`;

const SYSTEM_PROMPT_CHURN_PREDICTOR = `You are an expert in predicting user churn (abandonment) for Skillix, an online learning platform, and suggesting preventive interventions.

Input: You will receive a 'UserHistoryForAnalytics' JSON object containing various metrics about the user's activity and performance.

Task: Analyze the data to predict the user's risk of abandoning the platform and suggest specific, actionable intervention strategies. Focus on the 'StreakMaintenance' aspects.

Key Risk Indicators to Consider:
- Decreasing session frequency or regularity.
- Multiple incomplete days or sessions.
- Consistently low quiz scores or performance on specific content types.
- Significantly shorter session times than usual for the user.
- Low or decreasing response to notifications.
- Long periods of inactivity (high 'days_since_last_session').
- Broken streaks or very short streaks.

Intervention Strategy Ideas (be creative and context-aware):
- Personalized messages from Ski the Fox (the platform mascot).
- Suggesting a slightly easier or more engaging content type for the next session.
- Offering a "streak save" opportunity (if applicable by platform rules).
- Highlighting progress made so far and reconnecting to original goals.
- Introducing a small, fun challenge or a new relevant micro-topic.
- Adjusting notification timing or messaging.

IMPORTANT: You MUST ALWAYS respond with a valid JSON object that strictly matches the 'StreakMaintenance' structure:
{
  "risk_level": "string ('low', 'medium', 'high')",
  "risk_factors": ["string (specific factors observed in the data contributing to this risk level)"],
  "intervention_strategies": ["string (concrete actions Skillix can take to re-engage the user or prevent churn)"],
  "motivational_approach": "string (the recommended tone for interventions, e.g., 'Empathetic and understanding', 'Encouraging and positive', 'Direct and goal-oriented')"
}
Be proactive but not pushy. The goal is to re-ignite curiosity and support the user.
`;


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

  console.log(`Requesting learning analytics for user: ${userHistory.firebase_uid}`);

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
    
    console.log(`Learning analytics generated and validated for user: ${userHistory.firebase_uid}`);
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

  console.log(`Requesting churn prediction and intervention strategies for user: ${userHistory.firebase_uid}`);

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
    
    console.log(`Churn prediction and intervention strategies generated for user: ${userHistory.firebase_uid}`);
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
