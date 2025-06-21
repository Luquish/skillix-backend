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
  optimal_learning_time_start: z.string().optional(),
  optimal_learning_time_end: z.string().optional(),
  optimal_learning_time_reasoning: z.string().optional(),
  content_difficulty_recommendation: z.string().optional(),
  ideal_session_length_minutes: z.number().int().positive().optional(),
  streak_risk_level: z.enum(["low", "medium", "high"]).optional(),
  streak_intervention_strategies: z.array(z.string().min(1)).optional(),
  overall_engagement_score: z.number().min(0).max(1)
    .describe("A calculated overall engagement score (0-1)."),
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

// RAW schema for what the LLM might return
const UnifiedMainContentSchemaRaw = z.object({
  title: z.string().min(1).optional(),
  textContent: z.string().optional(),
  text_content: z.string().optional(), // snake_case variant
  funFact: z.string().optional(),
  fun_fact: z.string().optional(), // snake_case variant
  keyConcepts: z.array(z.union([z.string(), z.object({ term: z.string(), definition: z.string().optional() })])).optional(),
  key_concepts: z.array(z.union([z.string(), z.object({ term: z.string(), definition: z.string().optional() })])).optional(), // snake_case variant
  xp: z.number().int().positive().optional(),
});


// Transformed, clean schema
export const MainContentSchema = UnifiedMainContentSchemaRaw.transform((data, ctx) => {
    const textContent = data.textContent || data.text_content;
    if (!textContent) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Main content requires 'textContent' or 'text_content'.",
            path: ['textContent'],
        });
        return z.NEVER;
    }

    const keyConceptsRaw = data.keyConcepts || data.key_concepts || [];
    const keyConcepts = keyConceptsRaw.map((kc, index) => {
        if (typeof kc === 'string') {
            return { term: kc, definition: "Awaiting definition from user interaction.", order: index + 1 };
        }
        return { term: kc.term, definition: kc.definition || "Awaiting definition.", order: index + 1 };
    });

    return {
        title: data.title || "Main Content", // Provide default title
        textContent: textContent,
        funFact: data.funFact || data.fun_fact || "No fun fact provided.",
        keyConcepts: keyConcepts,
        xp: data.xp || 20,
    };
});

const QuizMCQBlockSchemaRaw = z.object({
  type: z.literal("quiz_mcq"),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2, "At least two options required."),
  answer: z.union([z.number(), z.string()]).optional(),
  correct_answer: z.union([z.number(), z.string()]).optional(),
  correctAnswer: z.union([z.number(), z.string()]).optional(), // Alias for camelCase
  explanation: z.string().optional(),
  xp: z.number().int().default(20),
});


export const QuizMCQBlockSchema = QuizMCQBlockSchemaRaw.transform((data, ctx) => {
    let answerIndex: number | undefined = undefined;
    const rawAnswer = data.answer ?? data.correct_answer ?? data.correctAnswer;

    if (rawAnswer === undefined || rawAnswer === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Answer is missing for MCQ.`, path: ['answer'] });
        return z.NEVER;
    }

    if (typeof rawAnswer === 'number') {
        answerIndex = rawAnswer;
    } else if (typeof rawAnswer === 'string') {
        // Try to match the answer text first
        answerIndex = data.options.findIndex(opt => opt.trim().toLowerCase() === rawAnswer.trim().toLowerCase());
        
        // If not found, try to parse it as an index
        if (answerIndex === -1) {
             const parsedInt = parseInt(rawAnswer, 10);
             if (!isNaN(parsedInt)) answerIndex = parsedInt;
        }

        // NEW: If still not found, try to match it as a letter option (A, B, C...)
        if (answerIndex === -1) {
            const letter = rawAnswer.trim().toUpperCase().replace(/[.)]$/, ''); // "B." -> "B"
            if (letter.length === 1 && letter >= 'A' && letter <= 'Z') {
                const letterIndex = letter.charCodeAt(0) - 'A'.charCodeAt(0);
                if (letterIndex < data.options.length) {
                    answerIndex = letterIndex;
                }
            }
        }
    }

    if (answerIndex === undefined || answerIndex < 0 || answerIndex >= data.options.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid or out-of-bounds answer for MCQ. Raw answer: '${rawAnswer}'`, path: ['answer'] });
        return z.NEVER;
    }
    
    return {
        type: data.type,
        question: data.question,
        options: data.options,
        answer: answerIndex,
        explanation: data.explanation || `The correct answer is: ${data.options[answerIndex]}`,
        xp: data.xp
    };
});


const TrueFalseBlockSchemaRaw = z.object({
  type: z.literal("quiz_truefalse"),
  statement: z.string().optional(),
  question: z.string().optional(), // alias
  answer: z.union([z.boolean(), z.string()]).optional(),
  correct_answer: z.union([z.boolean(), z.string()]).optional(),
  explanation: z.string().optional(),
  xp: z.number().int().default(15),
});

export const TrueFalseBlockSchema = TrueFalseBlockSchemaRaw.transform((data, ctx) => {
    const statement = data.statement || data.question;
    if (!statement) {
        ctx.addIssue({ code: 'custom', message: 'Statement/question is required for True/False.', path: ['statement'] });
        return z.NEVER;
    }

    const rawAnswer = data.answer ?? data.correct_answer;
    let finalAnswer: boolean | undefined = undefined;

    if (rawAnswer === undefined || rawAnswer === null) {
         ctx.addIssue({ code: 'custom', message: `Answer is missing for True/False.`, path: ['answer'] });
         return z.NEVER;
    }

    if (typeof rawAnswer === 'boolean') {
        finalAnswer = rawAnswer;
    } else if (typeof rawAnswer === 'string') {
        const lowerAnswer = rawAnswer.trim().toLowerCase();
        if (lowerAnswer === 'true') finalAnswer = true;
        else if (lowerAnswer === 'false') finalAnswer = false;
    }
    
    if (finalAnswer === undefined) {
         ctx.addIssue({ code: 'custom', message: `Invalid answer for True/False. Raw answer: '${rawAnswer}'`, path: ['answer'] });
         return z.NEVER;
    }

    return {
        type: data.type,
        statement: statement,
        answer: finalAnswer,
        explanation: data.explanation || `The correct answer is ${finalAnswer}.`,
        xp: data.xp
    };
});

const MatchToMeaningPairSchemaRaw = z.object({
  term: z.string().min(1),
  meaning: z.string().optional(),
  definition: z.string().optional(),
});

export const MatchToMeaningPairSchema = MatchToMeaningPairSchemaRaw.transform((data, ctx) => {
    const meaning = data.meaning || data.definition;
    if (!meaning) {
        ctx.addIssue({ code: 'custom', message: `Meaning/definition required for term '${data.term}'`, path: ['meaning']});
        return z.NEVER;
    }
    return { term: data.term, meaning: meaning };
});

const MatchToMeaningBlockSchemaRaw = z.object({
  type: z.literal("match_meaning"),
  pairs: z.array(MatchToMeaningPairSchemaRaw).min(2, "At least two pairs required."),
  xp: z.number().int().default(25),
});

export const MatchToMeaningBlockSchema = MatchToMeaningBlockSchemaRaw.transform((data, ctx) => ({
    type: data.type,
    pairs: data.pairs.map(p => {
        try {
            return MatchToMeaningPairSchema.parse(p)
        } catch(e) {
            ctx.addIssue({ code: 'custom', message: `Invalid pair in match_meaning: ${JSON.stringify(p)}`})
            return z.NEVER;
        }
    }),
    xp: data.xp
}));


const ScenarioQuizBlockSchemaRaw = z.object({
  type: z.literal("scenario_quiz"),
  scenario: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  answer: z.union([z.number(), z.string()]).optional(),
  correct_answer: z.union([z.number(), z.string()]).optional(),
  correctAnswer: z.union([z.number(), z.string()]).optional(), // Alias for camelCase
  explanation: z.string().optional(),
  xp: z.number().int().default(30),
});

export const ScenarioQuizBlockSchema = ScenarioQuizBlockSchemaRaw.transform((data, ctx) => {
    let answerIndex: number | undefined = undefined;
    const rawAnswer = data.answer ?? data.correct_answer ?? data.correctAnswer;

    if (rawAnswer === undefined || rawAnswer === null) {
        ctx.addIssue({ code: 'custom', message: `Answer is missing for Scenario Quiz.`, path: ['answer'] });
        return z.NEVER;
    }

    if (typeof rawAnswer === 'number') {
        answerIndex = rawAnswer;
    } else if (typeof rawAnswer === 'string') {
        // Try to match the answer text first
        answerIndex = data.options.findIndex(opt => opt.trim().toLowerCase() === rawAnswer.trim().toLowerCase());
        
        // If not found, try to parse it as an index
        if (answerIndex === -1) {
            const parsedInt = parseInt(rawAnswer, 10);
            if (!isNaN(parsedInt)) answerIndex = parsedInt;
        }

        // NEW: If still not found, try to match it as a letter option (A, B, C...)
        if (answerIndex === -1) {
            const letter = rawAnswer.trim().toUpperCase().replace(/[.)]$/, ''); // "B." -> "B"
            if (letter.length === 1 && letter >= 'A' && letter <= 'Z') {
                const letterIndex = letter.charCodeAt(0) - 'A'.charCodeAt(0);
                if (letterIndex < data.options.length) {
                    answerIndex = letterIndex;
                }
            }
        }
    }
    
    if (answerIndex === undefined || answerIndex < 0 || answerIndex >= data.options.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid answer for Scenario Quiz. Raw answer: '${rawAnswer}'`, path: ['answer']});
        return z.NEVER;
    }
    
    return {
        type: data.type,
        scenario: data.scenario,
        question: data.question,
        options: data.options,
        answer: answerIndex,
        explanation: data.explanation || `The correct answer is: ${data.options[answerIndex]}`,
        xp: data.xp
    };
});

const ExerciseBlockSchemaRaw = z.any(); // Accept any exercise block from the LLM

export const ExerciseBlockSchema = ExerciseBlockSchemaRaw.transform((data, ctx) => {
    if (!data || typeof data !== 'object' || !data.type) {
        ctx.addIssue({ code: 'custom', message: 'Invalid exercise block structure.' });
        return z.NEVER;
    }
    try {
        switch(data.type) {
            case 'quiz_mcq': return QuizMCQBlockSchema.parse(data);
            case 'quiz_truefalse': return TrueFalseBlockSchema.parse(data);
            case 'match_meaning': return MatchToMeaningBlockSchema.parse(data);
            case 'scenario_quiz': return ScenarioQuizBlockSchema.parse(data);
            default:
                ctx.addIssue({ code: 'custom', message: `Unknown exercise type: ${data.type}` });
                return z.NEVER;
        }
    } catch(error) {
        if (error instanceof z.ZodError) {
            error.errors.forEach(err => ctx.addIssue(err));
        } else {
            ctx.addIssue({ code: 'custom', message: `Failed to parse exercise block: ${JSON.stringify(data)}`})
        }
        return z.NEVER;
    }
});

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

const DayContentSchemaRaw = z.object({
  title: z.string().min(1),
  is_action_day: z.boolean(),
  objectives: z.array(z.string().min(1)).min(1, "At least one objective is required."),
  main_content: UnifiedMainContentSchemaRaw.nullable().optional(),
  exercises: z.array(ExerciseBlockSchemaRaw).nullable().optional(),
  action_task: ActionTaskSchema.nullable().optional(),
  total_xp: z.number().int().nonnegative().default(0),
  estimated_time: z.string().min(1).default("TBD"),
});


export const DayContentSchema = DayContentSchemaRaw.transform((data, ctx) => {
    const isActionDay = data.is_action_day;

    let mainContent = null;
    if (!isActionDay) {
        if (!data.main_content) {
            ctx.addIssue({ code: 'custom', path: ['main_content'], message: 'main_content is required for non-action days.'});
            return z.NEVER;
        }
        try {
            mainContent = MainContentSchema.parse(data.main_content);
        } catch (e) {
            if (e instanceof z.ZodError) e.errors.forEach(err => ctx.addIssue(err));
            return z.NEVER;
        }
    }

    const exercises = (data.exercises || []).map(ex => {
        try {
            return ExerciseBlockSchema.parse(ex);
        } catch (e) {
            if (e instanceof z.ZodError) e.errors.forEach(err => ctx.addIssue(err));
            console.error(`Skipping invalid exercise block: ${JSON.stringify(ex)}`);
            return null;
        }
    }).filter(ex => ex !== null && ex !== z.NEVER) as z.infer<typeof ExerciseBlockSchema>[];


    const finalData = {
        title: data.title,
        is_action_day: data.is_action_day,
        objectives: data.objectives,
        main_content: mainContent,
        exercises: exercises,
        action_task: data.action_task,
        total_xp: data.total_xp,
        estimated_time: data.estimated_time,
    };

    // Final structural validation
    if (isActionDay && finalData.main_content !== null) {
        ctx.addIssue({ code: 'custom', path: ['is_action_day'], message: 'Action day cannot have main_content.'});
        return z.NEVER;
    }
    if (!isActionDay && finalData.action_task !== null) {
        ctx.addIssue({ code: 'custom', path: ['is_action_day'], message: 'Non-action day cannot have action_task.'});
        return z.NEVER;
    }

    return finalData;
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

const PedagogicalAnalysisSchemaRaw = z.object({
  effectiveness_score: z.number().min(0).max(1),
  cognitive_load_assessment: z.string().min(1),
  scaffolding_quality: z.string().min(1),
  engagement_potential: z.number().min(0).max(1),
  recommendations: z.array(z.string().min(1)),
  assessment_strategies: z.array(z.string().min(1)),
  improvement_areas: z.array(z.string().min(1)),
  learning_objectives: z.array(z.object({
    objective: z.string().min(1),
    measurable: z.boolean(),
    timeframe: z.string().min(1),
  })).min(1).describe("List of key learning objectives as structured objects."),
});


export const PedagogicalAnalysisSchema = PedagogicalAnalysisSchemaRaw.transform((data) => ({
  effectivenessScore: data.effectiveness_score * 10,
  cognitiveLoadAssessment: data.cognitive_load_assessment,
  scaffoldingQuality: data.scaffolding_quality,
  engagementPotential: data.engagement_potential,
  recommendations: data.recommendations,
  assessmentStrategies: data.assessment_strategies,
  improvementAreas: data.improvement_areas,
  generatedBy: 'llm-openai-pedagogue',
  objectives: data.learning_objectives.map((objective, index) => ({
    ...objective,
    order: index + 1,
  })),
}));

export const AdaptiveLearningRecommendationSchema = z.object({
  difficulty_adjustment: z.enum(["increase", "maintain", "decrease"])
    .describe("Recommendation for adjusting content difficulty based on user performance."),
  pacing_recommendation: z.string().min(1)
    .describe("Suggestions for learning pace, e.g., 'Recommend reviewing prerequisite X before proceeding'."),
  content_modifications: z.array(z.string().min(1))
    .describe("Specific suggestions for content adaptation, e.g., 'Offer an alternative explanation for concept Y.'."),
  motivational_elements: z.array(z.string().min(1))
    .describe("Ideas for motivational messages or actions, e.g., 'Acknowledge their consistent effort on difficult topics.'."),
});

const SkillComponentSchemaRaw = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  // Acepta tanto snake_case como camelCase
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  prerequisites: z.array(z.string()).optional(),
  prerequisitesText: z.array(z.string()).optional(),
  estimated_learning_hours: z.number().int().positive().optional(),
  estimatedLearningHours: z.number().int().positive().optional(),
  practical_applications: z.array(z.string().min(1)).optional(),
  practicalApplications: z.array(z.string().min(1)).optional(),
  order: z.number().int().optional(),
}).refine((data) => {
  // Validar que al menos una versión de cada campo requerido esté presente
  const hasDifficultyLevel = data.difficulty_level || data.difficultyLevel;
  const hasPrerequisites = data.prerequisites || data.prerequisitesText;
  const hasEstimatedHours = data.estimated_learning_hours || data.estimatedLearningHours;
  const hasPracticalApplications = data.practical_applications || data.practicalApplications;
  
  return hasDifficultyLevel && hasPrerequisites && hasEstimatedHours && hasPracticalApplications;
}, {
  message: "Los campos requeridos del componente de skill deben estar presentes en alguna de sus variantes."
});

export const SkillComponentSchema = SkillComponentSchemaRaw.transform((data) => {
  // Usar campos de ambos formatos (snake_case o camelCase)
  const difficultyLevel = data.difficulty_level || data.difficultyLevel || 'BEGINNER';
  const prerequisites = data.prerequisites || data.prerequisitesText || [];
  const estimatedLearningHours = data.estimated_learning_hours || data.estimatedLearningHours || 1;
  const practicalApplications = data.practical_applications || data.practicalApplications || [];
  const order = data.order || 0;

  return {
    name: data.name,
    description: data.description,
    difficultyLevel: difficultyLevel.toString().toUpperCase() as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    prerequisitesText: prerequisites,
    estimatedLearningHours: estimatedLearningHours,
    practicalApplications: practicalApplications,
    order: order, // El LLM no lo provee, lo añadimos por defecto. El sistema debería reordenar.
  };
});

const SkillAnalysisSchemaRaw = z.object({
  // Acepta tanto snake_case como camelCase para compatibilidad frontend-backend
  skill_name: z.string().min(1).optional(),
  skillName: z.string().min(1).optional(),
  skill_category: z.string().optional(), 
  skillCategory: z.string().optional(),
  market_demand: z.string().optional(), 
  marketDemand: z.string().optional(),
  is_skill_valid: z.boolean().optional(),
  isSkillValid: z.boolean().optional(),
  viability_reason: z.string().nullable().optional(),
  viabilityReason: z.string().nullable().optional(),
  learning_path_recommendation: z.string().nullable().optional(),
  learningPathRecommendation: z.string().nullable().optional(),
  real_world_applications: z.array(z.string().min(1)).nullable().optional(),
  realWorldApplications: z.array(z.string().min(1)).nullable().optional(),
  complementary_skills: z.array(z.string().min(1)).nullable().optional(),
  complementarySkills: z.array(z.string().min(1)).nullable().optional(),
  components: z.array(SkillComponentSchemaRaw).nullable().optional(),
  generated_by: z.string().optional(),
  generatedBy: z.string().optional(),
}).refine((data) => {
  // Validar que al menos una versión de cada campo requerido esté presente
  const hasSkillName = data.skill_name || data.skillName;
  const hasSkillCategory = data.skill_category || data.skillCategory;
  const hasMarketDemand = data.market_demand || data.marketDemand;
  const hasIsSkillValid = data.is_skill_valid !== undefined || data.isSkillValid !== undefined;
  
  return hasSkillName && hasSkillCategory && hasMarketDemand && hasIsSkillValid;
}, {
  message: "Los campos requeridos (skill_name/skillName, skill_category/skillCategory, market_demand/marketDemand, is_skill_valid/isSkillValid) deben estar presentes en alguna de sus variantes."
});

export const SkillAnalysisSchema = SkillAnalysisSchemaRaw.transform((data) => {
  // Usar campos de ambos formatos (snake_case o camelCase)
  const skillName = data.skill_name || data.skillName || '';
  const skillCategoryRaw = data.skill_category || data.skillCategory || '';
  const marketDemandRaw = data.market_demand || data.marketDemand || '';
  const isSkillValid = data.is_skill_valid !== undefined ? data.is_skill_valid : data.isSkillValid;
  const viabilityReason = data.viability_reason || data.viabilityReason;
  const learningPathRecommendation = data.learning_path_recommendation || data.learningPathRecommendation;
  const realWorldApplications = data.real_world_applications || data.realWorldApplications;
  const complementarySkills = data.complementary_skills || data.complementarySkills;
  const generatedBy = data.generated_by || data.generatedBy || 'llm-openai';

  // Mapear los enums a los valores válidos, o a un default.
  let skillCategory: 'TECHNICAL' | 'SOFT_SKILL' | 'CREATIVE' | 'BUSINESS' | 'ACADEMIC' | 'LANGUAGE' | 'HEALTH_WELLNESS' | 'HOBBY' | 'OTHER' = 'OTHER';
  if (skillCategoryRaw.toUpperCase().includes('BUSINESS')) skillCategory = 'BUSINESS';
  if (skillCategoryRaw.toUpperCase().includes('TECHNICAL')) skillCategory = 'TECHNICAL';
  // ... añadir más mapeos si es necesario ...

  let marketDemand: 'HIGH' | 'MEDIUM' | 'LOW' | 'NICHE' | 'EMERGING' | 'UNKNOWN' = 'UNKNOWN';
  const demand = marketDemandRaw.toUpperCase();
  if (demand.includes('HIGH')) marketDemand = 'HIGH';
  else if (demand.includes('MEDIUM')) marketDemand = 'MEDIUM';
  else if (demand.includes('LOW')) marketDemand = 'LOW';
  
  // Transformar los componentes usando el schema ya definido
  const transformedComponents = data.components?.map((c, index) => {
    try {
      return SkillComponentSchema.parse({ ...c, order: index + 1 });
    } catch (error) {
      console.warn(`Error transforming skill component at index ${index}:`, error);
      return null;
    }
  }).filter(Boolean) || [];

  return {
    // NOTA: Mantenemos skillName para el LLM pero será filtrado en dataConnect.service
    skillName: skillName,
    skillCategory: skillCategory,
    marketDemand: marketDemand,
    isSkillValid: isSkillValid,
    viabilityReason: viabilityReason ?? undefined,
    learningPathRecommendation: learningPathRecommendation,
    realWorldApplications: realWorldApplications,
    complementarySkills: complementarySkills,
    generatedBy: generatedBy,
    components: transformedComponents || [],
  };
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

const LearningSectionSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  order: z.number().int().positive(),
  days: z.array(LearningDaySchema).min(1),
});

const LearningPlanSchemaRaw = z.object({
  // Campos que vienen de la IA
  total_duration_weeks: z.number().int().positive(),
  daily_time_minutes: z.number().int().positive(),
  skill_level_target: z.string(), // Flexible
  milestones: z.array(z.string().min(1)).min(1),
  progress_metrics: z.array(z.string().min(1)).min(1),
  flexibility_options: z.array(z.string().min(1)).optional().nullable(),
  daily_activities: z.array(
    z.object({
      type: z.string().min(1),
      duration_minutes: z.number().int().positive(),
      description: z.string().min(1),
      order: z.number().int().optional(), // El orden puede no venir
    })
  ).min(1),
  resources: z.array(
    z.object({
      name: z.string().min(1),
      url: z.string().min(1), // Changed from .url() to .min(1) to be more permissive
      resourceType: z.string().optional().nullable(),
      order: z.number().int().optional(), // El orden puede no venir
    })
  ),
  // Campos que no vienen pero son requeridos por el schema final
  skillName: z.string().min(1).optional(),
  generatedBy: z.string().min(1).default('llm-openai'),
  sections: z.array(LearningSectionSchema).optional(), // El LLM no lo manda, lo creamos en el transform
  pedagogicalAnalysis: PedagogicalAnalysisSchema.optional(), // El LLM no lo manda
});

export const LearningPlanSchema = LearningPlanSchemaRaw.transform((data) => {
  // Lógica para crear secciones y días si no vienen
  let sections = data.sections;
  if (!sections) {
    // Si el LLM no crea secciones, creamos una por defecto con todos los hitos como días.
    const days = data.milestones.map((milestone, index) => ({
      dayNumber: index + 1,
      title: milestone,
      focusArea: milestone,
      isActionDay: false, 
      objectives: [`Complete milestone: ${milestone}`],
      completionStatus: 'PENDING' as const,
      order: index + 1,
    }));
    sections = [{
      title: 'Learning Journey',
      description: 'Main learning path section.',
      order: 1,
      days: days,
    }];
  }

  return {
    skillName: data.skillName || 'Unknown Skill', // Provee un default
    generatedBy: data.generatedBy,
    totalDurationWeeks: data.total_duration_weeks,
    dailyTimeMinutes: data.daily_time_minutes,
    skillLevelTarget: data.skill_level_target.toUpperCase() as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    milestones: data.milestones,
    progressMetrics: data.progress_metrics,
    flexibilityOptions: data.flexibility_options,
    sections: sections,
    dailyActivities: data.daily_activities.map((act, index) => ({...act, order: act.order ?? index + 1})),
    resources: data.resources.map((res, index) => ({
        name: res.name,
        urlOrDescription: res.url,
        resourceType: res.resourceType,
        order: res.order ?? index + 1
    })),
    // Hacemos el análisis pedagógico opcional para que no falle la validación
    pedagogicalAnalysis: data.pedagogicalAnalysis,
  };
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

// --- Onboarding Schemas ---

export const OnboardingPreferencesSchema = z.object({
  skill: z.string().min(1, 'Skill is required.'),
  experience: z.union([
    z.enum(['Beginner', 'Intermediate', 'Advanced']),
    z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  ]).transform((val) => {
    // Normalizar a formato con primera letra mayúscula
    return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
  }),
  time: z.string().min(1, 'Time commitment is required.'), // ej: "10min / day"
  motivation: z.string().min(1, 'Motivation is required.'), // ej: "Career Growth"
  goal: z.string().optional(),
  // Nuevos campos opcionales para mejor personalización
  learning_style: z.enum(['visual', 'auditory', 'kinesthetic', 'reading']).optional(),
  preferred_study_time: z.enum(['morning', 'afternoon', 'evening', 'flexible']).optional(),
  learning_context: z.enum(['career_change', 'skill_improvement', 'hobby', 'academic', 'promotion']).optional(),
  challenge_preference: z.enum(['gradual', 'moderate', 'intense']).optional(),
});

export const UserPreferencesSchema = z.object({
  userFirebaseUid: z.string().min(1),
  skill: z.string().min(1),
  experienceLevel: z.string().min(1),
  motivation: z.string().min(1),
  availableTimeMinutes: z.number().int().positive(),
  goal: z.string(),
  // Nuevos campos opcionales
  learningStyle: z.string().optional().nullable(),
  preferredStudyTime: z.string().optional().nullable(),
  learningContext: z.string().optional().nullable(),
  challengePreference: z.string().optional().nullable(),
});

// --- Type Exports ---

export type OnboardingPreferences = z.infer<typeof OnboardingPreferencesSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

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

export type AdaptiveLearningRecommendation = z.infer<typeof AdaptiveLearningRecommendationSchema>;

export type SkillComponent = z.infer<typeof SkillComponentSchema>;
export type SkillAnalysis = z.infer<typeof SkillAnalysisSchema>;

export type SkiMessage = z.infer<typeof SkiMessageSchema>;
export type StreakCelebration = z.infer<typeof StreakCelebrationSchema>;
export type DailyMotivation = z.infer<typeof DailyMotivationSchema>; 