// src/services/dataConnect.types.ts

// ==================== ENUMS ====================
// Estos tipos se basan en tu enums.gql y deben coincidir.

export type AuthProvider = "EMAIL" | "GOOGLE" | "APPLE" | "ANONYMOUS";
export type Platform = "IOS" | "ANDROID" | "WEB" | "UNKNOWN";
export type UserExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EASIER" | "HARDER" | "STANDARD";
export type LearningStyle = "VISUAL" | "AUDITORY" | "KINESTHETIC" | "READING_WRITING" | "MIXED" | "UNDEFINED";
export type ContentBlockType =
  | "AUDIO"
  | "READ"
  | "MAIN_CONTENT_AUDIO"
  | "MAIN_CONTENT_READ"
  | "QUIZ_MCQ"
  | "QUIZ_TRUE_FALSE"
  | "QUIZ_MATCH_MEANING"
  | "QUIZ_SCENARIO"
  | "ACTION_TASK"
  | "EXERCISE_GENERAL"
  | "VIDEO"
  | "INFO_BLOCK"
  | "OTHER";

export type CompletionStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "FAILED";
export type SkillCategory =
  | "TECHNICAL"
  | "SOFT_SKILL"
  | "CREATIVE"
  | "BUSINESS"
  | "ACADEMIC"
  | "LANGUAGE"
  | "HEALTH_WELLNESS"
  | "HOBBY"
  | "OTHER";
export type MarketDemand = "HIGH" | "MEDIUM" | "LOW" | "NICHE" | "EMERGING" | "UNKNOWN";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type PatternType = "TIME_BASED" | "PERFORMANCE_BASED" | "ENGAGEMENT_BASED" | "CONTENT_PREFERENCE" | "PACING_STYLE" | "OTHER";
export type DifficultyAdjustment = "INCREASE" | "MAINTAIN" | "DECREASE";
export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";
export type ToviEmojiStyle = "PLAYFUL" | "CELEBRATORY" | "ENCOURAGING" | "WISE" | "GENTLE" | "CALM" | "ENERGETIC" | "SUPPORTIVE";

// ==================== USER RELATED TABLE INTERFACES ====================
export interface DbUser {
  id: string;
  email: string;
  name?: string | null;
  isActive: boolean;
  authProvider: AuthProvider;
  platform?: Platform | null;
  firebaseUid: string;
  photoUrl?: string | null;
  emailVerified: boolean;
  appleUserIdentifier?: string | null;
  lastSignInAt?: string | null;
  createdAt: string;
  updatedAt: string;
  llmKeyInsights?: string[] | null;
  llmOverallEngagementScore?: number | null;
  fcmTokens?: string[] | null;

  preferences?: DbUserPreference | null;
  enrollments?: DbEnrollment[];
  chatSessions?: DbChatSession[];
  streakData?: DbStreakData | null;
  notifications?: DbNotification[];
  analyticsEntries?: DbUserAnalyticsEntry[];
  toviMessages?: DbToviMessage[];
}

export interface DbUserPreference {
  id: string;
  userId: string;
  user?: DbUser;
  skill: string;
  experienceLevel: UserExperienceLevel;
  motivation: string;
  availableTimeMinutes: number;
  learningStyle: LearningStyle;
  goal: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbStreakData {
    id: string;
    userId: string;
    user?: DbUser;
    currentStreak: number;
    longestStreak: number;
    lastContributionDate?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DbNotification {
    id: string;
    userId: string;
    user?: DbUser;
    message: string;
    type?: string | null;
    isRead: boolean;
    scheduledTime?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DbToviMessage {
    id: string;
    userId: string;
    user?: DbUser;
    situation?: string | null;
    message: string;
    toviEmojiStyle: ToviEmojiStyle;
    animationSuggestion: string;
    isDelivered: boolean;
    createdAt: string;
    updatedAt: string;
}

// ==================== LEARNING PLAN TABLE INTERFACES ====================
export interface DbLearningPlan {
  id: string;
  userId: string;
  user?: DbUser;
  skillName: string;
  generatedBy: string;
  generatedAt: string;
  totalDurationWeeks: number;
  dailyTimeMinutes: number;
  skillLevelTarget: UserExperienceLevel;
  milestones: string[];
  progressMetrics: string[];
  flexibilityOptions?: string[] | null;
  createdAt: string;
  updatedAt: string;

  skillAnalysis?: DbSkillAnalysis | null;
  pedagogicalAnalysis?: DbPedagogicalAnalysis | null;
  sections?: DbPlanSection[];
  dailyActivityTemplates?: DbDailyActivityTemplate[];
  suggestedResources?: DbLearningPlanResource[];
  enrollments?: DbEnrollment[];
}

export interface DbDailyActivityTemplate {
  type: string;
  durationMinutes: number;
  description: string;
  order?: number | null;
}

export interface DbLearningPlanResource {
  name: string;
  urlOrDescription: string;
  resourceType?: string | null;
  order?: number | null;
}

export interface DbSkillAnalysis {
  id: string;
  learningPlanId: string;
  learningPlan?: DbLearningPlan;
  skillName: string;
  skillCategory: SkillCategory;
  marketDemand: MarketDemand;
  isSkillValid: boolean;
  viabilityReason?: string | null;
  learningPathRecommendation: string;
  realWorldApplications: string[];
  complementarySkills: string[];
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
  components?: DbSkillComponentData[];
}

export interface DbSkillComponentData {
  name: string;
  description: string;
  difficultyLevel: UserExperienceLevel;
  prerequisitesText: string[];
  estimatedLearningHours: number;
  practicalApplications: string[];
  order: number;
}

export interface DbPedagogicalAnalysis {
  id: string;
  learningPlanId: string;
  learningPlan?: DbLearningPlan;
  effectivenessScore: number;
  cognitiveLoadAssessment: string;
  scaffoldingQuality: string;
  engagementPotential: number;
  recommendations: string[];
  assessmentStrategies: string[];
  improvementAreas: string[];
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
  objectives?: DbLearningObjectiveData[];
}

export interface DbLearningObjectiveData {
  objective: string;
  measurable: boolean;
  timeframe: string;
  order: number;
}

export interface DbPlanSection {
  id: string;
  learningPlanId: string;
  learningPlan?: DbLearningPlan;
  title: string;
  description?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  days?: DbDayContent[];
}

// ==================== CONTENT (DAILY) TABLE INTERFACES ====================
export interface DbDayContent {
  id: string;
  sectionId: string;
  section?: DbPlanSection;
  dayNumber: number;
  title: string;
  focusArea: string;
  isActionDay: boolean;
  objectives: string[];
  generatedBy?: string | null;
  generatedAt?: string | null;
  completionStatus: CompletionStatus;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  mainContentItem?: DbMainContentItem | null;
  contentBlocks?: DbContentBlockItem[];
  actionTaskItem?: DbActionTaskItem | null;
  enrollmentProgress?: DbContentProgress[];
}

export interface DbKeyConcept {
  term: string;
  definition: string;
  order: number;
}

export interface DbMainContentItem {
  id: string;
  dayContentId: string;
  dayContent?: DbDayContent;
  title: string;
  textContent: string;
  audioUrl?: string | null;
  estimatedReadTimeMinutes?: number | null;
  audioDurationSeconds?: number | null;
  funFact: string;
  xp: number;
  keyConcepts: DbKeyConcept[];
  createdAt: string;
  updatedAt: string;
}

export interface DbContentBlockItem {
  id: string;
  dayContentId: string;
  dayContent?: DbDayContent;
  blockType: ContentBlockType;
  title: string;
  xp: number;
  order: number;
  estimatedMinutes?: number | null;
  createdAt: string;
  updatedAt: string;
  quizDetails?: DbQuizContentDetails | null;
  exerciseDetails?: DbExerciseDetailsData | null;
}

export interface DbQuizContentDetails {
  quizType: string;
  questions: DbQuizQuestionData[];
}

export interface DbQuizQuestionData {
  questionText: string;
  explanation: string;
  order: number;
  trueFalseAnswer?: boolean | null;
  matchPairsJson?: string | null;
  scenarioText?: string | null;
  options?: DbQuizOptionData[] | null;
}

export interface DbQuizOptionData {
  optionText: string;
  isCorrect: boolean;
  order: number;
}

export interface DbExerciseDetailsData {
  exerciseType: string;
  instructions: string;
  exerciseDataJson: string;
}

export interface DbActionTaskItem {
  id: string;
  dayContentId: string;
  dayContent?: DbDayContent;
  title: string;
  challengeDescription: string;
  timeEstimateString: string;
  tips: string[];
  realWorldContext: string;
  successCriteria: string[];
  skiMotivation: string;
  difficultyAdaptation?: UserExperienceLevel | null;
  xp: number;
  createdAt: string;
  updatedAt: string;
  steps?: DbActionStepItem[];
}

export interface DbActionStepItem {
  id: string;
  actionTaskId: string;
  actionTask?: DbActionTaskItem;
  instruction: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbContentProgress {
  id: string;
  enrollmentId: string;
  enrollment?: DbEnrollment;
  dayContentId: string;
  dayContent?: DbDayContent;
  contentBlockId: string;
  contentBlock?: DbContentBlockItem;
  completed: boolean;
  xpEarned: number;
  attempts: number;
  timeSpentSeconds: number;
  scorePercent?: number | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  quizResponses?: DbQuizResponse[];
}

export interface DbQuizResponse {
  id: string;
  contentProgressId: string;
  contentProgress?: DbContentProgress;
  quizQuestionId: string;
  quizQuestion?: DbQuizQuestionData;
  selectedOptionId?: string | null;
  responseTextAnswer?: string | null;
  isCorrect: boolean;
  answeredAt: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== ENROLLMENT & PROGRESS TABLE INTERFACES ====================
export interface DbEnrollment {
  id: string;
  userId: string;
  user?: DbUser;
  learningPlanId: string;
  learningPlan?: DbLearningPlan;
  status: CompletionStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  lastActivityAt?: string | null;
  currentDayNumber: number;
  totalXpEarned: number;
  createdAt: string;
  updatedAt: string;
  progressEntries?: DbContentProgress[];
}

// ==================== ANALYTICS TABLE INTERFACES ====================
export interface DbUserAnalyticsEntry {
  id: string;
  userId: string;
  user?: DbUser;
  date?: string;
  totalXpEarnedThisDay?: number;
  sessionsCountThisDay?: number;
  timeSpentLearningMinutesThisDay?: number;
  contentBlocksCompletedThisDay?: number;
  quizAverageScoreThisDay?: number | null;
  currentStreakForDate?: number;
  
  llmLearningPatternsJson?: DbLearningPatternData[] | null;
  llmOptimalTimeJson?: DbOptimalLearningTimeData | null;
  llmContentOptimizationJson?: DbContentOptimizationData | null;
  llmStreakMaintenanceJson?: DbStreakMaintenanceData | null;
  llmGeneratedOverallEngagementScore?: number | null;
  llmGeneratedKeyInsights?: string[] | null;
  lastActivityAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbLearningPatternData {
    patternType: PatternType;
    description: string;
    confidence: number;
    recommendations: string[];
}

export interface DbOptimalLearningTimeData {
    bestTimeWindowStart: string;
    bestTimeWindowEnd: string;
    reason: string;
    notificationTime: string;
    engagementPrediction: number;
}

export interface DbContentOptimizationData {
    difficultyAdjustment: DifficultyAdjustment;
    contentTypePreferences: string[];
    idealSessionLengthMinutes: number;
    pacingRecommendation: string;
}

export interface DbStreakMaintenanceData {
    riskLevel: RiskLevel;
    riskFactors: string[];
    interventionStrategies: string[];
    motivationalApproach: string;
}

// ==================== CHAT SESSION TABLE INTERFACES ====================
export interface DbChatSession {
  id: string;
  userId: string;
  user?: DbUser;
  createdAt: string;
  updatedAt: string;
  messages?: DbChatMessage[];
}

export interface DbChatMessage {
  id: string;
  chatSessionId: string;
  chatSession?: DbChatSession;
  userId: string;
  user?: DbUser;
  role: MessageRole | string;
  content: string;
  createdAt: string;
}
