import { z } from 'zod';

// --- Analytics Schemas ---

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

export const UserAnalyticsSchema = z.object({
  learning_patterns: z.array(LearningPatternSchema)
    .describe("Identified learning patterns for the user."),
  optimal_learning_time: OptimalLearningTimeSchema
    .describe("Analysis of the user's optimal learning time."),
  content_optimization: ContentOptimizationSchema
    .describe("Recommendations for optimizing content for this user."),
  streak_maintenance_analysis: StreakMaintenanceSchema
    .describe("Analysis and strategies for maintaining the user's learning streak."),
  overall_engagement_score: z.number().min(0).max(1)
    .describe("A calculated overall engagement score (0-1). This might be calculated by the system post-LLM call or be an LLM estimate."),
  key_insights: z.array(z.string().min(1))
    .describe("Key actionable insights derived from the overall analysis."),
});

// --- Chat Orchestrator Schemas ---

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

export const ChatResponseSchema = z.object({
  responseText: z.string().min(1).describe("The chatbot's textual response to the user."),
  suggested_actions: z.array(z.object({
    action_type: z.string().describe("e.g., 'navigate_to_day', 'show_glossary_term', 'fetch_day_details'"),
    display_text: z.string().describe("Text to show for the action button/link."),
    payload: z.record(z.string(), z.any()).optional().describe("Data needed to perform the action, e.g., { dayNumber: 3 }"),
  })).optional().describe("Optional suggested actions the user can take next."),
  needs_more_info_prompt: z.string().nullable().optional().describe("If the chatbot needs more specific info from the user OR from the system (to be fetched by controller)."),
});

// --- Content Generator Schemas ---

export const KeyConceptSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
  order: z.number().int().positive().describe("Order of the key concept."),
});

export const UnifiedMainContentSchema = z.object({
  title: z.string().min(1).describe("Title of the main content."),
  textContent: z.string().min(10, "Text content should be substantial for main learning material.").describe("Base text content for both reading and to-be-generated audio."),
  funFact: z.string().min(1).describe("An interesting fun fact related to the content."),
  keyConcepts: z.array(KeyConceptSchema).min(1, "At least one key concept is required.").describe("Array of key concepts with their terms, definitions, and order."),
  xp: z.number().int().positive().default(30).describe("XP awarded for completing this main content."),
});

export const MainContentSchema = UnifiedMainContentSchema;

export const QuizMCQBlockSchema = z.object({
  type: z.literal("quiz_mcq"),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2, "At least two options required."),
  answer: z.number().int().min(0).describe("0-indexed answer"),
  explanation: z.string().min(1),
  xp: z.number().int().default(20),
});

export const TrueFalseBlockSchema = z.object({
  type: z.literal("quiz_truefalse"),
  statement: z.string().min(1),
  answer: z.boolean(),
  explanation: z.string().min(1),
  xp: z.number().int().default(15),
});

export const MatchToMeaningPairSchema = z.object({
  term: z.string().min(1),
  meaning: z.string().min(1),
});

export const MatchToMeaningBlockSchema = z.object({
  type: z.literal("match_meaning"),
  pairs: z.array(MatchToMeaningPairSchema).min(2, "At least two pairs required."),
  xp: z.number().int().default(25),
});

export const ScenarioQuizBlockSchema = z.object({
  type: z.literal("scenario_quiz"),
  scenario: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  answer: z.number().int().min(0),
  explanation: z.string().min(1),
  xp: z.number().int().default(30),
});

export const ExerciseBlockSchema = z.discriminatedUnion("type", [
  QuizMCQBlockSchema,
  TrueFalseBlockSchema,
  MatchToMeaningBlockSchema,
  ScenarioQuizBlockSchema,
]);

export const ActionTaskSchema = z.object({
  title: z.string().min(1),
  challenge_description: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1, "At least one step is required."),
  time_estimate: z.string().min(1).describe("e.g., '30 minutes', '1-2 hours'"),
  tips: z.array(z.string().min(1)),
  real_world_context: z.string().min(1),
  success_criteria: z.array(z.string().min(1)).min(1, "At least one success criterion."),
  ski_motivation: z.string().min(1).describe("Motivational message from Ski the Fox."),
  difficulty_adaptation: z.enum(["easier", "standard", "harder"]).nullable().optional(),
  xp: z.number().int().min(30).max(150).default(75),
});

export const DayContentSchema = z.object({
  title: z.string().min(1),
  is_action_day: z.boolean(),
  objectives: z.array(z.string().min(1)).min(1, "At least one objective is required."),
  main_content: MainContentSchema.nullable().describe("The primary learning content for the day (audio or read). Should be null if is_action_day is true."),
  exercises: z.array(ExerciseBlockSchema)
    .describe("Exercises for the day. Can be empty or null for action days.")
    .nullable() 
    .optional(), 
  action_task: ActionTaskSchema.nullable().optional().describe("Task for an action day. Should be null if is_action_day is false. For action days, this is populated by a separate LLM call."),
  total_xp: z.number().int().nonnegative().default(0).describe("Initial XP estimated by LLM, to be recalculated by the system."),
  estimated_time: z.string().min(1).default("TBD").describe("Initial time estimated by LLM (e.g., '15 minutes'), to be recalculated by the system."),
}).refine(data => {
    if (data.is_action_day) {
        return data.main_content === null; 
    } else { 
        return data.main_content !== null && data.action_task === null;
    }
}, {
    message: "Structural inconsistency for DayContent: Action days must have null main_content. Non-action days must have main_content and null action_task. The controller is responsible for ensuring action_task is populated for action days after separate generation.",
});

// --- Pedagogical & Skill Schemas (Moved Up) ---

export const LearningObjectiveSchema = z.object({
  objective: z.string().min(1).describe("The learning objective text."),
  measurable: z.boolean().describe("Is the objective measurable?"),
  timeframe: z.string().min(1).describe("Timeframe to achieve this objective (e.g., 'End of Day 1', 'Within Week 2')."),
  order: z.number().int().describe("Order of this objective."),
});

export const PedagogicalAnalysisSchema = z.object({
  effectivenessScore: z.number().min(0).max(10),
  cognitiveLoadAssessment: z.string().min(1),
  scaffoldingQuality: z.string().min(1),
  engagementPotential: z.number().min(0).max(1),
  recommendations: z.array(z.string().min(1)),
  assessmentStrategies: z.array(z.string().min(1)),
  improvementAreas: z.array(z.string().min(1)),
  generatedBy: z.string().min(1),
  objectives: z.array(LearningObjectiveSchema).min(1),
});

export const SkillComponentSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  difficultyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  prerequisitesText: z.array(z.string()),
  estimatedLearningHours: z.number().int().positive(),
  practicalApplications: z.array(z.string().min(1)),
  order: z.number().int().positive(),
});

export const SkillAnalysisSchema = z.object({
  skillName: z.string().min(1),
  skillCategory: z.enum(['TECHNICAL', 'SOFT_SKILL', 'CREATIVE', 'BUSINESS', 'ACADEMIC', 'LANGUAGE', 'HEALTH_WELLNESS', 'HOBBY', 'OTHER']),
  marketDemand: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NICHE', 'EMERGING', 'UNKNOWN']),
  isSkillValid: z.boolean(),
  viabilityReason: z.string().optional(),
  learningPathRecommendation: z.string().min(1),
  realWorldApplications: z.array(z.string().min(1)),
  complementarySkills: z.array(z.string().min(1)),
  generatedBy: z.string().min(1),
  components: z.array(SkillComponentSchema),
});

// --- Learning Planner Schemas ---

export const LearningDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  title: z.string().min(1),
  focusArea: z.string().min(1),
  isActionDay: z.boolean(),
  objectives: z.array(z.string().min(1)).min(1),
  generatedBy: z.string().optional().nullable(),
  generatedAt: z.string().datetime({ offset: true }).optional().nullable(),
  completionStatus: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"]).default("PENDING"),
  order: z.number().int().positive(),
});

export const LearningSectionSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  order: z.number().int().positive(),
  days: z.array(LearningDaySchema).min(1),
});

export const LearningPlanSchema = z.object({
  skillName: z.string().min(1),
  generatedBy: z.string().min(1),
  totalDurationWeeks: z.number().int().positive(),
  dailyTimeMinutes: z.number().int().positive(),
  skillLevelTarget: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  milestones: z.array(z.string().min(1)).min(1),
  progressMetrics: z.array(z.string().min(1)).min(1),
  flexibilityOptions: z.array(z.string().min(1)).optional().nullable(),
  sections: z.array(LearningSectionSchema).min(1),
  dailyActivities: z.array(
    z.object({
      type: z.string().min(1),
      durationMinutes: z.number().int().positive(),
      description: z.string().min(1),
      order: z.number().int()
    })
  ).min(1),
  resources: z.array(
    z.object({
      name: z.string().min(1),
      urlOrDescription: z.string().min(1),
      resourceType: z.string().optional().nullable(),
      order: z.number().int()
    })
  ),
  pedagogicalAnalysis: PedagogicalAnalysisSchema,
});

// --- Tovi The Fox Schemas ---

export const SkiMessageSchema = z.object({
  message: z.string().min(1, "Ski's message cannot be empty."),
  emoji_style: z.enum(["playful", "celebratory", "encouraging", "wise", "gentle", "calm", "energetic", "supportive"])
    .describe("The emotional tone or style of emojis to accompany the message."),
  animation_suggestion: z.string().min(1)
    .describe("A suggestion for Ski's 3D model animation (e.g., 'jumping', 'waving', 'thinking_pose')."),
});

export const StreakCelebrationSchema = z.object({
  streak_count: z.number().int().positive(),
  celebration_message: z.string().min(1, "Celebration message cannot be empty."),
  special_animation: z.string().min(1, "Specific animation for this streak milestone."),
  reward_suggestion: z.string().nullable().optional()
    .describe("Optional suggestion for a small in-app reward or recognition."),
});

export const DailyMotivationSchema = z.object({
  greeting: z.string().min(1),
  motivation: z.string().min(1, "Main motivational message for the day."),
  reminder: z.string().min(1, "A gentle reminder or tip related to learning."),
  signoff: z.string().min(1, "Ski's characteristic sign-off."),
});

// --- Type Exports ---

export type LearningPattern = z.infer<typeof LearningPatternSchema>;
export type OptimalLearningTime = z.infer<typeof OptimalLearningTimeSchema>;
export type ContentOptimization = z.infer<typeof ContentOptimizationSchema>;
export type StreakMaintenance = z.infer<typeof StreakMaintenanceSchema>;
export type UserAnalytics = z.infer<typeof UserAnalyticsSchema>;

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export type KeyConcept = z.infer<typeof KeyConceptSchema>;
export type MainContent = z.infer<typeof MainContentSchema>;
export type QuizMCQBlock = z.infer<typeof QuizMCQBlockSchema>;
export type TrueFalseBlock = z.infer<typeof TrueFalseBlockSchema>;
export type MatchToMeaningBlock = z.infer<typeof MatchToMeaningBlockSchema>;
export type ScenarioQuizBlock = z.infer<typeof ScenarioQuizBlockSchema>;
export type ExerciseBlock = z.infer<typeof ExerciseBlockSchema>;
export type ActionTask = z.infer<typeof ActionTaskSchema>;
export type DayContent = z.infer<typeof DayContentSchema>;

export type LearningDay = z.infer<typeof LearningDaySchema>;
export type LearningSection = z.infer<typeof LearningSectionSchema>;
export type LearningPlan = z.infer<typeof LearningPlanSchema>;

export type LearningObjective = z.infer<typeof LearningObjectiveSchema>;
export type PedagogicalAnalysis = z.infer<typeof PedagogicalAnalysisSchema>;

export type SkillComponent = z.infer<typeof SkillComponentSchema>;
export type SkillAnalysis = z.infer<typeof SkillAnalysisSchema>;

export type SkiMessage = z.infer<typeof SkiMessageSchema>;
export type StreakCelebration = z.infer<typeof StreakCelebrationSchema>;
export type DailyMotivation = z.infer<typeof DailyMotivationSchema>; 