// src/services/dataConnect.mutations.ts
// Mutations de Data Connect usando Firebase Admin SDK

import { getDataConnect } from './firebase.service';
import logger from '../utils/logger';
import * as Types from './dataConnect.types';
import * as AdminQueries from './dataConnect.queries';

// --- MUTATION FUNCTIONS ---

/**
 * CreateUser - Crea un nuevo usuario
 */
export const createUser = async (
  userData: Omit<Types.DbUser, 'id' | 'createdAt'>
): Promise<{ user_insert: Types.User_KeyOutput } | null> => {
  const dataConnect = getDataConnect();
  logger.info(`[Mutation] Creating new user for UID: ${userData.firebaseUid}`);

  const mutation = `
    mutation CreateUser(
      $firebaseUid: String!, $email: String!, $name: String, $authProvider: String,
      $platform: String, $photoUrl: String, $emailVerified: Boolean, $appleUserIdentifier: String
    ) {
      user_insert(data: {
        firebaseUid: $firebaseUid,
        email: $email,
        name: $name,
        authProvider: $authProvider,
        platform: $platform,
        photoUrl: $photoUrl,
        emailVerified: $emailVerified,
        appleUserIdentifier: $appleUserIdentifier
      })
    }
  `;

  const response = await dataConnect.executeGraphql(mutation, { variables: userData });
  return (response as any).data;
};

/**
 * CreateUserPreference - Crea preferencias de usuario
 */
export const createUserPreference = async (input: {
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
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating user preference: ${input.userFirebaseUid}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreateUserPreference(
        $userFirebaseUid: String!, $skill: String!, $experienceLevel: String!,
        $motivation: String!, $availableTimeMinutes: Int!, $goal: String!,
        $learningStyle: String, $preferredStudyTime: String,
        $learningContext: String, $challengePreference: String
      ) {
        userPreference_insert(data: {
          userFirebaseUid: $userFirebaseUid, skill: $skill, experienceLevel: $experienceLevel,
          motivation: $motivation, availableTimeMinutes: $availableTimeMinutes, goal: $goal,
          learningStyle: $learningStyle, preferredStudyTime: $preferredStudyTime,
          learningContext: $learningContext, challengePreference: $challengePreference
        })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.userPreference_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating user preference: ${errorMessage}`);
    throw error;
  }
};

/**
 * Crea la entidad base de un plan de aprendizaje.
 */
export const createLearningPlanBase = async (input: {
  userFirebaseUid: string;
  skillName: string;
  generatedBy: string;
  generatedAt: string;
  totalDurationWeeks: number;
  dailyTimeMinutes: number;
  skillLevelTarget: string;
  milestones: string[];
  progressMetrics: string[];
  flexibilityOptions?: string[] | null;
}): Promise<any> => {
  const dataConnect = getDataConnect();
  logger.info(`[Mutation] Creating learning plan base for user ${input.userFirebaseUid}`);

  const mutation = `
    mutation CreateLearningPlanBase(
      $userFirebaseUid: String!, $skillName: String!, 
      $generatedBy: String, $totalDurationWeeks: Int, $dailyTimeMinutes: Int, 
      $skillLevelTarget: String, $milestones: [String!], 
      $progressMetrics: [String!], $flexibilityOptions: [String!]
    ) {
      learningPlan_insert(data: {
        userFirebaseUid: $userFirebaseUid,
        skillName: $skillName,
        generatedBy: $generatedBy,
        totalDurationWeeks: $totalDurationWeeks,
        dailyTimeMinutes: $dailyTimeMinutes,
        skillLevelTarget: $skillLevelTarget,
        milestones: $milestones,
        progressMetrics: $progressMetrics,
        flexibilityOptions: $flexibilityOptions
      }) {
        id
      }
    }
  `;

  const response = await dataConnect.executeGraphql(mutation, { variables: input });
  return (response as any).data.learningPlan_insert;
};

/**
 * CreatePlanSection - Crea una sección del plan
 */
export const createPlanSection = async (input: {
  learningPlanId: string;
  title: string;
  description?: string | null;
  order: number;
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating plan section: ${input.title}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreatePlanSection(
        $learningPlanId: UUID!, $title: String!, $description: String, $order: Int!
      ) {
        planSection_insert(data: {
          learningPlanId: $learningPlanId, title: $title, description: $description, order: $order
        })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.planSection_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating plan section: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreateDayContent - Crea contenido de día
 */
export const createDayContent = async (input: {
  sectionId: string;
  dayNumber: number;
  title: string;
  focusArea: string;
  isActionDay: boolean;
  objectives: string[];
  completionStatus?: string | null;
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating day content: Day ${input.dayNumber} - ${input.title}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreateDayContent(
        $sectionId: UUID!, $dayNumber: Int!, $title: String!, $focusArea: String!,
        $isActionDay: Boolean!, $objectives: [String!]!, $completionStatus: String
      ) {
        dayContent_insert(data: {
          sectionId: $sectionId, dayNumber: $dayNumber, title: $title, focusArea: $focusArea,
          isActionDay: $isActionDay, objectives: $objectives, 
          completionStatus: $completionStatus
        })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.dayContent_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating day content: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreateEnrollmentBackend - Crea una inscripción (versión backend)
 */
export const createEnrollmentBackend = async (input: {
  userFirebaseUid: string;
  learningPlanId: string;
  status: string;
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating enrollment: ${input.learningPlanId}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreateEnrollmentBackend($userFirebaseUid: String!, $learningPlanId: UUID!, $status: String!) {
        enrollment_insert(data: {
            userFirebaseUid: $userFirebaseUid,
            learningPlanId: $learningPlanId,
            status: $status
        })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.enrollment_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating enrollment: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreateMainContentItem - Crea contenido principal
 */
export const createMainContentItem = async (input: {
  dayContentId: string;
  title: string;
  textContent: string;
  funFact: string;
  xp: number;
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating main content item: ${input.title}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreateMainContentItem(
        $dayContentId: UUID!, $title: String!, $textContent: String!, $funFact: String!, $xp: Int!
      ) {
        mainContentItem_insert(data: {
          dayContentId: $dayContentId, title: $title, textContent: $textContent, funFact: $funFact, xp: $xp
        })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.mainContentItem_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating main content item: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreateActionTaskItem - Crea una tarea de acción
 */
export const createActionTaskItem = async (input: {
  dayContentId: string;
  title: string;
  challengeDescription: string;
  timeEstimateString: string;
  tips: string[];
  realWorldContext: string;
  successCriteria: string[];
  toviMotivation: string;
  difficultyAdaptation?: string | null;
  xp: number;
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating action task item: ${input.title}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreateActionTaskItem(
        $dayContentId: UUID!, $title: String!, $challengeDescription: String!, $timeEstimateString: String!,
        $tips: [String!]!, $realWorldContext: String!, $successCriteria: [String!]!, $toviMotivation: String!,
        $difficultyAdaptation: String, $xp: Int!
      ) {
        actionTaskItem_insert(data: {
          dayContentId: $dayContentId, title: $title, challengeDescription: $challengeDescription,
          timeEstimateString: $timeEstimateString, tips: $tips, realWorldContext: $realWorldContext,
          successCriteria: $successCriteria, toviMotivation: $toviMotivation,
          difficultyAdaptation: $difficultyAdaptation, xp: $xp
        })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.actionTaskItem_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating action task item: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreateActionStepItem - Crea un paso de una tarea de acción
 */
export const createActionStepItem = async (input: {
  actionTaskItemId: string;
  stepNumber: number;
  description: string;
  estimatedTimeSeconds: number;
}): Promise<any> => {
  const dataConnect = getDataConnect();
  logger.info(`[Mutation] Creating action step for task: ${input.actionTaskItemId}`);

  const mutation = `
    mutation CreateActionStepItem(
      $actionTaskItemId: UUID!, $stepNumber: Int!, $description: String!, $estimatedTimeSeconds: Int!
    ) {
      actionStepItem_insert(data: {
        actionTaskItemId: $actionTaskItemId,
        stepNumber: $stepNumber,
        description: $description,
        estimatedTimeSeconds: $estimatedTimeSeconds
      }) {
        id
      }
    }
  `;

  const response = await dataConnect.executeGraphql(mutation, { variables: input });
  return (response as any).data.actionStepItem_insert;
};

/**
 * CreateSkillAnalysis - Crea una entrada de SkillAnalysis vinculada a un plan de aprendizaje.
 */
export const createSkillAnalysis = async (input: any): Promise<any> => {
  const dataConnect = getDataConnect();
  logger.info(`[Mutation] Creating skill analysis for plan ${input.learningPlanId}`);

  const mutation = `
    mutation CreateSkillAnalysis(
      $learningPlanId: UUID!, $skillCategory: String, $marketDemand: String, 
      $isSkillValid: Boolean, $viabilityReason: String, $learningPathRecommendation: String, 
      $realWorldApplications: [String!], $complementarySkills: [String!], $generatedBy: String
    ) {
      skillAnalysis_insert(data: {
        learningPlanId: $learningPlanId,
        skillCategory: $skillCategory,
        marketDemand: $marketDemand,
        isSkillValid: $isSkillValid,
        viabilityReason: $viabilityReason,
        learningPathRecommendation: $learningPathRecommendation,
        realWorldApplications: $realWorldApplications,
        complementarySkills: $complementarySkills,
        generatedBy: $generatedBy
      }) {
        id
      }
    }
  `;

  const response = await dataConnect.executeGraphql(mutation, { variables: input });
  return (response as any).data.skillAnalysis_insert;
};

/**
 * CreateSkillComponentData - Crea componente de habilidad
 */
export const createSkillComponentData = async (input: {
  skillAnalysisId: string;
  name: string;
  description: string;
  difficultyLevel: string;
  prerequisitesText: string[];
  estimatedLearningHours: number;
  practicalApplications: string[];
  order: number;
}): Promise<any> => {
  const dataConnect = getDataConnect();
  logger.info(`[Mutation] Creating skill component: ${input.name}`);
  
  const mutation = `
    mutation CreateSkillComponentData(
      $skillAnalysisId: UUID!, $name: String!, $description: String!, $difficultyLevel: String!,
      $prerequisitesText: [String!]!, $estimatedLearningHours: Int!, $practicalApplications: [String!]!, $order: Int!
    ) {
      skillComponentData_insert(data: {
        skillAnalysisId: $skillAnalysisId, name: $name, description: $description, difficultyLevel: $difficultyLevel,
        prerequisitesText: $prerequisitesText, estimatedLearningHours: $estimatedLearningHours,
        practicalApplications: $practicalApplications, order: $order
      }) {
        id
      }
    }`;
  
  const response = await dataConnect.executeGraphql(mutation, { variables: input });
  return (response as any).data.skillComponentData_insert;
};

/**
 * UpdateDayCompletionStatus - Actualiza el estado de completación de un día
 */
export const updateDayCompletionStatus = async (dayContentId: string, status: string): Promise<boolean> => {
  try {
    logger.info(`[Admin SDK] Updating day completion status: ${dayContentId} - ${status}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation UpdateDayCompletionStatus($dayContentId: UUID!, $status: String!) {
        dayContent_update(
          key: { id: $dayContentId },
          data: { completionStatus: $status }
        )
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: { dayContentId, status } });
    return !!(response as any).data.dayContent_update;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error updating day completion status: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreateKeyConcept - Crea un concepto clave
 */
export const createKeyConcept = async (input: {
  mainContentItemId: string;
  concept: string;
  explanation: string;
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating key concept: ${input.concept}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreateKeyConcept(
        $mainContentItemId: UUID!, $concept: String!, $explanation: String!
      ) {
        keyConcept_insert(data: {
          mainContentItemId: $mainContentItemId, concept: $concept, explanation: $explanation
        })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.keyConcept_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating key concept: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreateContentBlockItem - Crea un bloque de contenido
 */
export const createContentBlockItem = async (input: {
  dayContentId: string;
  blockType: string;
  title: string;
  xp: number;
  order: number;
  estimatedMinutes?: number | null;
  quizDetailsId?: string | null;
  exerciseDetailsId?: string | null;
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating content block item: ${input.title}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreateContentBlockItem(
        $dayContentId: UUID!, $blockType: String!, $title: String!, $xp: Int!, $order: Int!,
        $estimatedMinutes: Int, $quizDetailsId: UUID, $exerciseDetailsId: UUID
      ) {
        contentBlockItem_insert(data: {
          dayContentId: $dayContentId, 
          blockType: $blockType, 
          title: $title, xp: $xp, order: $order,
          estimatedMinutes: $estimatedMinutes, quizDetailsId: $quizDetailsId, exerciseDetailsId: $exerciseDetailsId
        })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.contentBlockItem_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating content block item: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreateQuizDetails - Crea detalles de quiz
 */
export const createQuizDetails = async (input: {
  description: string;
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating quiz details: ${input.description}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreateQuizDetails($description: String!) {
        quizContentDetails_insert(data: { description: $description })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.quizContentDetails_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating quiz details: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreateQuizQuestion - Crea una pregunta de quiz
 */
export const createQuizQuestion = async (input: {
  quizDetailsId: string;
  question: string;
  questionType: string;
  explanation?: string | null;
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating quiz question: ${input.question}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreateQuizQuestion(
        $quizDetailsId: UUID!, $question: String!, $questionType: String!, $explanation: String
      ) {
        quizQuestionData_insert(data: {
          quizDetailsId: $quizDetailsId, question: $question,
          questionType: $questionType, 
          explanation: $explanation
        })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.quizQuestionData_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating quiz question: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreateQuizOption - Crea una opción de quiz
 */
export const createQuizOption = async (input: {
  questionId: string;
  optionText: string;
  isCorrect: boolean;
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating quiz option: ${input.optionText}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreateQuizOption($questionId: UUID!, $optionText: String!, $isCorrect: Boolean!) {
        quizOptionData_insert(data: {
          questionId: $questionId, optionText: $optionText, isCorrect: $isCorrect
        })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.quizOptionData_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating quiz option: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreateExerciseDetails - Crea detalles de ejercicio
 */
export const createExerciseDetails = async (input: {
  instructions: string;
  exerciseType: string;
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating exercise details: ${input.exerciseType}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreateExerciseDetails($instructions: String!, $exerciseType: String!) {
        exerciseDetailsData_insert(data: {
          instructions: $instructions, exerciseType: $exerciseType
        })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.exerciseDetailsData_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating exercise details: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreateMatchPair - Crea un par de coincidencia
 */
export const createMatchPair = async (input: {
  exerciseId: string;
  prompt: string;
  correctAnswer: string;
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating match pair: ${input.prompt}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreateMatchPair($exerciseId: UUID!, $prompt: String!, $correctAnswer: String!) {
        matchPair_insert(data: {
          exerciseId: $exerciseId, prompt: $prompt, correctAnswer: $correctAnswer
        })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.matchPair_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating match pair: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreatePedagogicalAnalysis - Crea análisis pedagógico
 */
export const createPedagogicalAnalysis = async (input: {
  learningPlanId: string;
  effectivenessScore: number;
  cognitiveLoadAssessment: string;
  scaffoldingQuality: string;
  engagementPotential: number;
  recommendations: string[];
  assessmentStrategies: string[];
  improvementAreas: string[];
  generatedBy: string;
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating pedagogical analysis for plan: ${input.learningPlanId}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreatePedagogicalAnalysis(
        $learningPlanId: UUID!, $effectivenessScore: Float!, $cognitiveLoadAssessment: String!,
        $scaffoldingQuality: String!, $engagementPotential: Float!, $recommendations: [String!]!,
        $assessmentStrategies: [String!]!, $improvementAreas: [String!]!, $generatedBy: String!
      ) {
        pedagogicalAnalysis_insert(data: {
          learningPlanId: $learningPlanId,
          effectivenessScore: $effectivenessScore,
          cognitiveLoadAssessment: $cognitiveLoadAssessment,
          scaffoldingQuality: $scaffoldingQuality,
          engagementPotential: $engagementPotential,
          recommendations: $recommendations,
          assessmentStrategies: $assessmentStrategies,
          improvementAreas: $improvementAreas,
          generatedBy: $generatedBy
        })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.pedagogicalAnalysis_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating pedagogical analysis: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreateLearningObjectiveData - Crea datos de objetivo de aprendizaje
 */
export const createLearningObjectiveData = async (input: {
  pedagogicalAnalysisId: string;
  objective: string;
  measurable: boolean;
  timeframe: string;
  order: number;
}): Promise<any> => {
  try {
    logger.info(`[Admin SDK] Creating learning objective: ${input.objective}`);
    
    const dc = getDataConnect();
    const mutation = `
      mutation CreateLearningObjectiveData(
        $pedagogicalAnalysisId: UUID!, $objective: String!, $measurable: Boolean!,
        $timeframe: String!, $order: Int!
      ) {
        learningObjectiveData_insert(data: {
          pedagogicalAnalysisId: $pedagogicalAnalysisId,
          objective: $objective,
          measurable: $measurable,
          timeframe: $timeframe,
          order: $order
        })
      }`;
    
    const response = await dc.executeGraphql(mutation, { variables: input });
    return (response as any).data.learningObjectiveData_insert;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[Admin SDK] Error creating learning objective: ${errorMessage}`);
    throw error;
  }
};

/**
 * CreateEnrollment - Crea una inscripción (versión USER con auth)
 */
export const createEnrollment = async (input: {
  userFirebaseUid: string;
  learningPlanId: string;
  status: string;
}): Promise<any> => {
  const dataConnect = getDataConnect();
  logger.info(`[Mutation] Creating enrollment for user ${input.userFirebaseUid} in plan ${input.learningPlanId}`);

  const mutation = `
    mutation CreateEnrollment(
      $userFirebaseUid: String!, $learningPlanId: UUID!, $status: String!
    ) {
      enrollment_insert(data: {
        userFirebaseUid: $userFirebaseUid,
        learningPlanId: $learningPlanId,
        status: $status
      })
    }
  `;

  const response = await dataConnect.executeGraphql(mutation, { variables: input });
  return (response as any).data.enrollment_insert;
};

/**
 * Actualiza el perfil de un usuario en la base de datos.
 * Después de actualizar, vuelve a buscar al usuario para devolver el objeto completo.
 */
export const updateUser = async (
  firebaseUid: string,
  data: Partial<Pick<Types.DbUser, 'name' | 'language' | 'learningObjective'>>
): Promise<Types.DbUser | null> => {
  const dataConnect = getDataConnect();
  logger.info(`[Mutation] Starting user profile update for UID: ${firebaseUid}`);

  const mutation = `
    mutation UpdateUser(
      $firebaseUid: String!, $name: String, $language: String, $learningObjective: String
    ) {
      user_update(
        key: { firebaseUid: $firebaseUid },
        data: { name: $name, language: $language, learningObjective: $learningObjective }
      )
    }
  `;
  
  await dataConnect.executeGraphql(mutation, { variables: { firebaseUid, ...data } });
  logger.info(`[Mutation] Update operation completed for UID: ${firebaseUid}. Fetching updated profile.`);
  
  const updatedUser = await AdminQueries.getUserByFirebaseUid(firebaseUid);
  return updatedUser;
};

/**
 * Elimina un usuario de la base de datos por su Firebase UID.
 */
export const deleteUser = async (firebaseUid: string): Promise<boolean> => {
  const dataConnect = getDataConnect();
  logger.info(`[Mutation] Deleting user from DB for UID: ${firebaseUid}`);
  
  const mutation = 'mutation DeleteUser($firebaseUid: String!) { user_delete(key: { firebaseUid: $firebaseUid }) }';
  
  await dataConnect.executeGraphql(mutation, { variables: { firebaseUid } });
  
  logger.info(`[Mutation] User deleted from DB successfully for UID: ${firebaseUid}`);
  return true;
};