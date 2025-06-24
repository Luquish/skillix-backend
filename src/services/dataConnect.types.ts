// src/services/dataConnect.types.ts
// Tipos básicos para el servicio Data Connect

// --- ENUMS ---
export enum AuthProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE'
}

export enum CompletionStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS', 
  COMPLETED = 'COMPLETED'
}

// --- USER TYPES ---
export interface DbUser {
  id?: string;
  firebaseUid: string;
  email: string;
  name?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  photoUrl?: string | null;
  authProvider?: string;
  platform?: string | null;
  emailVerified?: boolean | null;
  appleUserIdentifier?: string | null;
  fcmTokens?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}

// --- USER PREFERENCE TYPES ---
export interface DbUserPreference {
  id: string;
  language: string;
  timezone: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  darkMode: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserPreferenceInsert {
  userFirebaseUid: string;
  user?: DbUser;
  skill: string;
  experienceLevel: string;
  motivation: string;
  availableTimeMinutes: number;
  goal: string;
  learningStyle?: string | null;
  preferredStudyTime?: string | null;
  learningContext?: string | null;
  challengePreference?: string | null;
}

// --- ENROLLMENT TYPES ---
export interface EnrollmentInsert {
  userFirebaseUid: string;
  learningPlanId: string;
  status: string;
}

// --- LEARNING PLAN TYPES ---
export interface DbLearningPlan {
  id: string;
  userFirebaseUid: string;
  skillName: string;
  generatedAt?: string;
  totalDurationWeeks?: number;
  dailyTimeMinutes?: number;
  skillLevelTarget?: string;
  milestones?: string[];
  progressMetrics?: string[];
  flexibilityOptions?: string[];
  sections?: DbPlanSection[];
  skillAnalysis?: DbSkillAnalysis;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbPlanSection {
  id: string;
  title: string;
  order: number;
  days?: DbDayContent[];
}

export interface DbDayContent {
  id: string;
  dayNumber: number;
  title: string;
  focusArea: string;
  isActionDay: boolean;
  objectives: string[];
  completionStatus?: string;
}

export interface DbSkillAnalysis {
  id?: string;
  skillCategory: string;
  marketDemand: string;
  isSkillValid: boolean;
  learningPathRecommendation: string;
  realWorldApplications: string[];
  complementarySkills: string[];
  components?: DbSkillComponent[];
}

export interface DbSkillComponent {
  name: string;
  description: string;
  difficultyLevel: string;
  prerequisitesText: string[];
  estimatedLearningHours: number;
  practicalApplications: string[];
  order: number;
}

// --- STREAK TYPES ---
export interface DbStreakData {
  userFirebaseUid: string;
  currentStreak: number;
  longestStreak: number;
  lastContributionDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// --- XP BREAKDOWN TYPES ---
export interface UserXPBreakdown {
  mainContent: number;
  actionTasks: number;
  exercises: number;
  total: number;
}

// --- ANALYTICS TYPES ---
export interface UserAnalytics {
  id: string;
  userFirebaseUid: string;
  optimalLearningTimeStart?: string | null;
  optimalLearningTimeEnd?: string | null;
  optimalLearningTimeReasoning?: string | null;
  contentDifficultyRecommendation?: string | null;
  idealSessionLengthMinutes?: number | null;
  streakRiskLevel?: string | null;
  streakInterventionStrategies?: string[] | null;
  overallEngagementScore?: number | null;
  keyInsights?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}

// --- TOVI MESSAGE TYPES ---
export interface ToviMessage {
  id: string;
  userFirebaseUid: string;
  situation: string;
  message: string;
  toviEmojiStyle?: string | null;
  animationSuggestion?: string | null;
  isDelivered: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// --- PROGRESS TYPES ---
export interface UserProgress {
  enrollments: any[];
  streakData?: DbStreakData | null;
}

// --- ENROLLMENT TYPES ---
export interface Enrollment {
  id: string;
  userFirebaseUid: string;
  learningPlanId: string;
  status: string;
  enrollmentDate?: string;
  learningPlan?: {
    id: string;
    skillName: string;
    totalDurationWeeks?: number;
  };
  createdAt?: string;
  updatedAt?: string;
} 