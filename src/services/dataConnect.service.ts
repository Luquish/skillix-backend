// src/services/dataConnect.service.ts
// Servicio principal de Data Connect - Delegación y wrappers de compatibilidad

import logger from '../utils/logger';
import * as DbTypes from './dataConnect.types';

// Importar módulos especializados
import * as AdminQueries from './dataconnect.queries';
import * as AdminMutations from './dataConnect.mutations';
import * as ComplexOperations from './dataConnect.complex';

// === DELEGACIONES DIRECTAS ===

// Queries básicas
export const getUserByFirebaseUid = AdminQueries.getUserByFirebaseUid;
export const getLearningPlanStructureById = AdminQueries.getLearningPlanStructure;
export const getCurrentUserLearningPlan = AdminQueries.getCurrentUserLearningPlan;
export const getUserDeviceTokens = AdminQueries.getUserFcmTokens;
export const getUserFcmTokens = AdminQueries.getUserFcmTokens;
export const getUserStreakData = AdminQueries.getUserStreak;
export const calculateUserTotalXP = AdminQueries.calculateUserXP;
export const getDayContent = AdminQueries.getDayContent;
export const getUserAnalytics = AdminQueries.getUserAnalytics;
export const getUserProgress = AdminQueries.getUserProgress;
export const getToviMessages = AdminQueries.getToviMessages;
export const getUserEnrollments = AdminQueries.getUserEnrollments;
export const getUserLearningPlans = AdminQueries.getUserLearningPlans;
export const getUserXPBreakdownQuery = AdminQueries.getUserXPBreakdown;

// Mutations básicas
export const createUserAdmin = AdminMutations.createUser;
export const createUserPreferenceAdmin = AdminMutations.createUserPreference;
export const createEnrollment = AdminMutations.createEnrollmentBackend;
export const updateDayCompletionStatus = AdminMutations.updateDayCompletionStatus;
export const deleteUserByFirebaseUid = AdminMutations.deleteUser;

// Operaciones complejas
export const createFullLearningPlanInDB = ComplexOperations.createFullLearningPlanInDB;
export const saveDailyContentDetailsInDB = ComplexOperations.saveDailyContentDetailsInDB;

// === FUNCIONES DE COMPATIBILIDAD ===
// Estas funciones mantienen la compatibilidad con el código existente

// Wrapper para createUser que mantiene la interfaz esperada
export const createUser = async (input: DbTypes.DbUser): Promise<{ firebaseUid: string } | null> => {
    try {
        logger.info(`[Admin SDK] Creating user via wrapper: ${input.firebaseUid}`);
        
        // Asegurar que authProvider tenga un valor por defecto
        const userInput = {
            ...input,
            authProvider: input.authProvider || 'EMAIL'
        };
        
        const result = await AdminMutations.createUser(userInput);
        return result ? { firebaseUid: input.firebaseUid } : null;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[Admin SDK] Error in createUser wrapper: ${errorMessage}`);
        throw error;
    }
};

// Wrapper para createUserPreference que mantiene la interfaz esperada  
export const createUserPreference = async (input: DbTypes.UserPreferenceInsert): Promise<any> => {
    try {
        logger.info(`[Admin SDK] Creating user preference via wrapper: ${input.userFirebaseUid}`);
        return await AdminMutations.createUserPreference(input);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[Admin SDK] Error in createUserPreference wrapper: ${errorMessage}`);
        throw error;
    }
};

// Wrapper para getUserXPBreakdown que delega directamente al cálculo de Admin SDK
export const getUserXPBreakdown = async (userFirebaseUid: string): Promise<{
    mainContent: number;
    actionTasks: number;
    exercises: number;
    total: number;
}> => {
    try {
        logger.info(`[Admin SDK] Getting user XP breakdown via wrapper: ${userFirebaseUid}`);
        const breakdown = await AdminQueries.calculateUserXP(userFirebaseUid);
        
        // calculateUserXP ya devuelve el breakdown completo
        return breakdown;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[Admin SDK] Error in getUserXPBreakdown wrapper: ${errorMessage}`);
        throw error;
    }
};

// Wrapper para createActionStepItem
export const createActionStepItem = async (input: {
    actionTaskItemId: string;
    stepNumber: number;
    description: string;
    estimatedTimeSeconds: number;
}): Promise<any> => {
    try {
        logger.info(`[Admin SDK] Creating action step item via wrapper: ${input.actionTaskItemId}`);
        return await AdminMutations.createActionStepItem(input);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[Admin SDK] Error in createActionStepItem wrapper: ${errorMessage}`);
        throw error;
    }
};

// Wrapper para createEnrollmentUser que usa la mutation directa para usuarios autenticados
export const createEnrollmentUser = async (input: {
    learningPlanId: string;
    status: string;
}): Promise<any> => {
    try {
        logger.info(`[Admin SDK] Creating enrollment via wrapper: ${input.learningPlanId}`);
        // Usar la mutation directa de enrollment que usa auth.uid automáticamente
        return await AdminMutations.createEnrollment(input);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[Admin SDK] Error in createEnrollmentUser wrapper: ${errorMessage}`);
        throw error;
    }
};

// === FUNCIONES ADICIONALES ===

// Delegaciones adicionales de mutations
export const createKeyConcept = AdminMutations.createKeyConcept;
export const createContentBlockItem = AdminMutations.createContentBlockItem;
export const createQuizDetails = AdminMutations.createQuizDetails;
export const createQuizQuestion = AdminMutations.createQuizQuestion;
export const createQuizOption = AdminMutations.createQuizOption;
export const createExerciseDetails = AdminMutations.createExerciseDetails;
export const createMatchPair = AdminMutations.createMatchPair;
export const createPedagogicalAnalysis = AdminMutations.createPedagogicalAnalysis;
export const createLearningObjectiveData = AdminMutations.createLearningObjectiveData;

// Función helper para crear un quiz completo
export const createCompleteQuiz = async (input: {
    description: string;
    questions: Array<{
        question: string;
        questionType: string;
        explanation?: string;
        options: Array<{
            optionText: string;
            isCorrect: boolean;
        }>;
    }>;
}): Promise<{ quizDetailsId: string; questionIds: string[] } | null> => {
    try {
        logger.info(`[Admin SDK] Creating complete quiz: ${input.description}`);
        
        // 1. Crear el quiz details
        const quizResponse = await AdminMutations.createQuizDetails({ description: input.description });
        const quizDetailsId = quizResponse?.id;
        
        if (!quizDetailsId) {
            logger.error(`[Admin SDK] Failed to create quiz details`);
            return null;
        }
        
        const questionIds: string[] = [];
        
        // 2. Crear todas las preguntas y sus opciones
        for (const questionData of input.questions) {
            const questionResponse = await AdminMutations.createQuizQuestion({
                quizDetailsId,
                question: questionData.question,
                questionType: questionData.questionType,
                explanation: questionData.explanation || null
            });
            
            const questionId = questionResponse?.id;
            
            if (questionId) {
                questionIds.push(questionId);
                
                // 3. Crear todas las opciones para esta pregunta
                for (const optionData of questionData.options) {
                    await AdminMutations.createQuizOption({
                        questionId,
                        optionText: optionData.optionText,
                        isCorrect: optionData.isCorrect
                    });
                }
            }
        }
        
        logger.info(`[Admin SDK] Complete quiz created successfully: ${quizDetailsId} with ${questionIds.length} questions`);
        return { quizDetailsId, questionIds };
        
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[Admin SDK] Error creating complete quiz: ${errorMessage}`);
        throw error;
    }
}; 