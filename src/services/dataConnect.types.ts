// src/services/dataConnect.types.ts

// ==================== ENUMS ====================
// Estos tipos se basan en tu enums.gql y deben coincidir.

export type AuthProvider = "EMAIL" | "GOOGLE" | "APPLE" | "ANONYMOUS";
export type Platform = "IOS" | "ANDROID" | "WEB" | "UNKNOWN";
export type UserExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type LearningStyle = "VISUAL" | "AUDITORY" | "KINESTHETIC" | "READING_WRITING" | "MIXED" | "UNDEFINED"; // Añadido UNDEFINED como posible default
export type MainContentType = "AUDIO" | "READ"; // Debe coincidir con el enum en schema.gql

export type ContentBlockType = // Debe coincidir con el enum en schema.gql
  | "MAIN_CONTENT_AUDIO" // Ejemplo, si los diferencias así
  | "MAIN_CONTENT_READ"
  | "QUIZ_MCQ"
  | "QUIZ_TRUE_FALSE"
  | "QUIZ_MATCH_MEANING"
  | "QUIZ_SCENARIO"
  | "ACTION_TASK"
  | "EXERCISE_GENERAL"
  | "VIDEO"
  | "INFO_BLOCK" // Añade todos los tipos de tu enum ContentBlockType
  | "OTHER";


export type CompletionStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "FAILED"; // Añadido FAILED
export type SkillCategory =
  | "TECHNICAL"
  | "CREATIVE"
  | "BUSINESS"
  | "PERSONAL_DEVELOPMENT"
  | "LANGUAGE"
  | "ACADEMIC"
  | "HOBBY"
  | "HEALTH_WELLNESS"
  | "SOFT_SKILLS"
  | "PHYSICAL_SPORTS"
  | "OTHER";
export type MarketDemand = "HIGH" | "MEDIUM" | "LOW" | "NICHE" | "EMERGING" | "UNDEFINED"; // Añadido UNDEFINED
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH"; // Para UserAnalytics o StreakMaintenance
export type DifficultyLevel = "EASIER" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "HARDER" | "STANDARD";
export type LearningPatternType = "TIME_BASED" | "PERFORMANCE_BASED" | "ENGAGEMENT_BASED" | "CONTENT_PREFERENCE" | "PACING_STYLE" | "OTHER";

// ==================== USER RELATED TABLE INTERFACES ====================
export interface DbUser {
  id: string;
  email: string;
  name?: string | null; // name es preferido sobre displayName para consistencia con GQL
  isActive: boolean; // Generalmente no nulo, con default true
  authProvider: AuthProvider;
  platform?: Platform | null;
  firebaseUid: string; // Clave única
  photoUrl?: string | null;
  emailVerified: boolean; // Generalmente no nulo, con default false
  appleUserIdentifier?: string | null;
  lastSignInAt?: string | null; // ISO Timestamp string
  createdAt: string; // ISO Timestamp string
  updatedAt: string; // ISO Timestamp string
  llmKeyInsights?: string[] | null;
  llmOverallEngagementScore?: number | null;
  fcmTokens?: string[] | null;

  // Relaciones (pueden ser solo IDs o los objetos completos si se hace un fetch profundo)
  preferences?: DbUserPreference | null; // Asumiendo one-to-one o one-to-few
  enrollments?: DbEnrollment[];
  chatSessions?: DbChatSession[];
  streakData?: DbStreakData | null; // Asumiendo one-to-one
  notifications?: DbNotification[];
  analyticsEntries?: DbUserAnalyticsEntry[];
}

export interface DbUserPreference {
  id: string;
  userId: string; // Foreign Key a User.id
  user?: DbUser; // Relación inversa
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
    userId: string; // Foreign Key a User.id
    user?: DbUser; // Relación inversa
    currentStreak: number;
    longestStreak: number;
    lastContributionDate?: string | null; // YYYY-MM-DD
    createdAt: string;
    updatedAt: string;
}

export interface DbNotification {
    id: string;
    userId: string; // Foreign Key a User.id
    user?: DbUser; // Relación inversa
    title: string;
    body: string;
    type: string; // Ej: "STREAK_REMINDER", "NEW_CONTENT_AVAILABLE"
    isRead: boolean;
    readAt?: string | null;
    dataJson?: string | null; // Para deep-linking u otra info
    createdAt: string;
    updatedAt: string;
}


// ==================== LEARNING PLAN TABLE INTERFACES ====================
export interface DbLearningPlan {
  id: string;
  userId: string; // Foreign Key a User.id
  user?: DbUser;   // Relación inversa
  skillName: string;
  generatedBy: string; // Ej: "LearningPlannerLLM_v1.2"
  generatedAt: string; // ISO Timestamp
  totalDurationWeeks: number;
  dailyTimeMinutes: number;
  skillLevelTarget: UserExperienceLevel;
  milestones: string[]; // Array de strings
  progressMetrics: string[]; // Array de strings
  flexibilityOptions?: string[] | null; // Array de strings
  createdAt: string;
  updatedAt: string;

  // Relaciones
  skillAnalysis?: DbSkillAnalysis | null; // One-to-one
  pedagogicalAnalysis?: DbPedagogicalAnalysis | null; // One-to-one
  sections?: DbPlanSection[]; // One-to-many
  dailyActivityTemplates?: DbDailyActivityItem[]; // One-to-many
  suggestedResources?: DbLearningResourceItem[]; // One-to-many
  enrollments?: DbEnrollment[]; // One-to-many (usuarios inscritos en este plan si fuera un plan plantilla)
                               // Si es un plan específico de usuario, la relación es más bien User (1) -> LearningPlan (many)
}

export interface DbDailyActivityItem {
  id: string;
  learningPlanId: string; // FK a LearningPlan.id
  learningPlan?: DbLearningPlan;
  type: string;
  durationMinutes: number;
  description: string;
  order?: number | null;
  createdAt: string; // Añadido
  updatedAt: string; // Añadido
}

export interface DbLearningResourceItem {
  id: string;
  learningPlanId: string; // FK a LearningPlan.id
  learningPlan?: DbLearningPlan;
  name: string;
  urlOrDescription: string;
  resourceType?: string | null; // Ej: "VIDEO", "ARTICLE", "BOOK"
  order?: number | null;
  createdAt: string; // Añadido
  updatedAt: string; // Añadido
}

export interface DbSkillAnalysis {
  id: string;
  learningPlanId: string; // FK a LearningPlan.id (si es 1-to-1 con plan) o podría ser independiente
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
  updatedAt: string; // Añadido
  components?: DbSkillComponent[];
  // prerequisites ya no es una tabla separada, sino parte de components o un array de strings en SkillAnalysis
}

export interface DbSkillComponent {
  id: string;
  skillAnalysisId: string; // FK a SkillAnalysis.id
  skillAnalysis?: DbSkillAnalysis;
  name: string;
  description: string;
  difficultyLevel: DifficultyLevel;
  prerequisitesText: string[]; // Array de strings
  estimatedLearningHours: number;
  practicalApplications: string[];
  order: number;
  createdAt: string; // Añadido
  updatedAt: string; // Añadido
}

export interface DbPedagogicalAnalysis {
  id: string;
  learningPlanId: string; // FK a LearningPlan.id
  learningPlan?: DbLearningPlan;
  effectivenessScore: number; // Float
  cognitiveLoadAssessment: string; // Podría ser un enum si se define en GQL
  scaffoldingQuality: string;    // Podría ser un enum
  engagementPotential: number; // Float
  recommendations: string[];
  assessmentStrategies: string[];
  improvementAreas: string[];
  generatedBy: string;
  createdAt: string;
  updatedAt: string; // Añadido
  objectives?: DbLearningObjective[];
}

export interface DbLearningObjective {
  id: string;
  pedagogicalAnalysisId: string; // FK a PedagogicalAnalysis.id
  pedagogicalAnalysis?: DbPedagogicalAnalysis;
  objective: string;
  measurable: boolean;
  timeframe: string; // Ej: "End of Week 1", "Within this module"
  order: number;
  createdAt: string; // Añadido
  updatedAt: string; // Añadido
}

export interface DbPlanSection {
  id: string;
  learningPlanId: string; // FK a LearningPlan.id (corregido de planId)
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
  sectionId: string; // FK a PlanSection.id
  section?: DbPlanSection;
  dayNumber: number; // Relativo a la sección o al plan total? Asumimos relativo al plan total si no hay DayInPlan.
  title: string;
  focusArea: string;
  isActionDay: boolean;
  objectives: string[];
  generatedBy?: string | null; // Ej: "ContentGeneratorLLM_v1.0"
  generatedAt?: string | null; // ISO Timestamp
  completionStatus: CompletionStatus; // Default PENDING
  completedAt?: string | null; // ISO Timestamp
  createdAt: string;
  updatedAt: string;

  // Relaciones
  mainContentItem?: DbMainContent | null; // One-to-one
  contentBlocks?: DbContentBlock[]; // One-to-many
  actionTaskItem?: DbActionTask | null; // One-to-one (si isActionDay es true)
  enrollmentProgress?: DbContentProgress[]; // Progreso de varios usuarios en este día
}

export interface DbMainContent {
  id: string;
  dayContentId: string; // FK a DayContent.id
  dayContent?: DbDayContent;
  contentType: MainContentType;
  title: string;
  funFact: string;
  xp: number;
  createdAt: string;
  updatedAt: string; // Añadido
  // Detalles específicos (one-to-one con MainContent)
  audioDetails?: DbAudioContent | null;
  readDetails?: DbReadContent | null;
}

export interface DbAudioContent {
  id: string;
  mainContentId: string; // FK a MainContent.id
  mainContent?: DbMainContent;
  audioUrl: string; // Podría ser un path o URL completa
  transcript: string; // TEXT
  durationSeconds: number;
  voiceType?: string | null; // Ej: "StandardMale", "PremiumFemale"
  createdAt: string; // Añadido
  updatedAt: string; // Añadido
}

export interface DbReadContent {
  id: string;
  mainContentId: string; // FK a MainContent.id
  mainContent?: DbMainContent;
  contentHtml: string; // TEXT o HTML
  estimatedReadTimeMinutes: number;
  createdAt: string; // Añadido
  updatedAt: string; // Añadido
  keyConcepts?: DbKeyConcept[]; // One-to-many
}

export interface DbKeyConcept {
  id: string;
  readContentId: string; // FK a ReadContent.id
  readContent?: DbReadContent;
  term: string;
  definition: string;
  order: number;
  createdAt: string; // Añadido
  updatedAt: string; // Añadido
}

export interface DbContentBlock {
  id: string;
  dayContentId: string; // FK a DayContent.id
  dayContent?: DbDayContent;
  blockType: ContentBlockType;
  title: string; // Ej: "Pregunta 1", "Ejercicio Práctico"
  xp: number;
  order: number;
  estimatedMinutes?: number | null;
  createdAt: string;
  updatedAt: string; // Añadido
  // Detalles específicos (one-to-one con ContentBlock)
  quizDetails?: DbQuizContent | null;
  exerciseDetails?: DbExerciseContent | null;
  // ActionTask se movió a ser una relación directa de DayContent
}

export interface DbQuizContent { // Contiene una colección de preguntas para un bloque de tipo Quiz
  id: string;
  contentBlockId: string; // FK a ContentBlock.id
  contentBlock?: DbContentBlock;
  quizType: string; // Ej: "MCQ", "TrueFalse", "Scenario" (podría ser un enum si es fijo)
  createdAt: string; // Añadido
  updatedAt: string; // Añadido
  questions?: DbQuizQuestion[]; // One-to-many
}

export interface DbQuizQuestion {
  id: string;
  quizContentId: string; // FK a QuizContent.id
  quizContent?: DbQuizContent;
  questionText: string;
  explanation: string;
  order: number;
  trueFalseAnswer?: boolean | null; // Para True/False
  matchPairsJson?: string | null; // Para Match-to-Meaning (JSON string de pares)
  scenarioText?: string | null; // Para Scenario Quiz
  createdAt: string; // Añadido
  updatedAt: string; // Añadido
  options?: DbQuizOption[]; // One-to-many (para MCQ, Scenario)
}

export interface DbQuizOption {
  id: string;
  questionId: string; // FK a QuizQuestion.id
  question?: DbQuizQuestion;
  optionText: string;
  isCorrect: boolean;
  order: number;
  createdAt: string; // Añadido
  updatedAt: string; // Añadido
}

export interface DbActionTask {
  id: string;
  dayContentId: string; // FK a DayContent.id
  dayContent?: DbDayContent;
  title: string;
  challengeDescription: string;
  timeEstimateString: string; // Ej: "30-45 minutes"
  tips: string[];
  realWorldContext: string;
  successCriteria: string[];
  skiMotivation: string;
  difficultyAdaptation?: DifficultyLevel | null;
  xp: number;
  createdAt: string;
  updatedAt: string;
  steps?: DbActionStep[]; // One-to-many
}

export interface DbActionStep {
  id: string;
  actionTaskId: string; // FK a ActionTask.id
  actionTask?: DbActionTask;
  instruction: string;
  order: number;
  createdAt: string; // Añadido
  updatedAt: string; // Añadido
}

export interface DbExerciseContent { // Para ejercicios generales que no son quizzes estructurados
  id: string;
  contentBlockId: string; // FK a ContentBlock.id
  contentBlock?: DbContentBlock;
  exerciseType: string; // Ej: "CodeCompletion", "FreeTextResponse"
  instructions: string;
  exerciseDataJson: string; // JSON string para la configuración/datos del ejercicio
  createdAt: string; // Añadido
  updatedAt: string; // Añadido
}

// ==================== ENROLLMENT & PROGRESS TABLE INTERFACES ====================
export interface DbEnrollment { // Un usuario inscrito en un LearningPlan
  id: string;
  userId: string; // FK a User.id
  user?: DbUser;
  learningPlanId: string; // FK a LearningPlan.id
  learningPlan?: DbLearningPlan;
  status: CompletionStatus; // PENDING, IN_PROGRESS, COMPLETED
  startedAt?: string | null; // ISO Timestamp
  completedAt?: string | null; // ISO Timestamp
  lastActivityAt?: string | null; // ISO Timestamp
  currentDayNumber: number; // El día actual del plan en el que está el usuario
  totalXpEarned: number;
  createdAt: string;
  updatedAt: string;
  progressEntries?: DbContentProgress[];
}

export interface DbContentProgress { // Progreso de un usuario en un ContentBlock específico
  id: string;
  enrollmentId: string; // FK a Enrollment.id
  enrollment?: DbEnrollment;
  dayContentId: string; // FK a DayContent.id (para agrupar progreso por día)
  dayContent?: DbDayContent;
  contentBlockId: string; // FK a ContentBlock.id
  contentBlock?: DbContentBlock;
  completed: boolean;
  xpEarned: number;
  attempts: number;
  timeSpentSeconds: number;
  scorePercent?: number | null; // Para quizzes
  completedAt?: string | null; // ISO Timestamp
  createdAt: string;
  updatedAt: string;
  quizResponses?: DbQuizResponse[]; // Si es un quiz
}

export interface DbQuizResponse { // Respuesta de un usuario a una QuizQuestion específica
  id: string;
  contentProgressId: string; // FK a ContentProgress.id
  contentProgress?: DbContentProgress;
  quizQuestionId: string; // FK a QuizQuestion.id
  quizQuestion?: DbQuizQuestion;
  selectedOptionId?: string | null; // FK a QuizOption.id (para MCQ)
  selectedOption?: DbQuizOption | null;
  responseTextAnswer?: string | null; // Para respuestas de texto libre si se implementan
  isCorrect: boolean;
  answeredAt: string; // ISO Timestamp
  createdAt: string; // Añadido
  updatedAt: string; // Añadido
}

// ==================== ANALYTICS TABLE INTERFACES ====================
export interface DbUserAnalyticsEntry { // Podría ser una tabla que se actualiza diariamente o por evento
  id: string;
  userId: string; // FK a User.id
  user?: DbUser;
  date: string; // ISO Date string (YYYY-MM-DD) o Timestamp si es por evento
  totalXpEarnedThisDay: number;
  sessionsCountThisDay: number;
  timeSpentLearningMinutesThisDay: number;
  contentBlocksCompletedThisDay: number;
  quizAverageScoreThisDay?: number | null;
  currentStreakForDate: number; // Racha del usuario en esa fecha
  // Campos para almacenar las salidas de los LLM de analytics
  llmLearningPatternsJson?: string | null; // JSON de LearningPattern[]
  llmOptimalTimeJson?: string | null;      // JSON de OptimalLearningTime
  llmContentOptimizationJson?: string | null; // JSON de ContentOptimization
  llmStreakMaintenanceJson?: string | null; // JSON de StreakMaintenance
  llmGeneratedOverallEngagementScore?: number | null; // Score estimado por LLM
  llmGeneratedKeyInsights?: string[] | null;          // Insights generados por LLM
  lastActivityAt: string; // Timestamp de la última actividad que contribuyó a esta entrada
  createdAt: string;
  updatedAt: string;
}

// ==================== CHAT SESSION TABLE INTERFACES ====================
export interface DbChatSession {
  id: string;
  userId: string; // FK a User.id
  user?: DbUser;
  createdAt: string;
  updatedAt: string;
  messages?: DbChatMessage[];
}

export interface DbChatMessage {
  id: string;
  chatSessionId: string; // FK a ChatSession.id
  chatSession?: DbChatSession;
  userId: string; // Quién envió el mensaje (puede ser el usuario o el 'assistant')
  user?: DbUser;   // El usuario que envió este mensaje
  role: "user" | "assistant" | "system" | string; // string para flexibilidad
  content: string; // TEXT
  createdAt: string;
  // updatedAt no suele ser necesario para mensajes de chat
}
