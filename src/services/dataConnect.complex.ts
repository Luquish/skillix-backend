// src/services/dataConnect.complex.ts
// Operaciones complejas de Data Connect que combinan múltiples mutations básicas

import logger from '../utils/logger';
import * as DbTypes from './dataConnect.types';
import * as AdminMutations from './dataConnect.mutations';

// Importar tipos de LLM y Zod para los datos de entrada
import {
    DayContent as LlmDayContent,
    SkillAnalysis as LlmSkillAnalysis,
    PedagogicalAnalysis as LlmPedagogicalAnalysis,
    LearningPlan as LlmLearningPlan,
    MatchToMeaningBlock as LlmMatchToMeaningBlock,
} from './llm/schemas';

/**
 * ✅ ADMIN SDK - Crea un plan de aprendizaje completo usando funciones Admin SDK
 * Esta función ya no tiene un try-catch; los errores se propagan al asyncHandler.
 */
export async function createFullLearningPlanInDB(
    userFirebaseUid: string,
    llmPlan: LlmLearningPlan,
    llmSkillAnalysis: LlmSkillAnalysis,
    llmPedagogicalAnalysis: LlmPedagogicalAnalysis | null
): Promise<{ data?: { learningPlan: DbTypes.DbLearningPlan } } | null> {
    logger.info(`[Admin SDK Complex] Creating full learning plan for user: ${userFirebaseUid}`);

    // --- PASO 1: Crear la entidad LearningPlan base ---
    const planBaseInput = {
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
    
    const planResponse = await AdminMutations.createLearningPlanBase(planBaseInput);
    const learningPlanId = planResponse?.id;

    if (!learningPlanId) {
        logger.error("[Admin SDK Complex] Failed to create learning plan base");
        // Devolvemos null para que el controlador lo maneje como un error.
        // O podríamos lanzar un error: throw createError('Failed to create learning plan', 500);
        return null;
    }
    logger.info(`[Admin SDK Complex] Learning plan base created: ${learningPlanId}`);

    // --- PASO 2: Crear SkillAnalysis y sus componentes ---
    const skillAnalysisData = { ...llmSkillAnalysis };
    const componentsToCreate = skillAnalysisData.components;
    delete (skillAnalysisData as { components?: unknown }).components;
    
    // Eliminar skillName redundante
    const { skillName: _skillName, ...skillAnalysisWithoutSkillName } = skillAnalysisData;
    void _skillName;
    
    const skillAnalysisInput = { 
        ...skillAnalysisWithoutSkillName, 
        learningPlanId,
        generatedBy: 'LLM_SERVICE'
    };
    
    const saResponse = await AdminMutations.createSkillAnalysis(skillAnalysisInput);
    const skillAnalysisId = saResponse?.id;

    if (skillAnalysisId && componentsToCreate) {
        for (const component of componentsToCreate) {
            const componentInput = { 
                ...component, 
                skillAnalysisId 
            };
            await AdminMutations.createSkillComponentData(componentInput);
        }
        logger.info(`[Admin SDK Complex] SkillAnalysis ${skillAnalysisId} and components created`);
    }

    // --- PASO 3: Crear PedagogicalAnalysis y sus objetivos ---
    if (llmPedagogicalAnalysis) {
        const pedagogicalAnalysisData = { ...llmPedagogicalAnalysis };
        const objectivesToCreate = pedagogicalAnalysisData.objectives;
        delete (pedagogicalAnalysisData as { objectives?: unknown }).objectives;

        const paInput = { 
            ...pedagogicalAnalysisData, 
            learningPlanId,
            generatedBy: 'LLM_SERVICE'
        };
        
        const paResponse = await AdminMutations.createPedagogicalAnalysis(paInput);
        const pedagogicalAnalysisId = paResponse?.id;
        
        if (pedagogicalAnalysisId && objectivesToCreate) {
            for (const objective of objectivesToCreate) {
                const objectiveInput = { 
                    pedagogicalAnalysisId,
                    objective: objective.objective,
                    measurable: objective.measurable,
                    timeframe: objective.timeframe,
                    order: objective.order
                };
                await AdminMutations.createLearningObjectiveData(objectiveInput);
            }
            logger.info(`[Admin SDK Complex] PedagogicalAnalysis ${pedagogicalAnalysisId} and objectives created`);
        }
    }

    // --- PASO 4: Crear las secciones y los días del plan ---
    for (const section of llmPlan.sections) {
        const { days, ...sectionData } = section;
        const sectionInput = { 
            learningPlanId,
            title: sectionData.title,
            description: sectionData.description,
            order: sectionData.order
        };
        
        const sectionResponse = await AdminMutations.createPlanSection(sectionInput);
        const sectionId = sectionResponse?.id;

        if (sectionId) {
            for (const day of days) {
                const { order: _order, ...dayData } = day;
                void _order;
                const dayInput = { 
                    sectionId,
                    dayNumber: dayData.dayNumber,
                    title: dayData.title,
                    focusArea: dayData.focusArea,
                    isActionDay: dayData.isActionDay,
                    objectives: dayData.objectives,
                    completionStatus: dayData.completionStatus
                };
                await AdminMutations.createDayContent(dayInput);
            }
        }
    }
    logger.info(`[Admin SDK Complex] Sections and days created for plan: ${learningPlanId}`);

    // --- PASO 5: Devolver el resultado ---
    const finalPlanObject = {
        id: learningPlanId,
        skillName: llmPlan.skillName,
    };

    logger.info(`[Admin SDK Complex] Full learning plan created successfully: ${learningPlanId}`);
    return { data: { learningPlan: finalPlanObject as DbTypes.DbLearningPlan } };
}

/**
 * ✅ ADMIN SDK - Guarda detalles de contenido diario usando funciones Admin SDK.
 */
export async function saveDailyContentDetailsInDB(dayContentId: string, llmContent: LlmDayContent): Promise<boolean> {
    logger.info(`[Admin SDK Complex] Saving daily content details for day: ${dayContentId}`);
    let allOperationsSucceeded = true;

    // 1. Crear MainContent si existe
    if (llmContent.main_content) {
        const mc = llmContent.main_content;
        const mainContentInput = {
            dayContentId,
            title: mc.title,
            textContent: mc.textContent,
            funFact: mc.funFact,
            xp: mc.xp
        };
        
        const mcResponse = await AdminMutations.createMainContentItem(mainContentInput);
        const mainContentItemId = mcResponse?.id;
        
        if (mainContentItemId) {
            // Crear KeyConcepts
            for (const concept of mc.keyConcepts) {
                const conceptInput = { 
                    mainContentItemId, 
                    concept: concept.term,
                    explanation: concept.definition 
                };
                await AdminMutations.createKeyConcept(conceptInput);
            }
            logger.info(`[Admin SDK Complex] MainContent created: ${mainContentItemId}`);
        } else {
            allOperationsSucceeded = false;
        }
    }
    
    // 2. Crear ActionTask si existe
    if (llmContent.action_task) {
        const at = llmContent.action_task;
        const actionTaskInput = { 
            dayContentId,
            title: at.title || '',
            challengeDescription: at.challenge_description || '',
            timeEstimateString: at.time_estimate || '',
            tips: at.tips || [],
            realWorldContext: at.real_world_context || '',
            successCriteria: at.success_criteria || [],
            toviMotivation: at.ski_motivation || '',
            difficultyAdaptation: at.difficulty_adaptation,
            xp: at.xp || 0
        };
         
        const atResponse = await AdminMutations.createActionTaskItem(actionTaskInput);
        
        if (!atResponse?.id) {
            allOperationsSucceeded = false;
        } else {
            logger.info(`[Admin SDK Complex] ActionTask created: ${atResponse.id}`);
        }
    }
    
    // 3. Crear Bloques de Ejercicios
    const exercises = llmContent.exercises || [];
    for (let index = 0; index < exercises.length; index++) {
        const exercise = exercises[index];
        const blockType = exercise.type.toUpperCase();
        let quizDetailsId: string | undefined;
        let exerciseDetailsId: string | undefined;

        // Crear entidades de detalles primero
        if(blockType.startsWith('QUIZ')) {
            let quizDesc = 'Quiz';
            if ('question' in exercise && exercise.question) {
                quizDesc = exercise.question;
            } else if ('statement' in exercise && exercise.statement) {
                quizDesc = exercise.statement;
            }
            
            const qdResponse = await AdminMutations.createQuizDetails({ description: quizDesc });
            quizDetailsId = qdResponse?.id;
        } else if (blockType === 'MATCH_MEANING') {
            const edResponse = await AdminMutations.createExerciseDetails({ 
                instructions: 'Une los conceptos', 
                exerciseType: 'MATCHING'
            });
            exerciseDetailsId = edResponse?.id;
            
            if (exerciseDetailsId) {
                for (const pair of (exercise as LlmMatchToMeaningBlock).pairs) {
                    const pairInput = { 
                        exerciseId: exerciseDetailsId, 
                        prompt: pair.term, 
                        correctAnswer: pair.meaning 
                    };
                    await AdminMutations.createMatchPair(pairInput);
                }
            }
        }
        
        // Crear el ContentBlockItem principal
        const contentBlockInput = {
            dayContentId,
            blockType: blockType,
            title: 'question' in exercise && exercise.question
                ? exercise.question
                : 'statement' in exercise && exercise.statement
                    ? exercise.statement
                    : 'Ejercicio Interactivo',
            xp: exercise.xp,
            order: index + 1,
            estimatedMinutes: null,
            quizDetailsId,
            exerciseDetailsId,
        };
        
        const cbResponse = await AdminMutations.createContentBlockItem(contentBlockInput);
        if (!cbResponse?.id) allOperationsSucceeded = false;
        
        logger.info(`[Admin SDK Complex] Exercise ${index + 1} (${blockType}) created successfully`);
    }

    if (!allOperationsSucceeded) {
        logger.warn(`[Admin SDK Complex] Some operations failed while saving daily content for day: ${dayContentId}`);
    }

    return allOperationsSucceeded;
}

/**
 * ✅ ADMIN SDK - Función helper para crear enrollment completo
 */
export async function createEnrollmentWithPlan(
    userFirebaseUid: string,
    learningPlanId: string,
    status = 'ACTIVE'
): Promise<any> {
    try {
        logger.info(`[Admin SDK Complex] Creating enrollment for user: ${userFirebaseUid}, plan: ${learningPlanId}`);
        
        const enrollmentInput = {
            userFirebaseUid,
            learningPlanId,
            status
        };
        
        const enrollment = await AdminMutations.createEnrollmentBackend(enrollmentInput);
        
        if (enrollment) {
            logger.info(`[Admin SDK Complex] Enrollment created successfully: ${enrollment.id}`);
            return enrollment;
        }
        
        return null;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[Admin SDK Complex] Error creating enrollment: ${errorMessage}`);
        throw error;
    }
} 