// src/services/dataConnect.service.ts

import { GraphqlOptions, DataConnect, ExecuteGraphqlResponse } from 'firebase-admin/data-connect';
import { getDb } from '../config/firebaseAdmin';

// Importar tipos de datos de la DB
import * as DbTypes from './dataConnect.types';

// Importar tipos de LLM y Zod para los datos de entrada
import {
    DayContent as LlmDayContent,
    KeyConcept as LlmKeyConcept,
    ActionTask as LlmActionTask,
    MainContent as LlmMainContentType,
    QuizMCQBlock as LlmQuizMCQBlock,
    TrueFalseBlock as LlmTrueFalseBlock,
    MatchToMeaningBlock as LlmMatchToMeaningBlock,
    ScenarioQuizBlock as LlmScenarioQuizBlock,
    ExerciseBlock as LlmExerciseBlock,
    SkillAnalysis as LlmSkillAnalysis,
    PedagogicalAnalysis as LlmPedagogicalAnalysis,
    LearningPlan as LlmLearningPlan,
} from './llm/schemas';
import { User } from 'firebase/auth';

const logger = console; // O tu logger configurado

// Se extiende la interfaz para incluir la propiedad opcional de errores
interface FirebaseDataConnectResponse<TData = any> extends ExecuteGraphqlResponse<TData> {
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
    extensions?: Record<string, any>;
  }>;
}

// Referencia a la instancia de DataConnect del Admin SDK
const dcService: DataConnect | null = getDb();

/**
 * Ejecuta una query o mutation GraphQL usando el conector de Data Connect del Admin SDK.
 */
async function executeGraphQL<TData = any, TVariables = Record<string, any>>(
  operationString: string,
  variables?: TVariables,
  isReadOnly: boolean = false
): Promise<FirebaseDataConnectResponse<TData>> {
  if (!dcService) {
    const errorMessage = "DataConnectServiceNotInitialized: El SDK de Data Connect no está disponible o no se inicializó correctamente.";
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  const options: GraphqlOptions<TVariables> = { variables };
  
  try {
    const response: FirebaseDataConnectResponse<TData> = isReadOnly
      ? await dcService.executeGraphqlRead<TData, TVariables>(operationString, options)
      : await dcService.executeGraphql<TData, TVariables>(operationString, options);

    if (response.errors && response.errors.length > 0) {
      logger.error("Errores en la ejecución de GraphQL:", JSON.stringify(response.errors, null, 2));
    }
    return response;
  } catch (error: any) {
    logger.error(`Error fundamental ejecutando GraphQL: ${error.message}`, error);
    throw error;
  }
}

// --- QUERIES ---
const GET_USER_BY_FIREBASE_UID_QUERY = `
  query GetUserByFirebaseUid($firebaseUid: String!) {
    user(key: { firebaseUid: $firebaseUid }) {
      firebaseUid email name authProvider platform photoUrl emailVerified
    }
  }
`;

// --- MUTATIONS (Granulares) ---
const CREATE_USER_MUTATION = `
  mutation CreateUser(
    $firebaseUid: String!, $email: String!, $name: String, $authProvider: DbTypes.AuthProvider!,
    $platform: DbTypes.Platform, $photoUrl: String, $emailVerified: Boolean, $appleUserIdentifier: String
  ) {
    user_insert(data: {
      firebaseUid: $firebaseUid, email: $email, name: $name, authProvider: $authProvider,
      platform: $platform, photoUrl: $photoUrl, emailVerified: $emailVerified,
      appleUserIdentifier: $appleUserIdentifier
    }) {
      firebaseUid
    }
  }
`;

// Helper for creating entities by executing a specific mutation
async function executeMutation<T extends { id: string }>(
    mutation: string,
    variables: any
): Promise<T | null> {
    const entityName = mutation.replace('Create', '').replace('Base', '');
    const response = await executeGraphQL<{ [key: string]: T }>(mutation, variables);

    // Dynamic key based on mutation name, e.g., 'learningPlan_insert'
    const responseKey = `${entityName.charAt(0).toLowerCase() + entityName.slice(1)}_insert`;
    const inserted = response.data?.[responseKey];

    if (inserted?.id) {
        logger.info(`DataConnect: ${entityName} creado con ID: ${inserted.id}`);
        return inserted;
    }
    logger.error(`DataConnect: Fallo al crear ${entityName}. Errors: ${JSON.stringify(response.errors)}`);
    return null;
}

// --- SERVICE FUNCTIONS ---

export const getUserByFirebaseUid = async (firebaseUid: string): Promise<DbTypes.DbUser | null> => {
    const response = await executeGraphQL<{ user: DbTypes.DbUser }>(GET_USER_BY_FIREBASE_UID_QUERY, { firebaseUid }, true);
    return response.data?.user ?? null;
};

export const createUser = async (input: DbTypes.DbUser): Promise<DbTypes.DbUser | null> => {
    const response = await executeGraphQL<{ user_insert: DbTypes.DbUser }>(CREATE_USER_MUTATION, input);
    if (response.data?.user_insert) {
        logger.info(`User profile created for UID: ${response.data.user_insert.firebaseUid}`);
        return response.data.user_insert;
    }
    return null;
};

const CREATE_LEARNING_PLAN_BASE_MUTATION = `
    mutation CreateLearningPlanBase(
      $userFirebaseUid: String!, $skillName: String!, $generatedBy: String!, $generatedAt: Timestamp!,
      $totalDurationWeeks: Int!, $dailyTimeMinutes: Int!, $skillLevelTarget: DbTypes.UserExperienceLevel!,
      $milestones: [String!]!, $progressMetrics: [String!]!, $flexibilityOptions: [String!]
    ) {
      learningPlan_insert(data: {
        userFirebaseUid: $userFirebaseUid, skillName: $skillName, generatedBy: $generatedBy, generatedAt: $generatedAt,
        totalDurationWeeks: $totalDurationWeeks, dailyTimeMinutes: $dailyTimeMinutes, skillLevelTarget: $skillLevelTarget,
        milestones: $milestones, progressMetrics: $progressMetrics, flexibilityOptions: $flexibilityOptions
      }) {
        id
      }
    }
`;

export async function createFullLearningPlanInDB(
    userFirebaseUid: string,
    llmPlan: LlmLearningPlan,
    llmSkillAnalysis: LlmSkillAnalysis,
    llmPedagogicalAnalysis: LlmPedagogicalAnalysis
): Promise<DbTypes.DbLearningPlan | null> {
    logger.info(`DataConnect: Creando plan de aprendizaje completo para user: ${userFirebaseUid}`);

    // 1. Create LearningPlan base
    const planBase = {
        userFirebaseUid: userFirebaseUid,
        skillName: llmPlan.skillName,
        generatedBy: llmPlan.generatedBy,
        generatedAt: new Date().toISOString(),
        totalDurationWeeks: llmPlan.totalDurationWeeks,
        dailyTimeMinutes: llmPlan.dailyTimeMinutes,
        skillLevelTarget: llmPlan.skillLevelTarget,
        milestones: llmPlan.milestones,
        progressMetrics: llmPlan.progressMetrics,
        flexibilityOptions: llmPlan.flexibilityOptions,
    };
    const newPlan = await executeMutation<{id: string}>(CREATE_LEARNING_PLAN_BASE_MUTATION, planBase);
    if (!newPlan) return null;
    const learningPlanId = newPlan.id;

    // TODO: Implementar la creación del resto de entidades (SkillAnalysis, Sections, etc.)
    // usando un patrón similar: definir la string de la mutación y llamar a executeMutation
    // con las variables correspondientes. Por ahora, nos centramos en que el plan base se cree.

    logger.info(`Plan de aprendizaje base ${learningPlanId} creado exitosamente.`);
    return { id: learningPlanId, ...planBase } as DbTypes.DbLearningPlan;
}

export async function saveDailyContentDetailsInDB(dayContentId: string, llmContent: LlmDayContent): Promise<boolean> {
    logger.info(`DataConnect: Guardando detalles para DayContent.id: ${dayContentId}`);

    // Esta función necesita ser completamente reescrita con el nuevo patrón de mutaciones granulares.
    // Por ahora, se deja como un placeholder para permitir que el SDK se genere.
    // La implementación real requerirá definir cada string de mutación y llamar a executeMutation en secuencia.
    
    logger.warn("saveDailyContentDetailsInDB no está completamente implementado con las nuevas mutaciones.");

    return true;
}

function mapLlmExerciseToContentBlock(llmBlock: LlmExerciseBlock, order: number): any | null {
    const baseInput = { order: order + 1, xp: llmBlock.xp, title: '' };

    switch(llmBlock.type) {
        case 'quiz_mcq': {
            const mcq = llmBlock as LlmQuizMCQBlock;
            baseInput.title = mcq.question;
            return {
                ...baseInput,
                blockType: 'QUIZ_MCQ',
                quizDetails: {
                    description: "Selección Múltiple",
                    questions: [{
                        question: mcq.question,
                        questionType: 'MULTIPLE_CHOICE',
                        explanation: mcq.explanation,
                        options: mcq.options.map(opt => ({ optionText: opt, isCorrect: mcq.options.indexOf(opt) === mcq.answer }))
                    }]
                }
            };
        }
        case 'quiz_truefalse': {
            const tf = llmBlock as LlmTrueFalseBlock;
             baseInput.title = tf.statement;
            return {
                ...baseInput,
                blockType: 'QUIZ_TRUE_FALSE',
                quizDetails: {
                    description: "Verdadero o Falso",
                    questions: [{
                        question: tf.statement, questionType: 'TRUE_FALSE', explanation: tf.explanation,
                        options: [
                            { optionText: "Verdadero", isCorrect: tf.answer === true },
                            { optionText: "Falso", isCorrect: tf.answer === false }
                        ]
                    }]
                }
            };
        }
        case 'match_meaning': {
             const mm = llmBlock as LlmMatchToMeaningBlock;
             baseInput.title = 'Une los conceptos';
             return {
                 ...baseInput,
                 blockType: 'QUIZ_MATCH_MEANING',
                 exerciseDetails: {
                     instructions: 'Une cada término con su significado correcto.',
                     exerciseType: 'MATCHING',
                     matchPairs: mm.pairs.map(p => ({ prompt: p.term, correctAnswer: p.meaning }))
                 }
             };
        }
        case 'scenario_quiz': {
            const sc = llmBlock as LlmScenarioQuizBlock;
            baseInput.title = "Quiz de Escenario";
            return {
                ...baseInput,
                blockType: 'QUIZ_SCENARIO',
                quizDetails: {
                    description: sc.scenario,
                    questions: [{
                        question: sc.question, questionType: 'MULTIPLE_CHOICE', explanation: sc.explanation,
                        options: sc.options.map(opt => ({ optionText: opt, isCorrect: sc.options.indexOf(opt) === sc.answer }))
                    }]
                }
            };
        }
        default:
            logger.warn(`Tipo de bloque desconocido: ${(llmBlock as any).type}`);
            return null;
    }
}

