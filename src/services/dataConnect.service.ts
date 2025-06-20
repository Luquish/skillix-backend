// src/services/dataConnect.service.ts

import { GraphqlOptions, DataConnect, ExecuteGraphqlResponse } from 'firebase-admin/data-connect';
import { getDb } from './firebase.service';

// Importar tipos de datos de la DB
import * as DbTypes from './dataConnect.types';

// Importar operaciones GraphQL
import {
    GET_USER_BY_FIREBASE_UID_QUERY,
    CREATE_USER_MUTATION,
    DELETE_USER_MUTATION,
    CREATE_LEARNING_PLAN_BASE_MUTATION,
    CREATE_SKILL_ANALYSIS_MUTATION,
    CREATE_SKILL_COMPONENT_DATA_MUTATION,
    CREATE_PLAN_SECTION_MUTATION,
    CREATE_DAY_CONTENT_MUTATION,
    CREATE_PEDAGOGICAL_ANALYSIS_MUTATION,
    CREATE_LEARNING_OBJECTIVE_MUTATION,
    CREATE_USER_PREFERENCE_MUTATION,
    CREATE_ENROLLMENT_MUTATION,
    UPDATE_DAY_COMPLETION_STATUS_MUTATION,
    GET_LEARNING_PLAN_STRUCTURE_QUERY,
    GET_USER_FCM_TOKENS_QUERY,
    CREATE_MAIN_CONTENT_ITEM_MUTATION,
    CREATE_KEY_CONCEPT_MUTATION,
    CREATE_ACTION_TASK_ITEM_MUTATION,
    CREATE_CONTENT_BLOCK_ITEM_MUTATION,
    CREATE_QUIZ_DETAILS_MUTATION,
    CREATE_EXERCISE_DETAILS_MUTATION,
    CREATE_MATCH_PAIR_MUTATION
} from './dataConnect.operations';

// Importar tipos de LLM y Zod para los datos de entrada
import {
    DayContent as LlmDayContent,
    SkillAnalysis as LlmSkillAnalysis,
    PedagogicalAnalysis as LlmPedagogicalAnalysis,
    LearningPlan as LlmLearningPlan,
    MatchToMeaningBlock as LlmMatchToMeaningBlock,
} from './llm/schemas';

import logger from '../utils/logger';

// Se extiende la interfaz para incluir la propiedad opcional de errores
interface FirebaseDataConnectResponse<TData = unknown> extends ExecuteGraphqlResponse<TData> {
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
    extensions?: Record<string, unknown>;
  }>;
}

// Referencia a la instancia de DataConnect del Admin SDK
const dcService: DataConnect | null = getDb();

/**
 * Ejecuta una query o mutation GraphQL usando el conector de Data Connect del Admin SDK.
 * El SDK de Admin de Firebase requiere el string completo de la query/mutation.
 */
async function executeGraphQL<TData = unknown, TVariables = Record<string, unknown>>(
  operationString: string,
  variables?: TVariables,
  isReadOnly = false
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
      const opNameMatch = operationString.match(/(query|mutation)\s+(\w+)/);
      const opName = opNameMatch ? opNameMatch[2] : 'Unknown';
      logger.error(`Errores en GraphQL para op '${opName}':`, JSON.stringify(response.errors, null, 2));
    }
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error fundamental ejecutando GraphQL:', errorMessage);
    throw error;
  }
}

// --- SERVICE FUNCTIONS ---

export const getUserByFirebaseUid = async (firebaseUid: string): Promise<DbTypes.DbUser | null> => {
    const response = await executeGraphQL<{ user: DbTypes.DbUser }>(GET_USER_BY_FIREBASE_UID_QUERY, { firebaseUid }, true);
    return response.data?.user ?? null;
};

export const createUser = async (input: DbTypes.DbUser): Promise<{ firebaseUid: string } | null> => {
    const variables = {
        firebaseUid: input.firebaseUid,
        email: input.email,
        name: input.name,
        authProvider: input.authProvider,
        platform: input.platform,
        photoUrl: input.photoUrl,
        emailVerified: input.emailVerified,
        appleUserIdentifier: input.appleUserIdentifier,
    };
    const response = await executeGraphQL<{ user_insert: { firebaseUid: string } }>(CREATE_USER_MUTATION, variables);
    if (response.data?.user_insert) {
        logger.info(`User profile created for UID: ${input.firebaseUid}`);
        return { firebaseUid: input.firebaseUid };
    }
    return null;
};

export const deleteUserByFirebaseUid = async (firebaseUid: string): Promise<boolean> => {
    const response = await executeGraphQL<{ user_delete: { firebaseUid: string } }>(DELETE_USER_MUTATION, { firebaseUid });
    const deleted = !!response.data?.user_delete;
    if (deleted) {
        logger.info(`DataConnect: Usuario con firebaseUid ${firebaseUid} eliminado.`);
    } else {
        logger.error(`DataConnect: Fallo al eliminar el usuario con firebaseUid ${firebaseUid}.`, response.errors);
    }
    return deleted;
};

/**
 * Crea las preferencias de usuario.
 */
export const createUserPreference = async (input: DbTypes.UserPreferenceInsert) => {
    const variables = {
        userFirebaseUid: input.userFirebaseUid,
        skill: input.skill,
        experienceLevel: input.experienceLevel,
        motivation: input.motivation,
        availableTimeMinutes: input.availableTimeMinutes,
        goal: input.goal,
        learningStyle: input.learningStyle || null,
        preferredStudyTime: input.preferredStudyTime || null,
        learningContext: input.learningContext || null,
        challengePreference: input.challengePreference || null
    };
    const response = await executeGraphQL(CREATE_USER_PREFERENCE_MUTATION, variables);
    return response.data;
};

/**
 * Crea una nueva inscripción (enrollment) para un usuario en un plan.
 */
export const createEnrollment = async (input: DbTypes.EnrollmentInsert) => {
    const response = await executeGraphQL(CREATE_ENROLLMENT_MUTATION, input);
    return response.data;
};

/**
 * Obtiene la estructura completa de un plan de aprendizaje por su ID.
 */
export const getLearningPlanStructureById = async (learningPlanId: string): Promise<DbTypes.DbLearningPlan | null> => {
    const response = await executeGraphQL<{ learningPlans: DbTypes.DbLearningPlan[] }>(GET_LEARNING_PLAN_STRUCTURE_QUERY, { learningPlanId }, true);
    // Data Connect devuelve un array, tomamos el primer elemento.
    return response.data?.learningPlans?.[0] ?? null;
};

/**
 * Obtiene el plan de aprendizaje activo más reciente del usuario.
 */
export const getCurrentUserLearningPlan = async (userFirebaseUid: string): Promise<DbTypes.DbLearningPlan | null> => {
    // Query para obtener el plan más reciente del usuario con status ACTIVE
    const GET_CURRENT_USER_PLAN_QUERY = `
        query GetCurrentUserLearningPlan($userFirebaseUid: String!) {
            learningPlans(
                where: { 
                    userFirebaseUid: { eq: $userFirebaseUid }
                }
                orderBy: { generatedAt: DESC }
                limit: 1
            ) {
                id
                userFirebaseUid
                skillName
                generatedAt
                totalDurationWeeks
                dailyTimeMinutes
                skillLevelTarget
                milestones
                progressMetrics
                flexibilityOptions
                sections: planSections_on_learningPlan {
                    id
                    title
                    order
                    days: dayContents_on_section {
                        id
                        dayNumber
                        title
                        focusArea
                        isActionDay
                        objectives
                        completionStatus
                    }
                }
                skillAnalysis: skillAnalysis_on_learningPlan {
                    skillCategory
                    marketDemand
                    isSkillValid
                    learningPathRecommendation
                    realWorldApplications
                    complementarySkills
                    components: skillComponentDatas_on_skillAnalysis {
                        name
                        description
                        difficultyLevel
                        prerequisitesText
                        estimatedLearningHours
                        practicalApplications
                        order
                    }
                }
            }
        }
    `;

    const response = await executeGraphQL<{ learningPlans: DbTypes.DbLearningPlan[] }>(GET_CURRENT_USER_PLAN_QUERY, { userFirebaseUid }, true);
    return response.data?.learningPlans?.[0] ?? null;
};

/**
 * Actualiza el estado de completado de un día.
 * NOTA: Esta función reemplaza la necesidad de 'updateUserEnrollmentProgress' ya que el progreso
 * se puede calcular a partir del estado de los días.
 */
export const updateDayCompletionStatus = async (dayContentId: string, status: DbTypes.CompletionStatus): Promise<boolean> => {
    const response = await executeGraphQL<{ dayContent_update: { id: string } }>(
        UPDATE_DAY_COMPLETION_STATUS_MUTATION,
        { dayContentId, status }
    );
    return !!response.data?.dayContent_update;
};

/**
 * Crea un plan de aprendizaje completo y sus entidades relacionadas en una sola transacción.
 */
export async function createFullLearningPlanInDB(
    userFirebaseUid: string,
    llmPlan: LlmLearningPlan,
    llmSkillAnalysis: LlmSkillAnalysis,
    llmPedagogicalAnalysis: LlmPedagogicalAnalysis | null
): Promise<{ data?: { learningPlan: DbTypes.DbLearningPlan } } | null> {
    logger.info(`DataConnect: Creando plan de aprendizaje completo para user: ${userFirebaseUid}`);

    // --- PASO 1: Crear la entidad LearningPlan base ---
    const planBaseVars = {
        userFirebaseUid,
        skillName: llmPlan.skillName,
        generatedBy: llmPlan.generatedBy,
        generatedAt: new Date().toISOString(),
        totalDurationWeeks: llmPlan.totalDurationWeeks,
        dailyTimeMinutes: llmPlan.dailyTimeMinutes,
        skillLevelTarget: llmPlan.skillLevelTarget,
        milestones: llmPlan.milestones,
        progressMetrics: llmPlan.progressMetrics,
        flexibilityOptions: llmPlan.flexibilityOptions || [],
    };
    const planResponse = await executeGraphQL<{ learningPlan_insert: { id: string } }>(CREATE_LEARNING_PLAN_BASE_MUTATION, planBaseVars);
    const learningPlanId = planResponse.data?.learningPlan_insert.id;

    if (!learningPlanId) {
        logger.error("Fallo al crear la entidad base del LearningPlan.", planResponse.errors);
        return null;
    }
    logger.info(`Plan de aprendizaje base ${learningPlanId} creado.`);

    // --- PASO 2: Crear SkillAnalysis y sus componentes ---
    const skillAnalysisData = { ...llmSkillAnalysis };
    const componentsToCreate = skillAnalysisData.components; // Guardar componentes
    delete (skillAnalysisData as { components?: unknown }).components; // Eliminar del objeto principal

    // ACTUALIZADO: Eliminar skillName redundante
    const { skillName: _skillName, ...skillAnalysisWithoutSkillName } = skillAnalysisData;
    void _skillName;
    const skillAnalysisVars = { ...skillAnalysisWithoutSkillName, learningPlanId };
    const saResponse = await executeGraphQL<{ skillAnalysis_insert: { id: string } }>(CREATE_SKILL_ANALYSIS_MUTATION, skillAnalysisVars);
    const skillAnalysisId = saResponse.data?.skillAnalysis_insert.id;

    if (skillAnalysisId && componentsToCreate) {
        for (const component of componentsToCreate) {
            await executeGraphQL(CREATE_SKILL_COMPONENT_DATA_MUTATION, { ...component, skillAnalysisId });
        }
        logger.info(`SkillAnalysis ${skillAnalysisId} y sus componentes creados.`);
    } else {
        logger.warn(`Fallo al crear SkillAnalysis para el plan ${learningPlanId}.`);
    }

    // --- PASO 3: Crear PedagogicalAnalysis y sus objetivos (si existen) ---
    if (llmPedagogicalAnalysis) {
        const pedagogicalAnalysisData = { ...llmPedagogicalAnalysis };
        const objectivesToCreate = pedagogicalAnalysisData.objectives;
        delete (pedagogicalAnalysisData as { objectives?: unknown }).objectives;

        const paResponse = await executeGraphQL<{ pedagogicalAnalysis_insert: { id: string } }>(
            CREATE_PEDAGOGICAL_ANALYSIS_MUTATION, { ...pedagogicalAnalysisData, learningPlanId }
        );
        const pedagogicalAnalysisId = paResponse.data?.pedagogicalAnalysis_insert.id;
        if (pedagogicalAnalysisId && objectivesToCreate) {
            for (const objective of objectivesToCreate) {
                await executeGraphQL(CREATE_LEARNING_OBJECTIVE_MUTATION, { ...objective, pedagogicalAnalysisId });
            }
            logger.info(`PedagogicalAnalysis ${pedagogicalAnalysisId} y sus objetivos creados.`);
        } else {
            logger.warn(`Fallo al crear PedagogicalAnalysis para el plan ${learningPlanId}.`);
        }
    }

    // --- PASO 4: Crear las secciones y los días del plan ---
    for (const section of llmPlan.sections) {
        const { days, ...sectionData } = section;
        const sectionVars = { ...sectionData, learningPlanId };
        const sectionResponse = await executeGraphQL<{ planSection_insert: { id: string } }>(CREATE_PLAN_SECTION_MUTATION, sectionVars);
        const sectionId = sectionResponse.data?.planSection_insert.id;

        if (sectionId) {
            for (const day of days) {
                const { order: _order, ...dayData } = day;
                void _order;
                await executeGraphQL(CREATE_DAY_CONTENT_MUTATION, { ...dayData, sectionId });
            }
        }
    }
    logger.info(`Secciones y días creados para el plan ${learningPlanId}.`);

    // --- PASO 5: Devolver el ID del plan creado ---
    // Aunque devolvemos solo el ID, la estructura del controlador espera un objeto anidado.
    // Creamos un objeto parcial para satisfacer el tipo de retorno.
    const finalPlanObject = {
        id: learningPlanId,
        skillName: llmPlan.skillName,
        // ... otros campos del plan base si fueran necesarios
    };

    logger.info(`Plan de aprendizaje completo ${learningPlanId} creado exitosamente en DB.`);
    return { data: { learningPlan: finalPlanObject as DbTypes.DbLearningPlan } };
}

export async function saveDailyContentDetailsInDB(dayContentId: string, llmContent: LlmDayContent): Promise<boolean> {
    logger.info(`DataConnect: Guardando detalles para DayContent.id: ${dayContentId}`);
    let allOperationsSucceeded = true;

    // 1. Crear MainContent si existe
    if (llmContent.main_content) {
        const mc = llmContent.main_content;
        const mainContentVars = {
            dayContentId,
            title: mc.title,
            textContent: mc.textContent,
            funFact: mc.funFact,
            xp: mc.xp
        };
        const mcResponse = await executeGraphQL<{mainContentItem_insert: {id: string}}>(CREATE_MAIN_CONTENT_ITEM_MUTATION, mainContentVars);
        const mainContentItemId = mcResponse.data?.mainContentItem_insert.id;
        
        if (mainContentItemId) {
            for (const concept of mc.keyConcepts) {
                 await executeGraphQL(CREATE_KEY_CONCEPT_MUTATION, { 
                    mainContentItemId, 
                    concept: concept.term,
                    explanation: concept.definition 
                });
            }
        } else {
            allOperationsSucceeded = false;
        }
    }
    
    // 2. Crear ActionTask si existe
    if (llmContent.action_task) {
        const at = llmContent.action_task;
        const actionTaskVars = { dayContentId, ...at };
        const atResponse = await executeGraphQL<{actionTaskItem_insert: {id: string}}>(CREATE_ACTION_TASK_ITEM_MUTATION, actionTaskVars);
        const actionTaskItemId = atResponse.data?.actionTaskItem_insert.id;

        if (actionTaskItemId) {
            for (const _step of at.steps) {
                void _step; // placeholder until mapped
            }
        } else {
            allOperationsSucceeded = false;
        }
    }
    
    // 3. Crear Bloques de Ejercicios
    for (const [index, exercise] of (llmContent.exercises || []).entries()) {
        const blockType = exercise.type.toUpperCase();
        let quizDetailsId: string | undefined;
        let exerciseDetailsId: string | undefined;

        // Crear entidades de detalles primero (Quiz/Exercise)
        if(blockType.startsWith('QUIZ')) {
            let quizDesc = 'Quiz';
            if ('question' in exercise && exercise.question) {
                quizDesc = exercise.question;
            } else if ('statement' in exercise && exercise.statement) {
                quizDesc = exercise.statement;
            }
            const qdResponse = await executeGraphQL<{quizContentDetails_insert: {id: string}}>(CREATE_QUIZ_DETAILS_MUTATION, { description: quizDesc });
            quizDetailsId = qdResponse.data?.quizContentDetails_insert.id;
            
            if(quizDetailsId) {
                // Crear preguntas y opciones
                // ... lógica para crear QuizQuestion y QuizOption
            }
        } else if (blockType === 'MATCH_MEANING') {
            const edResponse = await executeGraphQL<{exerciseDetailsData_insert: {id: string}}>(CREATE_EXERCISE_DETAILS_MUTATION, { instructions: 'Une los conceptos', exerciseType: 'MATCHING'});
            exerciseDetailsId = edResponse.data?.exerciseDetailsData_insert.id;
            if (exerciseDetailsId) {
                for (const pair of (exercise as LlmMatchToMeaningBlock).pairs) {
                    await executeGraphQL(CREATE_MATCH_PAIR_MUTATION, { exerciseId: exerciseDetailsId, prompt: pair.term, correctAnswer: pair.meaning });
                }
            }
        }
        
        // Crear el ContentBlockItem principal
        const contentBlockVars = {
            dayContentId,
            blockType: blockType,
            title: 'question' in exercise && exercise.question
                ? exercise.question
                : 'statement' in exercise && exercise.statement
                    ? exercise.statement
                    : 'Ejercicio Interactivo',
            xp: exercise.xp,
            order: index + 1,
            quizDetailsId,
            exerciseDetailsId,
        };
        const cbResponse = await executeGraphQL(CREATE_CONTENT_BLOCK_ITEM_MUTATION, contentBlockVars);
        if (!cbResponse.data) allOperationsSucceeded = false;
    }

    if (!allOperationsSucceeded) {
        logger.error(`DataConnect: Fallaron una o más operaciones al guardar el contenido del día ${dayContentId}.`);
    }

    return allOperationsSucceeded;
}

/**
 * Obtiene los tokens FCM de un usuario por su Firebase UID.
 * @param firebaseUid El UID de Firebase del usuario.
 * @returns Una promesa que se resuelve con un array de tokens FCM, o null si el usuario no se encuentra.
 */
export const getUserDeviceTokens = async (firebaseUid: string): Promise<string[] | null> => {
    const response = await executeGraphQL<{ user: { fcmTokens: string[] } }>(GET_USER_FCM_TOKENS_QUERY, { firebaseUid }, true);
    // El schema indica que fcmTokens puede ser null, y si el usuario no existe, response.data.user también lo será.
    return response.data?.user?.fcmTokens ?? null; 
};

/**
 * Obtiene los datos de streak del usuario.
 */
export const getUserStreakData = async (userFirebaseUid: string): Promise<DbTypes.DbStreakData | null> => {
    const GET_USER_STREAK_QUERY = `
        query GetUserStreak($userFirebaseUid: String!) {
            streakData(key: { userFirebaseUid: $userFirebaseUid }) {
                currentStreak
                longestStreak
                lastContributionDate
            }
        }
    `;

    const response = await executeGraphQL<{ streakData: DbTypes.DbStreakData }>(GET_USER_STREAK_QUERY, { userFirebaseUid }, true);
    return response.data?.streakData ?? null;
};

/**
 * Calcula el XP total del usuario basado en contenidos completados.
 */
export const calculateUserTotalXP = async (userFirebaseUid: string): Promise<number> => {
    const CALCULATE_XP_QUERY = `
        query CalculateUserXP($userFirebaseUid: String!) {
            # XP de MainContent completado
            mainContentItems(
                where: { 
                    dayContent: { 
                        section: { 
                            learningPlan: { 
                                userFirebaseUid: { eq: $userFirebaseUid }
                            }
                        },
                        completionStatus: { eq: "COMPLETED" }
                    }
                }
            ) {
                xp
            }
            
            # XP de ActionTasks completadas
            actionTaskItems(
                where: { 
                    dayContent: { 
                        section: { 
                            learningPlan: { 
                                userFirebaseUid: { eq: $userFirebaseUid }
                            }
                        },
                        completionStatus: { eq: "COMPLETED" }
                    }
                }
            ) {
                xp
            }
            
            # XP de ContentBlocks completados
            contentBlockItems(
                where: { 
                    dayContent: { 
                        section: { 
                            learningPlan: { 
                                userFirebaseUid: { eq: $userFirebaseUid }
                            }
                        },
                        completionStatus: { eq: "COMPLETED" }
                    }
                }
            ) {
                xp
            }
        }
    `;

    const response = await executeGraphQL<{ 
        mainContentItems: { xp: number }[], 
        actionTaskItems: { xp: number }[], 
        contentBlockItems: { xp: number }[] 
    }>(CALCULATE_XP_QUERY, { userFirebaseUid }, true);
    
    let totalXP = 0;
    
    // Sumar XP de todos los tipos de contenido
    response.data?.mainContentItems?.forEach(item => totalXP += item.xp || 0);
    response.data?.actionTaskItems?.forEach(item => totalXP += item.xp || 0);
    response.data?.contentBlockItems?.forEach(item => totalXP += item.xp || 0);
    
    return totalXP;
};

/**
 * Obtiene el desglose detallado de XP del usuario.
 */
export const getUserXPBreakdown = async (userFirebaseUid: string): Promise<{
    mainContent: number;
    actionTasks: number;
    exercises: number;
    total: number;
}> => {
    const XP_BREAKDOWN_QUERY = `
        query GetUserXPBreakdown($userFirebaseUid: String!) {
            mainContentItems(
                where: { 
                    dayContent: { 
                        section: { 
                            learningPlan: { 
                                userFirebaseUid: { eq: $userFirebaseUid }
                            }
                        },
                        completionStatus: { eq: "COMPLETED" }
                    }
                }
            ) {
                xp
            }
            
            actionTaskItems(
                where: { 
                    dayContent: { 
                        section: { 
                            learningPlan: { 
                                userFirebaseUid: { eq: $userFirebaseUid }
                            }
                        },
                        completionStatus: { eq: "COMPLETED" }
                    }
                }
            ) {
                xp
            }
            
            contentBlockItems(
                where: { 
                    dayContent: { 
                        section: { 
                            learningPlan: { 
                                userFirebaseUid: { eq: $userFirebaseUid }
                            }
                        },
                        completionStatus: { eq: "COMPLETED" }
                    }
                }
            ) {
                xp
            }
        }
    `;

    const response = await executeGraphQL<{ 
        mainContentItems: { xp: number }[], 
        actionTaskItems: { xp: number }[], 
        contentBlockItems: { xp: number }[] 
    }>(XP_BREAKDOWN_QUERY, { userFirebaseUid }, true);
    
    const mainContentXP = response.data?.mainContentItems?.reduce((sum, item) => sum + (item.xp || 0), 0) || 0;
    const actionTasksXP = response.data?.actionTaskItems?.reduce((sum, item) => sum + (item.xp || 0), 0) || 0;
    const exercisesXP = response.data?.contentBlockItems?.reduce((sum, item) => sum + (item.xp || 0), 0) || 0;
    
    return {
        mainContent: mainContentXP,
        actionTasks: actionTasksXP,
        exercises: exercisesXP,
        total: mainContentXP + actionTasksXP + exercisesXP
    };
};

