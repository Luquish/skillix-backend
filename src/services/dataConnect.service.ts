// src/services/dataConnect.service.ts

import { GraphqlOptions, DataConnect } from 'firebase-admin/data-connect'; // Asegúrate que DataConnect esté disponible o usa el tipo correcto para `dataConnect`
import { dataConnect } from '../config/firebaseAdmin'; // Asumiendo que exportas la instancia inicializada como 'dataConnect'

// Importar tipos de datos de la DB
import * as DbTypes from './dataConnect.types';

// Importar tipos de LLM para los datos de entrada
import {
    SkillAnalysis as LlmSkillAnalysis,
    LearningPlan as LlmLearningPlan,
    PedagogicalAnalysis as LlmPedagogicalAnalysis,
    DayContent as LlmDayContent,
    KeyConcept as LlmKeyConcept,
    ExerciseBlock as LlmExerciseBlock,
    ActionTask as LlmActionTask,
    MainContent as LlmMainContent,
    MainAudioContent as LlmMainAudioContent, // Importar tipo específico
    MainReadContent as LlmMainReadContent,   // Importar tipo específico
    QuizMCQBlock as LlmQuizMCQBlock, // Para el ejemplo de mapeo
    // Añade otros tipos de LLM que puedas necesitar
} from './llm/schemas'; // Asumiendo que schemas.ts exporta estos tipos

const logger = console; // O tu logger configurado

// Definición local para la estructura de respuesta de GraphQL del Admin SDK
interface FirebaseDataConnectResponse<TData = any> {
  data?: TData;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
    extensions?: Record<string, any>;
  }>;
}

// Referencia a la instancia de DataConnect del Admin SDK
// Asegúrate de que `dataConnect` sea del tipo correcto que tiene `executeGraphql` y `executeGraphqlRead`
const dcService: DataConnect | null = dataConnect;

/**
 * Ejecuta una query o mutation GraphQL usando el conector de Data Connect del Admin SDK.
 */
async function executeGraphQL<TData = any, TVariables = Record<string, any>>(
  operationString: string,
  variables?: TVariables,
  isReadOnly: boolean = false,
  impersonationOptions?: GraphqlOptions<TVariables>['impersonate']
): Promise<FirebaseDataConnectResponse<TData>> {
  if (!dcService) {
    const errorMessage = "DataConnectServiceNotInitialized: El SDK de Data Connect no está disponible o no se inicializó correctamente.";
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  const options: GraphqlOptions<TVariables> = { variables };
  if (impersonationOptions) {
    options.impersonate = impersonationOptions;
  }

  const opSummary = operationString.length > 150
    ? `${operationString.substring(0, 147).replace(/\s+/g, ' ')}...`
    : operationString.replace(/\s+/g, ' ');

  logger.debug(
    `Ejecutando GraphQL (${isReadOnly ? 'Read-Only' : 'Read-Write'}): ${opSummary}`,
    // variables ? JSON.stringify(variables) : '' // Descomentar para logs detallados, cuidado con datos sensibles
  );

  try {
    let response: FirebaseDataConnectResponse<TData>;
    if (isReadOnly) {
      response = await dcService.executeGraphqlRead<TData, TVariables>(operationString, options);
    } else {
      response = await dcService.executeGraphql<TData, TVariables>(operationString, options);
    }

    if (response.errors && response.errors.length > 0) {
      logger.error("Errores en la ejecución de GraphQL:", JSON.stringify(response.errors, null, 2));
    }
    return response;
  } catch (error: any) {
    logger.error(`Error fundamental ejecutando GraphQL: ${error.message}`, error);
    throw error;
  }
}

// --- QUERIES (Ejemplos, ajústalos a tu queries.gql) ---

const GET_USER_BY_FIREBASE_UID_QUERY = `
  query GetUserByFirebaseUid($firebaseUid: String!) {
    userCollection(filter: { firebaseUid: { eq: $firebaseUid } }, first: 1) {
      edges {
        node {
          id
          firebaseUid
          email
          name
          isActive
          authProvider
          platform
          photoUrl
          emailVerified
          lastSignInAt
          createdAt
          updatedAt
          llmKeyInsights
          llmOverallEngagementScore
          fcmTokens
        }
      }
    }
  }
`;

const GET_USER_DEVICE_TOKENS_QUERY = `
  query GetUserDeviceTokens($userId: ID!) {
    user(id: $userId) { # Asumiendo que tienes un query 'user(id: ID!)' en tu schema.gql
      fcmTokens
    }
  }
`;

const GET_LEARNING_PLAN_STRUCTURE_QUERY = `
  query GetLearningPlanStructure($planId: ID!) {
    learningPlan(id: $planId) { # Asumiendo query 'learningPlan(id: ID!)'
      id
      userId
      skillName
      totalDurationWeeks
      dailyTimeMinutes
      skillLevelTarget
      milestones
      progressMetrics
      flexibilityOptions
      sections(orderBy: { order: ASC }) {
        id
        title
        description
        order
        days(orderBy: { dayNumber: ASC }) {
          id
          dayNumber
          title
          focusArea
          isActionDay
          objectives
          completionStatus
        }
      }
    }
  }
`;

const GET_CHAT_SESSION_QUERY = `
  query GetChatSession($sessionId: ID!) {
    chatSession(id: $sessionId) { # Asumiendo query 'chatSession(id: ID!)'
      id
      userId
      createdAt
      updatedAt
    }
  }
`;

const GET_CHAT_MESSAGES_QUERY = `
  query GetChatMessages($chatSessionId: ID!, $limit: Int) {
    chatMessageCollection(
      filter: { chatSessionId: { eq: $chatSessionId } },
      orderBy: { createdAt: DESC },
      first: $limit
    ) {
      edges {
        node {
          id
          chatSessionId
          role
          content
          createdAt
        }
      }
    }
  }
`;


// --- MUTATIONS (Alineadas con tu mutations.gql) ---

const CREATE_USER_MUTATION = `
  mutation CreateUser($input: CreateUserInput!) {
    user_insert(data: $input) {
      id
      firebaseUid
      email
      name
    }
  }
`;
// El tipo GQL Input se define en mutations.gql, aquí definimos el tipo para la función del servicio
export type CreateUserInputForService = {
  firebaseUid: string;
  email: string;
  name?: string | null;
  authProvider: DbTypes.AuthProvider;
  platform?: DbTypes.Platform | null;
  photoUrl?: string | null;
  emailVerified?: boolean | null;
};

const CREATE_USER_PREFERENCE_MUTATION = `
  mutation CreateUserPreference($input: CreateUserPreferenceInput!) {
    userPreference_insert(data: $input) {
      id
      userId
      skill
    }
  }
`;
export type CreateUserPreferenceInputForService = {
  userId: string; // ID interno del User
  skill: string;
  experienceLevel: DbTypes.UserExperienceLevel;
  motivation: string;
  availableTimeMinutes: number;
  learningStyle: DbTypes.LearningStyle;
  goal: string;
};


const CREATE_FULL_LEARNING_PLAN_MUTATION = `
  mutation CreateFullLearningPlan($input: CreateFullLearningPlanInput!) {
    learningPlan_insert(data: $input) {
      id
      skillName
      user { id }
      skillAnalysis { id }
      pedagogicalAnalysis { id }
      sections { id, days { id, dayNumber } }
    }
  }
`;
// Este tipo es complejo y debe coincidir con CreateFullLearningPlanInput de mutations.gql
export type CreateFullLearningPlanInputForService = {
    userId: string;
    skillName: string;
    generatedBy: string;
    generatedAt: string; // ISO Timestamp
    totalDurationWeeks: number;
    dailyTimeMinutes: number;
    skillLevelTarget: DbTypes.UserExperienceLevel;
    milestones: string[];
    progressMetrics: string[];
    flexibilityOptions?: string[] | null;
    skillAnalysis: { // Coincide con CreateSkillAnalysisForPlanInput
      skillName: string;
      skillCategory: DbTypes.SkillCategory;
      marketDemand: DbTypes.MarketDemand;
      isSkillValid: boolean;
      viabilityReason?: string | null;
      learningPathRecommendation: string;
      realWorldApplications: string[];
      complementarySkills: string[];
      generatedBy: string;
      components?: Array<{ // Coincide con CreateSkillComponentInput
        name: string;
        description: string;
        difficultyLevel: DbTypes.DifficultyLevel;
        prerequisitesText: string[];
        estimatedLearningHours: number;
        practicalApplications: string[];
        order: number;
      }> | null;
    };
    pedagogicalAnalysis: { // Coincide con CreatePedagogicalAnalysisForPlanInput
      effectivenessScore: number;
      cognitiveLoadAssessment: string;
      scaffoldingQuality: string;
      engagementPotential: number;
      recommendations: string[];
      assessmentStrategies: string[];
      improvementAreas: string[];
      generatedBy: string;
      objectives: Array<{ // Coincide con CreateLearningObjectiveInput
        objective: string;
        measurable: boolean;
        timeframe: string;
        order: number;
      }>;
    };
    sections?: Array<{ // Coincide con CreatePlanSectionInput
        title: string;
        description?: string | null;
        order: number;
        days: Array<{ // Coincide con CreatePlanDayInput
            dayNumber: number;
            title: string;
            focusArea: string;
            isActionDay: boolean;
            objectives: string[];
            generatedBy?: string | null;
            generatedAt?: string | null; // ISO Timestamp
            completionStatus?: DbTypes.CompletionStatus | null; // Default PENDING
        }>;
    }> | null;
    dailyActivityTemplates?: Array<{ // Coincide con LearningPlanDailyActivityInput
        type: string;
        durationMinutes: number;
        description: string;
        order?: number | null;
    }> | null;
    suggestedResources?: Array<{ // Coincide con LearningPlanResourceInput
        name: string;
        urlOrDescription: string;
        resourceType?: string | null;
        order?: number | null;
    }> | null;
};


// Mutaciones granulares para SaveDayContentDetails
const INSERT_MAIN_CONTENT_MUTATION = `
  mutation InsertMainContent($input: CreateMainContentForItemInput!) { # Nombre del input debe coincidir con mutations.gql
    mainContent_insert(data: $input) {
      id
      dayContentId
      contentType
    }
  }
`;
export type InsertMainContentInputForService = { // Basado en CreateMainContentForItemInput de mutations.gql
    dayContentId: string;
    contentType: DbTypes.MainContentType;
    title: string;
    funFact: string;
    xp: number;
    audioDetails?: { // Basado en CreateAudioContentForMainInput
        audioUrl: string;
        transcript: string;
        durationSeconds: number;
        voiceType?: string | null;
    } | null;
    readDetails?: { // Basado en CreateReadContentForMainInput
        contentHtml: string;
        estimatedReadTimeMinutes: number;
        keyConcepts: Array<{ // Basado en CreateKeyConceptForReadInput
            term: string;
            definition: string;
            order: number;
        }>;
    } | null;
};

const INSERT_CONTENT_BLOCK_MUTATION = `
  mutation InsertContentBlock($input: CreateContentBlockForDayInput!) { # Nombre del input debe coincidir con mutations.gql
    contentBlock_insert(data: $input) {
      id
      dayContentId
      blockType
    }
  }
`;
export type InsertContentBlockInputForService = { // Basado en CreateContentBlockForDayInput
    dayContentId: string;
    blockType: DbTypes.ContentBlockType;
    title: string;
    xp: number;
    order: number;
    estimatedMinutes?: number | null;
    quizDetails?: { // Basado en CreateQuizContentForBlockInput
        quizType: string; // Ej: "MCQ", "TrueFalse"
        questions: Array<{ // Basado en CreateQuizQuestionForQuizContentInput
            questionText: string;
            explanation: string;
            order: number;
            trueFalseAnswer?: boolean | null;
            matchPairsJson?: string | null;
            scenarioText?: string | null;
            options?: Array<{ // Basado en CreateQuizOptionForQuestionInput
                optionText: string;
                isCorrect: boolean;
                order: number;
            }> | null;
        }>;
    } | null;
    exerciseDetails?: { // Basado en CreateExerciseContentForBlockInput
        exerciseType: string;
        instructions: string;
        exerciseDataJson: string; // JSON String
    } | null;
};


const INSERT_ACTION_TASK_MUTATION = `
  mutation InsertActionTask($input: CreateActionTaskForDayInput!) { # Nombre del input debe coincidir con mutations.gql
    actionTask_insert(data: $input) {
      id
      dayContentId
      title
    }
  }
`;
export type InsertActionTaskInputForService = { // Basado en CreateActionTaskForDayInput
    dayContentId: string;
    title: string;
    challengeDescription: string;
    timeEstimateString: string;
    tips: string[];
    realWorldContext: string;
    successCriteria: string[];
    skiMotivation: string;
    difficultyAdaptation?: DbTypes.DifficultyLevel | null;
    xp: number;
    steps: Array<{ // Basado en CreateActionStepForTaskInput
        instruction: string;
        order: number;
    }>;
};

const CREATE_ENROLLMENT_MUTATION = `
  mutation CreateEnrollment($input: CreateEnrollmentInput!) {
    enrollment_insert(data: $input) {
      id
      userId
      learningPlanId
    }
  }
`;
export type CreateEnrollmentInputForService = {
  userId: string;
  learningPlanId: string;
  status: DbTypes.CompletionStatus;
  currentDayNumber: number;
  totalXpEarned: number;
};

const CREATE_CHAT_SESSION_MUTATION = `
  mutation CreateChatSession($input: CreateChatSessionInput!) {
    chatSession_insert(data: $input) {
      id
      userId
      createdAt
    }
  }
`;
export type CreateChatSessionInputForService = {
  userId: string; // ID interno del User
};

const ADD_CHAT_MESSAGE_MUTATION = `
  mutation AddChatMessage($input: AddChatMessageInput!) {
    chatMessage_insert(data: $input) {
      id
      chatSessionId
      role
      content
    }
  }
`;
export type AddChatMessageInputForService = {
  chatSessionId: string;
  userId: string; // User que envía el mensaje
  role: "user" | "assistant" | "system" | string;
  content: string;
};

const UPDATE_USER_PROFILE_MUTATION = `
  mutation UpdateUserProfile($firebaseUid: String!, $input: UpdateUserProfileInput!) {
    user_update(
      where: { firebaseUid: { eq: $firebaseUid } }
      data: $input
    ) {
      firebaseUid
      name 
      email
      photoUrl
    }
  }
`;
export type UpdateUserProfileInputForService = {
  name?: string | null;
  photoUrl?: string | null;
  llmKeyInsights?: string[] | null;
  llmOverallEngagementScore?: number | null;
  fcmTokens?: string[] | null;
};

const MARK_NOTIFICATION_AS_READ_MUTATION = `
  mutation MarkNotificationAsRead($input: MarkNotificationAsReadInput!) {
    notification_update(
      where: { id: { eq: $input.notificationId } } 
      data: { isRead: true, updatedAt_expr: "now()" }
    ) {
      id
      isRead
    }
  }
`;
export type MarkNotificationAsReadInputForService = {
  notificationId: string;
};

const UPDATE_STREAK_DATA_MUTATION = `
  mutation UpdateStreakData($input: UpdateStreakDataInput!) {
    streakData_update(
      where: { userId: { eq: $input.userId } }
      data: {
        currentStreak_inc: $input.currentStreak_inc
        currentStreak: $input.currentStreak_set
        longestStreak: $input.longestStreak_set
        lastContributionDate: $input.lastContributionDate_set
      }
    ) {
      id
      userId
      currentStreak
      longestStreak
      lastContributionDate
    }
  }
`;
export type UpdateStreakDataInputForService = {
    userId: string;
    currentStreak_inc?: number | null;
    currentStreak_set?: number | null;
    longestStreak_set?: number | null;
    lastContributionDate_set?: string | null; // Formato "YYYY-MM-DD"
};


// --- Funciones del Servicio DataConnect ---

export async function getUserByFirebaseUid(firebaseUid: string): Promise<DbTypes.DbUser | null> {
  try {
    const response = await executeGraphQL<{ userCollection: { edges: { node: DbTypes.DbUser }[] } }>(
      GET_USER_BY_FIREBASE_UID_QUERY, { firebaseUid }, true
    );
    const userNode = response.data?.userCollection?.edges?.[0]?.node;
    if (userNode) {
      logger.info(`DataConnect: Usuario encontrado por firebaseUid ${firebaseUid}: ${userNode.id}`);
      return userNode;
    }
    if (response.errors) {
        logger.error(`DataConnect: Errores GraphQL en getUserByFirebaseUid: ${JSON.stringify(response.errors)}`);
    }
    logger.info(`DataConnect: Usuario no encontrado por firebaseUid ${firebaseUid}`);
    return null;
  } catch (error) {
    logger.error(`DataConnect: Error en getUserByFirebaseUid para ${firebaseUid}:`, error);
    throw error;
  }
}

export async function createUser(userData: CreateUserInputForService): Promise<DbTypes.DbUser | null> {
  const inputForMutation = {
      firebaseUid: userData.firebaseUid,
      email: userData.email,
      name: userData.name,
      authProvider: userData.authProvider,
      platform: userData.platform,
      photoUrl: userData.photoUrl,
      emailVerified: userData.emailVerified,
  };
  try {
    const response = await executeGraphQL<{ user_insert: DbTypes.DbUser }>(
      CREATE_USER_MUTATION, { input: inputForMutation }
    );
    const createdUser = response.data?.user_insert;
    if (createdUser) {
      logger.info(`DataConnect: Usuario creado con ID: ${createdUser.id}, FirebaseUID: ${createdUser.firebaseUid}`);
      return createdUser;
    }
    logger.error(`DataConnect: Fallo al crear usuario. FirebaseUID: ${userData.firebaseUid}. Errors: ${JSON.stringify(response.errors)}`);
    return null;
  } catch (error) {
    logger.error(`DataConnect: Error en createUser para ${userData.firebaseUid}:`, error);
    throw error;
  }
}

export async function createUserPreference(preferenceData: CreateUserPreferenceInputForService): Promise<DbTypes.DbUserPreference | null> {
  try {
    const response = await executeGraphQL<{ userPreference_insert: DbTypes.DbUserPreference }>(
        CREATE_USER_PREFERENCE_MUTATION, { input: preferenceData }
    );
    const createdPref = response.data?.userPreference_insert;
    if (createdPref) {
      logger.info(`DataConnect: Preferencia de usuario creada con ID: ${createdPref.id} para UserID: ${createdPref.userId}`);
      return createdPref;
    }
    logger.error(`DataConnect: Fallo al crear preferencia de usuario para UserID: ${preferenceData.userId}. Errors: ${JSON.stringify(response.errors)}`);
    return null;
  } catch (error) {
    logger.error(`DataConnect: Error en createUserPreference para UserID ${preferenceData.userId}:`, error);
    throw error;
  }
}


export async function createFullLearningPlanInDB(
  planInput: CreateFullLearningPlanInputForService
): Promise<{ id: string; skillName: string; } | null> {
  logger.info(`DataConnect: Solicitando creación de plan completo para userId: ${planInput.userId}, skill: ${planInput.skillName}`);
  try {
    logger.debug("DataConnect: Payload para CreateFullLearningPlan:", JSON.stringify(planInput, null, 2).substring(0, 1000));
    const response = await executeGraphQL<{ learningPlan_insert: { id: string; skillName: string; } }>(
        CREATE_FULL_LEARNING_PLAN_MUTATION, { input: planInput }
    );
    const learningPlan = response.data?.learningPlan_insert;
    if (learningPlan && learningPlan.id) {
      logger.info(`DataConnect: Plan de aprendizaje completo creado con ID: ${learningPlan.id}`);
      return learningPlan;
    }
    logger.error(`DataConnect: Fallo al crear plan de aprendizaje completo. Errors: ${JSON.stringify(response.errors)}`);
    return null;
  } catch (error) {
    logger.error(`DataConnect: Error en createFullLearningPlanInDB para UserID ${planInput.userId}:`, error);
    throw error;
  }
}

/**
 * Guarda los detalles de un contenido diario (MainContent, ContentBlocks, ActionTask).
 * Asume que el DayContent base (con sectionId, dayNumber, etc.) ya existe.
 * Esta función orquesta múltiples inserciones granulares.
 */
export async function saveDailyContentDetailsInDB(
  dayContentId: string,
  llmContentData: LlmDayContent // Datos del LLM
): Promise<boolean> {
  logger.info(`DataConnect: Guardando detalles para DayContent.id: ${dayContentId}`);
  let allSuccess = true;

  try {
    // 1. Guardar MainContent si existe
    if (llmContentData.main_content) {
      const mainContentLlm = llmContentData.main_content; // Variable para type narrowing
      let audioDetailsInput: InsertMainContentInputForService['audioDetails'] = null;
      let readDetailsInput: InsertMainContentInputForService['readDetails'] = null;

      if (mainContentLlm.type === 'audio') {
        // Ahora TypeScript sabe que mainContentLlm es LlmMainAudioContent
        const audioContent = mainContentLlm as LlmMainAudioContent;
        audioDetailsInput = {
          audioUrl: audioContent.audioUrl,
          transcript: audioContent.transcript,
          durationSeconds: audioContent.duration,
          voiceType: "StandardVoice",
        };
      } else if (mainContentLlm.type === 'read') {
        // Ahora TypeScript sabe que mainContentLlm es LlmMainReadContent
        const readContent = mainContentLlm as LlmMainReadContent;
        readDetailsInput = {
          contentHtml: readContent.content,
          estimatedReadTimeMinutes: readContent.estimated_time,
          keyConcepts: readContent.key_concepts.map((kc: LlmKeyConcept, i) => ({
            term: kc.term,
            definition: kc.definition,
            order: i + 1
          }))
        };
      }

      const mainContentInput: InsertMainContentInputForService = {
        dayContentId: dayContentId,
        contentType: mainContentLlm.type.toUpperCase() as DbTypes.MainContentType,
        title: mainContentLlm.title,
        funFact: mainContentLlm.fun_fact,
        xp: mainContentLlm.xp,
        audioDetails: audioDetailsInput,
        readDetails: readDetailsInput,
      };
      const mcResponse = await executeGraphQL<{ mainContent_insert: { id: string } }>(
        INSERT_MAIN_CONTENT_MUTATION, { input: mainContentInput }
      );
      if (!mcResponse.data?.mainContent_insert?.id) {
        logger.error(`DataConnect: Fallo al guardar MainContent para DayContent.id ${dayContentId}. Errors: ${JSON.stringify(mcResponse.errors)}`);
        allSuccess = false;
      } else {
        logger.info(`DataConnect: MainContent guardado ID: ${mcResponse.data.mainContent_insert.id}`);
      }
    }

    // 2. Guardar ContentBlocks (ejercicios) si existen
    if (llmContentData.exercises && llmContentData.exercises.length > 0 && allSuccess) {
      // Usar forEach para evitar problemas con downlevelIteration
      llmContentData.exercises.forEach(async (exBlock, index) => {
        if (!allSuccess) return; // Si una operación anterior falló, no continuar

        // Asegurar que exBlock es del tipo LlmExerciseBlock
        const currentExBlock = exBlock as LlmExerciseBlock;

        // Mapeo robusto de LlmExerciseBlock.type a DbTypes.ContentBlockType
        let dbBlockType: DbTypes.ContentBlockType;
        switch (currentExBlock.type.toUpperCase()) {
            case "QUIZ_MCQ": dbBlockType = "QUIZ_MCQ"; break;
            case "QUIZ_TRUEFALSE": dbBlockType = "QUIZ_TRUE_FALSE"; break;
            case "MATCH_MEANING": dbBlockType = "QUIZ_MATCH_MEANING"; break;
            case "SCENARIO_QUIZ": dbBlockType = "QUIZ_SCENARIO"; break;
            // Añadir más casos según sea necesario
            default:
                logger.warn(`Tipo de bloque de ejercicio desconocido: ${currentExBlock.type}. Usando OTHER.`);
                dbBlockType = "OTHER";
        }
        
        const blockInput: InsertContentBlockInputForService = {
          dayContentId: dayContentId,
          blockType: dbBlockType,
          title: (currentExBlock as any).question || (currentExBlock as any).statement || `Ejercicio ${index + 1}`,
          xp: currentExBlock.xp,
          order: index + 1,
          quizDetails: null, // Inicializar
          exerciseDetails: null, // Inicializar
        };

        if (currentExBlock.type === 'quiz_mcq') {
            const mcqBlock = currentExBlock as LlmQuizMCQBlock; // Cast específico
            blockInput.quizDetails = {
                quizType: "MCQ", // O tomar de una propiedad si existe
                questions: [{
                    questionText: mcqBlock.question,
                    explanation: mcqBlock.explanation,
                    order: 1, // Asumiendo una pregunta por bloque de quiz por ahora
                    options: mcqBlock.options.map((opt, optIdx) => ({
                        optionText: opt,
                        isCorrect: optIdx === mcqBlock.answer,
                        order: optIdx + 1,
                    })),
                }]
            };
        }
        // TODO: Añadir mapeo para otros tipos de LlmExerciseBlock (TrueFalse, MatchToMeaning, ScenarioQuiz)
        // y para exerciseDetails si es un ejercicio general.

        const cbResponse = await executeGraphQL<{ contentBlock_insert: { id: string } }>(
          INSERT_CONTENT_BLOCK_MUTATION, { input: blockInput }
        );
        if (!cbResponse.data?.contentBlock_insert?.id) {
          logger.error(`DataConnect: Fallo al guardar ContentBlock (índice ${index}) para DayContent.id ${dayContentId}. Errors: ${JSON.stringify(cbResponse.errors)}`);
          allSuccess = false;
          // No se puede usar 'break' en forEach, pero allSuccess controlará el flujo
        } else {
            logger.info(`DataConnect: ContentBlock (índice ${index}) guardado ID: ${cbResponse.data.contentBlock_insert.id}`);
        }
      });
    }

    // Esperar a que todas las promesas de forEach (si las hubiera asíncronas) se completen
    // En este caso, el await dentro del forEach lo maneja secuencialmente si allSuccess no es falso.

    // 3. Guardar ActionTask si existe y es un día de acción
    if (llmContentData.is_action_day && llmContentData.action_task && allSuccess) {
      const actionTaskLlm = llmContentData.action_task as LlmActionTask;
      const actionTaskInput: InsertActionTaskInputForService = {
        dayContentId: dayContentId,
        title: actionTaskLlm.title,
        challengeDescription: actionTaskLlm.challenge_description,
        timeEstimateString: actionTaskLlm.time_estimate,
        tips: actionTaskLlm.tips,
        realWorldContext: actionTaskLlm.real_world_context,
        successCriteria: actionTaskLlm.success_criteria,
        skiMotivation: actionTaskLlm.ski_motivation,
        difficultyAdaptation: actionTaskLlm.difficulty_adaptation?.toUpperCase() as DbTypes.DifficultyLevel || null,
        xp: actionTaskLlm.xp,
        steps: actionTaskLlm.steps.map((s, i) => ({ instruction: s, order: i + 1 })),
      };
      const atResponse = await executeGraphQL<{ actionTask_insert: { id: string } }>(
        INSERT_ACTION_TASK_MUTATION, { input: actionTaskInput }
      );
      if (!atResponse.data?.actionTask_insert?.id) {
        logger.error(`DataConnect: Fallo al guardar ActionTask para DayContent.id ${dayContentId}. Errors: ${JSON.stringify(atResponse.errors)}`);
        allSuccess = false;
      } else {
         logger.info(`DataConnect: ActionTask guardado ID: ${atResponse.data.actionTask_insert.id}`);
      }
    }

    if (allSuccess) {
      logger.info(`DataConnect: Todos los detalles guardados exitosamente para DayContent.id: ${dayContentId}`);
    }
    return allSuccess;

  } catch (error) {
    logger.error(`DataConnect: Error en saveDailyContentDetailsInDB para DayContent.id ${dayContentId}:`, error);
    return false;
  }
}


export async function getUserDeviceTokens(userIdInternalDb: string): Promise<string[]> {
    try {
        const response = await executeGraphQL<{ user?: { fcmTokens?: string[] | null } }>(
            GET_USER_DEVICE_TOKENS_QUERY, { userId: userIdInternalDb }, true
        );
        if (response.data?.user?.fcmTokens) {
            return response.data.user.fcmTokens.filter(token => token !== null) as string[];
        }
        return [];
    } catch (error) {
        logger.error(`DataConnect: Error en getUserDeviceTokens para ${userIdInternalDb}:`, error);
        return [];
    }
}

export async function getLearningPlanStructureFromDB(
    learningPlanId: string
): Promise<DbTypes.DbLearningPlan | null> { 
    try {
        const response = await executeGraphQL<{ learningPlan: DbTypes.DbLearningPlan }>( 
            GET_LEARNING_PLAN_STRUCTURE_QUERY, { planId: learningPlanId }, true
        );
        const plan = response.data?.learningPlan;
        if (plan) {
            logger.info(`DataConnect: Estructura de plan obtenida para PlanID: ${plan.id}`);
            return plan;
        }
        if (response.errors) {
            logger.error(`DataConnect: Errores GraphQL en getLearningPlanStructureFromDB: ${JSON.stringify(response.errors)}`);
        }
        logger.info(`DataConnect: No se encontró estructura de plan para PlanID: ${learningPlanId}`);
        return null;
    } catch (error) {
        logger.error(`DataConnect: Error en getLearningPlanStructureFromDB para PlanID ${learningPlanId}:`, error);
        throw error;
    }
}

export async function createEnrollment(enrollmentData: CreateEnrollmentInputForService): Promise<{id: string} | null> {
    try {
        const response = await executeGraphQL<{ enrollment_insert: { id: string } }>(
            CREATE_ENROLLMENT_MUTATION, { input: enrollmentData }
        );
        const createdEnrollment = response.data?.enrollment_insert;
        if (createdEnrollment) {
            logger.info(`DataConnect: Enrollment creado con ID: ${createdEnrollment.id}`);
            return createdEnrollment;
        }
        logger.error(`DataConnect: Fallo al crear enrollment. Input: ${JSON.stringify(enrollmentData)}. Errors: ${JSON.stringify(response.errors)}`);
        return null;
    } catch (error) {
        logger.error(`DataConnect: Error en createEnrollment:`, error);
        throw error;
    }
}

export async function getOrCreateChatSession(userIdInternalDb: string, chatSessionIdFromClient?: string): Promise<DbTypes.DbChatSession | null> {
    if (chatSessionIdFromClient) {
        try {
            const response = await executeGraphQL<{chatSession: DbTypes.DbChatSession}>(
                GET_CHAT_SESSION_QUERY, { sessionId: chatSessionIdFromClient }, true
            );
            const session = response.data?.chatSession;
            if (session && session.userId === userIdInternalDb) {
                logger.info(`DataConnect: ChatSession recuperada: ${session.id}`);
                return session;
            }
            if(session && session.userId !== userIdInternalDb) {
                 logger.warn(`DataConnect: Intento de acceso a ChatSession ${chatSessionIdFromClient} por usuario incorrecto ${userIdInternalDb}. Sesión pertenece a ${session.userId}`);
            }
        } catch (e) { logger.warn(`DataConnect: No se pudo obtener chat session ${chatSessionIdFromClient} o no pertenece al usuario.`, e); }
    }
    try {
        const input: CreateChatSessionInputForService = { userId: userIdInternalDb };
        const response = await executeGraphQL<{chatSession_insert: DbTypes.DbChatSession}>(
            CREATE_CHAT_SESSION_MUTATION, { input }
        );
        const newSession = response.data?.chatSession_insert;
        if (newSession) {
            logger.info(`DataConnect: ChatSession creada: ${newSession.id} para UserID: ${userIdInternalDb}`);
            return newSession;
        }
        logger.error(`DataConnect: Fallo al crear ChatSession para UserID: ${userIdInternalDb}. Errors: ${JSON.stringify(response.errors)}`);
        return null;
    } catch (e) {
        logger.error("DataConnect: Error creando ChatSession", e);
        return null;
    }
}

export async function getChatMessages(chatSessionId: string, limit = 20): Promise<DbTypes.DbChatMessage[]> {
    try {
        const response = await executeGraphQL<{chatMessageCollection: {edges: {node: DbTypes.DbChatMessage}[]}}>(
            GET_CHAT_MESSAGES_QUERY, { chatSessionId, limit }, true
        );
        const messages = response.data?.chatMessageCollection?.edges.map(e => e.node).reverse() || [];
        logger.info(`DataConnect: Obtenidos ${messages.length} mensajes para ChatSession ${chatSessionId}`);
        return messages;
    } catch (e) {
        logger.error(`DataConnect: Error obteniendo mensajes para ChatSession ${chatSessionId}`, e);
        return [];
    }
}

export async function addChatMessage(messageData: AddChatMessageInputForService): Promise<DbTypes.DbChatMessage | null> {
    try {
        const response = await executeGraphQL<{chatMessage_insert: DbTypes.DbChatMessage}>(
            ADD_CHAT_MESSAGE_MUTATION, { input: messageData }
        );
        const newMessage = response.data?.chatMessage_insert;
        if (newMessage) {
            logger.info(`DataConnect: Mensaje de chat añadido ID: ${newMessage.id} a sesión ${newMessage.chatSessionId}`);
            return newMessage;
        }
        logger.error(`DataConnect: Fallo al añadir mensaje de chat a sesión ${messageData.chatSessionId}. Errors: ${JSON.stringify(response.errors)}`);
        return null;
    } catch (e) {
        logger.error(`DataConnect: Error añadiendo mensaje de chat a sesión ${messageData.chatSessionId}`, e);
        return null;
    }
}

export async function updateUserProfile(firebaseUid: string, profileData: UpdateUserProfileInputForService): Promise<DbTypes.DbUser | null> {
    try {
        const response = await executeGraphQL<{user_update: DbTypes.DbUser}>(
            UPDATE_USER_PROFILE_MUTATION, { firebaseUid, input: profileData }
        );
        const updatedUser = response.data?.user_update;
        if (updatedUser) {
            logger.info(`DataConnect: Perfil de usuario actualizado para FirebaseUID: ${firebaseUid}`);
            return updatedUser;
        }
        logger.error(`DataConnect: Fallo al actualizar perfil para FirebaseUID: ${firebaseUid}. Errors: ${JSON.stringify(response.errors)}`);
        return null;
    } catch (error) {
        logger.error(`DataConnect: Error en updateUserProfile para FirebaseUID ${firebaseUid}:`, error);
        throw error;
    }
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    const input: MarkNotificationAsReadInputForService = { notificationId };
    try {
        const response = await executeGraphQL<{notification_update: { id: string; isRead: boolean; } }>(
            MARK_NOTIFICATION_AS_READ_MUTATION, { input }
        );
        if (response.data?.notification_update?.isRead) {
            logger.info(`DataConnect: Notificación ${notificationId} marcada como leída.`);
            return true;
        }
        logger.error(`DataConnect: Fallo al marcar notificación ${notificationId} como leída. Errors: ${JSON.stringify(response.errors)}`);
        return false;
    } catch (error) {
        logger.error(`DataConnect: Error en markNotificationAsRead para ${notificationId}:`, error);
        return false;
    }
}

export async function updateStreakData(streakInput: UpdateStreakDataInputForService): Promise<DbTypes.DbStreakData | null> {
    try {
        const response = await executeGraphQL<{streakData_update: DbTypes.DbStreakData}>(
            UPDATE_STREAK_DATA_MUTATION, { input: streakInput }
        );
        const updatedStreak = response.data?.streakData_update;
        if (updatedStreak) {
            logger.info(`DataConnect: Datos de racha actualizados para UserID: ${streakInput.userId}`);
            return updatedStreak;
        }
        logger.error(`DataConnect: Fallo al actualizar datos de racha para UserID: ${streakInput.userId}. Errors: ${JSON.stringify(response.errors)}`);
        return null;
    } catch (error) {
        logger.error(`DataConnect: Error en updateStreakData para UserID ${streakInput.userId}:`, error);
        throw error;
    }
}

