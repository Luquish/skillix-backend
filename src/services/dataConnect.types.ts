// src/services/dataConnect.types.ts

// ==================== ENUMS ====================
// Estos tipos se basan en tu schema.gql y deben coincidir.

export enum AuthProvider {
    EMAIL = "EMAIL",
    GOOGLE = "GOOGLE",
    APPLE = "APPLE"
}

export enum Platform {
    IOS = "IOS",
    ANDROID = "ANDROID",
    WEB = "WEB"
}

export enum UserExperienceLevel {
    BEGINNER = "BEGINNER",
    INTERMEDIATE = "INTERMEDIATE",
    ADVANCED = "ADVANCED"
}



export enum DifficultyAdaptationLevel {
    EASIER = "EASIER",
    STANDARD = "STANDARD",
    HARDER = "HARDER"
}

export enum CompletionStatus {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    SKIPPED = "SKIPPED",
    FAILED = "FAILED"
}

export enum EnrollmentStatus {
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    PAUSED = "PAUSED"
}

export enum ContentBlockType {
    READ = "READ",
    AUDIO = "AUDIO",
    MAIN_CONTENT_AUDIO = "MAIN_CONTENT_AUDIO",
    MAIN_CONTENT_READ = "MAIN_CONTENT_READ",
    QUIZ_MCQ = "QUIZ_MCQ",
    QUIZ_TRUE_FALSE = "QUIZ_TRUE_FALSE",
    QUIZ_MATCH_MEANING = "QUIZ_MATCH_MEANING",
    QUIZ_SCENARIO = "QUIZ_SCENARIO",
    ACTION_TASK = "ACTION_TASK",
    EXERCISE_GENERAL = "EXERCISE_GENERAL",
    VIDEO = "VIDEO",
    INFO_BLOCK = "INFO_BLOCK",
    OTHER = "OTHER"
}

export enum QuizQuestionType {
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
    TRUE_FALSE = "TRUE_FALSE",
    FILL_IN_THE_BLANK = "FILL_IN_THE_BLANK"
}

export enum ExerciseType {
    MATCHING = "MATCHING",
    FILL_IN_THE_BLANK = "FILL_IN_THE_BLANK",
    CODE_COMPLETION = "CODE_COMPLETION"
}

export enum SkillCategory {
    TECHNICAL = "TECHNICAL",
    CREATIVE = "CREATIVE",
    BUSINESS = "BUSINESS",
    SOFT_SKILL = "SOFT_SKILL",
    ACADEMIC = "ACADEMIC",
    LANGUAGE = "LANGUAGE",
    HEALTH_WELLNESS = "HEALTH_WELLNESS",
    HOBBY = "HOBBY",
    OTHER = "OTHER"
}

export enum MarketDemand {
    HIGH = "HIGH",
    MEDIUM = "MEDIUM",
    LOW = "LOW",
    NICHE = "NICHE",
    EMERGING = "EMERGING",
    UNKNOWN = "UNKNOWN"
}

export enum MessageRole {
    USER = "USER",
    ASSISTANT = "ASSISTANT"
}

export enum ToviEmojiStyle {
    PLAYFUL = "PLAYFUL",
    CELEBRATORY = "CELEBRATORY",
    ENCOURAGING = "ENCOURAGING",
    WISE = "WISE",
    GENTLE = "GENTLE",
    CALM = "CALM",
    ENERGETIC = "ENERGETIC",
    SUPPORTIVE = "SUPPORTIVE"
}

// ==================== USER RELATED TABLE INTERFACES ====================
export interface DbUser {
    firebaseUid: string;
    email: string;
    name?: string | null;
    authProvider: string;
    platform?: string | null;
    photoUrl?: string | null;
    emailVerified?: boolean | null;
    llmKeyInsights?: string[] | null;
    llmOverallEngagementScore?: number | null;
    fcmTokens?: string[] | null;
    lastSignInAt?: string | null; // Timestamp
    isActive?: boolean | null;
    appleUserIdentifier?: string | null;
    isDeleted?: boolean | null;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
}

export interface DbUserPreference {
    id: string;
    user: DbUser;
    userFirebaseUid: string;
    skill: string;
    experienceLevel: string;
    motivation: string;
    availableTimeMinutes: number;
    goal: string;
    learningStyle?: string | null;
    preferredStudyTime?: string | null;
    learningContext?: string | null;
    challengePreference?: string | null;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
}

export interface DbStreakData {
    id: string;
    user: DbUser;
    userFirebaseUid: string;
    currentStreak: number;
    longestStreak: number;
    lastContributionDate?: string | null; // Date
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
}

export interface DbNotification {
    id: string;
    user: DbUser;
    userFirebaseUid: string;
    message: string;
    type?: string | null;
    isRead: boolean;
    scheduledTime?: string | null; // Timestamp
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
}

export interface DbTovi {
    id: string;
    user: DbUser;
    userFirebaseUid: string;
    name: string;
    personality: string;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
}

export interface DbToviMessage {
    id: string;
    tovi: DbTovi;
    toviId: string;
    user: DbUser;
    userFirebaseUid: string;
    situation?: string | null;
    message: string;
    isFromTovi: boolean;
    isFirstMessage: boolean;
    isDelivered: boolean;
    isRead: boolean;
    toviEmojiStyle: ToviEmojiStyle;
    animationSuggestion: string;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
}

// ==================== LEARNING PLAN TABLE INTERFACES ====================
export interface DbLearningPlan {
    id: string;
    user: DbUser;
    userFirebaseUid: string;
    skillName: string;
    generatedBy: string;
    generatedAt: string; // Timestamp
    totalDurationWeeks: number;
    dailyTimeMinutes: number;
    skillLevelTarget: string;
    milestones: string[];
    progressMetrics: string[];
    flexibilityOptions?: string[] | null;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp

    skillAnalysis?: DbSkillAnalysis | null;
    pedagogicalAnalysis?: DbPedagogicalAnalysis | null;
    sections?: DbPlanSection[];
    dailyActivityTemplates?: DbLearningPlanDailyActivityTemplate[];
    resources?: DbLearningPlanResource[];
}

export interface DbLearningPlanDailyActivityTemplate {
    id: string;
    learningPlan: DbLearningPlan;
    learningPlanId: string;
    activityType: string;
    description: string;
}

export interface DbLearningPlanResource {
    id: string;
    learningPlan: DbLearningPlan;
    learningPlanId: string;
    title: string;
    url: string;
    resourceType: string;
}

export interface DbSkillAnalysis {
    id: string;
    learningPlan: DbLearningPlan;
    learningPlanId: string;
    skillName: string;
    skillCategory: SkillCategory;
    marketDemand: MarketDemand;
    learningPathRecommendation: string;
    realWorldApplications: string[];
    complementarySkills: string[];
    isSkillValid: boolean;
    viabilityReason?: string | null;
    generatedBy: string;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
    components?: DbSkillComponentData[];
}

export interface DbSkillComponentData {
    id: string;
    skillAnalysis: DbSkillAnalysis;
    skillAnalysisId: string;
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
    learningPlan: DbLearningPlan;
    learningPlanId: string;
    effectivenessScore: number;
    cognitiveLoadAssessment: string;
    scaffoldingQuality: string;
    engagementPotential: number;
    recommendations: string[];
    assessmentStrategies: string[];
    improvementAreas: string[];
    generatedBy: string;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
    objectives?: DbLearningObjectiveData[];
}

export interface DbLearningObjectiveData {
    id: string;
    pedagogicalAnalysis: DbPedagogicalAnalysis;
    pedagogicalAnalysisId: string;
    objective: string;
    measurable: boolean;
    timeframe: string;
    order: number;
}

export interface DbPlanSection {
    id: string;
    learningPlan: DbLearningPlan;
    learningPlanId: string;
    title: string;
    description?: string | null;
    order: number;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
    days?: DbDayContent[];
}

// ==================== CONTENT (DAILY) TABLE INTERFACES ====================
export interface DbDayContent {
    id: string;
    section: DbPlanSection;
    sectionId: string;
    dayNumber: number;
    title: string;
    focusArea: string;
    isActionDay: boolean;
    objectives: string[];
    generatedBy?: string | null;
    generatedAt?: string | null; // Timestamp
    completionStatus?: CompletionStatus | null;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp

    mainContentItem?: DbMainContentItem | null;
    contentBlocks?: DbContentBlockItem[];
    actionTaskItem?: DbActionTaskItem | null;
}

export interface DbMainContentItem {
    id: string;
    dayContent: DbDayContent;
    dayContentId: string;
    title: string;
    textContent: string;
    audioUrl?: string | null;
    estimatedReadTimeMinutes?: number | null;
    audioDurationSeconds?: number | null;
    funFact: string;
    xp: number;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
    keyConcepts?: DbKeyConcept[];
}

export interface DbKeyConcept {
    id: string;
    mainContentItem: DbMainContentItem;
    mainContentItemId: string;
    concept: string;
    explanation: string;
    emoji?: string | null;
}

export interface DbActionTaskItem {
    id: string;
    dayContent: DbDayContent;
    dayContentId: string;
    title: string;
    challengeDescription: string;
    timeEstimateString: string;
    tips: string[];
    realWorldContext: string;
    successCriteria: string[];
    toviMotivation: string;
    difficultyAdaptation?: DifficultyAdaptationLevel | null;
    xp: number;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
    steps?: DbActionStepItem[];
}

export interface DbActionStepItem {
    id: string;
    actionTaskItem: DbActionTaskItem;
    actionTaskItemId: string;
    stepNumber: number;
    description: string;
    estimatedTimeSeconds: number;
    isCompleted: boolean;
}

export interface DbContentBlockItem {
    id: string;
    dayContent: DbDayContent;
    dayContentId: string;
    blockType: ContentBlockType;
    title: string;
    xp: number;
    order: number;
    estimatedMinutes?: number | null;
    quizDetails?: DbQuizContentDetails | null;
    quizDetailsId?: string | null;
    exerciseDetails?: DbExerciseDetailsData | null;
    exerciseDetailsId?: string | null;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
}

export interface DbQuizContentDetails {
    id: string;
    description: string;
    questions?: DbQuizQuestionData[];
}

export interface DbQuizQuestionData {
    id:string;
    quizDetails: DbQuizContentDetails;
    quizDetailsId: string;
    question: string;
    questionType: QuizQuestionType;
    explanation?: string | null;
    options?: DbQuizOptionData[];
}

export interface DbQuizOptionData {
    id: string;
    question: DbQuizQuestionData;
    questionId: string;
    optionText: string;
    isCorrect: boolean;
}

export interface DbExerciseDetailsData {
    id: string;
    instructions: string;
    exerciseType: ExerciseType;
    matchPairs?: DbMatchPair[];
}

export interface DbMatchPair {
    id: string;
    exercise: DbExerciseDetailsData;
    exerciseId: string;
    prompt: string;
    correctAnswer: string;
}

// ==================== ENROLLMENT & PROGRESS TABLE INTERFACES ====================
export interface DbEnrollment {
    id: string;
    user: DbUser;
    userFirebaseUid: string;
    learningPlan: DbLearningPlan;
    learningPlanId: string;
    enrollmentDate?: string | null; // Timestamp
    status: EnrollmentStatus;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
}

// ==================== ANALYTICS TABLE INTERFACES ====================
export interface DbUserAnalytics {
    id: string;
    user: DbUser;
    userFirebaseUid: string;
    optimalLearningTime?: DbOptimalLearningTimeData | null;
    optimalLearningTimeId?: string | null;
    contentOptimization?: DbContentOptimizationData | null;
    contentOptimizationId?: string | null;
    streakMaintenanceAnalysis?: DbStreakMaintenanceData | null;
    streakMaintenanceAnalysisId?: string | null;
    overallEngagementScore?: number | null;
    keyInsights?: string[] | null;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
    learningPatterns?: DbLearningPatternData[];
}

export interface DbLearningPatternData {
    id: string;
    userAnalytics: DbUserAnalytics;
    userAnalyticsId: string;
    patternType: string;
    details: string;
    confidenceScore: number;
}

export interface DbOptimalLearningTimeData {
    id: string;
    timeOfDay: string;
    confidence: number;
    reasoning: string;
}

export interface DbContentOptimizationData {
    id: string;
    suggestionType: string;
    details: string;
    expectedImpact: string;
}

export interface DbStreakMaintenanceData {
    id: string;
    recommendation: string;
    timing: string;
    confidence: number;
}


// ==================== CHAT SESSION TABLE INTERFACES ====================
export interface DbChatSession {
    id: string;
    user: DbUser;
    userFirebaseUid: string;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
    messages?: DbChatMessage[];
}

export interface DbChatMessage {
    id: string;
    chatSession: DbChatSession;
    chatSessionId: string;
    userFirebaseUid: string;
    role: MessageRole;
    content: string;
    createdAt?: string | null; // Timestamp
    updatedAt?: string | null; // Timestamp
}

// --- Tipos para Inserciones (Mutations) ---

export type UserPreferenceInsert = Omit<DbUserPreference, 'id'>;
export type EnrollmentInsert = {
    userFirebaseUid: string;
    learningPlanId: string;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
};
