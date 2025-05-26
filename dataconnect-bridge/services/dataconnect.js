const admin = require('firebase-admin');
const { initializeDataConnect } = require('../../dataconnect/generated/js/default-connector');
const logger = require('../utils/logger');
const adapter = require('./dataconnect-adapter');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

// Inicializar Data Connect
let dataConnectInstance = null;

function getDataConnect() {
  if (!dataConnectInstance) {
    dataConnectInstance = initializeDataConnect({
      connector: 'default'
    });
  }
  return dataConnectInstance;
}

// Función principal para crear un plan de aprendizaje completo
async function createCompleteLearningPlan(userId, planData) {
  try {
    const dc = getDataConnect();
    const transformed = await adapter.transformLearningPlan(planData);
    
    // 1. Crear el plan principal con análisis
    const { createLearningPlanWithAnalysis } = require('../../dataconnect/generated/js/default-connector');
    const planResult = await createLearningPlanWithAnalysis(dc, {
      userId,
      generatedBy: transformed.learningPlan.generatedBy,
      skill: transformed.skillAnalysis.skill,
      skillCategory: transformed.skillAnalysis.skillCategory,
      marketDemand: transformed.skillAnalysis.marketDemand,
      cognitivLoadAssessment: transformed.pedagogicalAnalysis.cognitivLoadAssessment
    });
    
    const learningPlanId = planResult.learningPlan.id;
    const skillAnalysisId = planResult.skillAnalysis.id;
    const pedagogicalAnalysisId = planResult.pedagogicalAnalysis.id;
    
    // 2. Crear componentes de habilidades
    if (transformed.skillComponents.length > 0) {
      const { createSkillComponents } = require('../../dataconnect/generated/js/default-connector');
      await createSkillComponents(dc, {
        skillAnalysisId,
        components: transformed.skillComponents.map(c => ({ ...c, skillAnalysisId }))
      });
    }
    
    // 3. Crear prerequisitos
    if (transformed.skillPrerequisites.length > 0) {
      const { createSkillPrerequisites } = require('../../dataconnect/generated/js/default-connector');
      await createSkillPrerequisites(dc, {
        skillAnalysisId,
        prerequisites: transformed.skillPrerequisites.map(p => ({ ...p, skillAnalysisId }))
      });
    }
    
    // 4. Crear caminos profesionales
    if (transformed.careerPaths.length > 0) {
      const { createCareerPaths } = require('../../dataconnect/generated/js/default-connector');
      await createCareerPaths(dc, {
        skillAnalysisId,
        careerPaths: transformed.careerPaths.map(cp => ({ ...cp, skillAnalysisId }))
      });
    }
    
    // 5. Crear objetivos de aprendizaje
    if (transformed.learningObjectives.length > 0) {
      const { createLearningObjectives } = require('../../dataconnect/generated/js/default-connector');
      await createLearningObjectives(dc, {
        pedagogicalAnalysisId,
        objectives: transformed.learningObjectives.map(o => ({ ...o, pedagogicalAnalysisId }))
      });
    }
    
    // 6. Crear niveles de Bloom
    if (transformed.bloomsTaxonomy.length > 0) {
      const { createBloomsTaxonomyLevels } = require('../../dataconnect/generated/js/default-connector');
      await createBloomsTaxonomyLevels(dc, {
        pedagogicalAnalysisId,
        levels: transformed.bloomsTaxonomy.map(b => ({ ...b, pedagogicalAnalysisId }))
      });
    }
    
    // 7. Crear secciones y días
    for (const section of transformed.sections) {
      const { createPlanSection } = require('../../dataconnect/generated/js/default-connector');
      const sectionResult = await createPlanSection(dc, {
        planId: learningPlanId,
        title: section.title,
        description: section.description,
        order: section.order
      });
      
      // Crear días para esta sección
      for (const day of section.days) {
        const { createDayContent } = require('../../dataconnect/generated/js/default-connector');
        await createDayContent(dc, {
          sectionId: sectionResult.id,
          dayNumber: day.dayNumber,
          title: day.title,
          focusArea: day.focusArea,
          isActionDay: day.isActionDay,
          generatedBy: transformed.learningPlan.generatedBy
        });
      }
    }
    
    logger.info(`Learning plan created successfully for user ${userId}`);
    return { learningPlanId };
    
  } catch (error) {
    logger.error('Error creating learning plan:', error);
    throw error;
  }
}

/**
 * Crea contenido del día con bloques
 */
async function createDayContentWithBlocks(dayContentId, contentData) {
  try {
    logger.info(`Creating day content for ID: ${dayContentId}`);
    
    // Transformar los datos del agente Python
    const transformedData = await adapter.transformDayContent(contentData);
    
    // 1. Crear objetivos del día
    if (transformedData.objectives && transformedData.objectives.length > 0) {
      const objectivesData = transformedData.objectives.map((obj, idx) => ({
        dayContentId,
        objective: obj,
        order: idx
      }));
      
      await this.executeMutation('CreateDayObjectives', {
        dayContentId,
        objectives: objectivesData
      });
    }
    
    // 2. Crear contenido principal (audio o lectura con fun fact)
    if (transformedData.mainContent) {
      const mainContentResult = await this.executeMutation('CreateMainContent', {
        dayContentId,
        contentType: transformedData.mainContent.contentType,
        title: transformedData.mainContent.title,
        funFact: transformedData.mainContent.funFact,
        xp: transformedData.mainContent.xp
      });
      
      const mainContentId = mainContentResult.createMainContent.id;
      
      // Crear el contenido específico (audio o lectura)
      if (transformedData.mainContent.contentType === 'AUDIO' && transformedData.mainContent.audioContent) {
        await this.executeMutation('CreateAudioContent', {
          mainContentId,
          ...transformedData.mainContent.audioContent
        });
      } else if (transformedData.mainContent.contentType === 'READ' && transformedData.mainContent.readContent) {
        const readResult = await this.executeMutation('CreateReadContent', {
          mainContentId,
          content: transformedData.mainContent.readContent.content,
          estimatedReadTime: transformedData.mainContent.readContent.estimatedReadTime
        });
        
        // Crear conceptos clave si existen
        if (transformedData.mainContent.readContent.keyConcepts?.length > 0) {
          const readContentId = readResult.createReadContent.id;
          await this.executeMutation('CreateKeyConcepts', {
            readContentId,
            concepts: transformedData.mainContent.readContent.keyConcepts
          });
        }
      }
    }
    
    // 3. Crear ejercicios basados en el contenido
    for (const exercise of transformedData.exercises) {
      // Crear el bloque de contenido
      const blockResult = await this.executeMutation('CreateContentBlock', {
        dayContentId,
        blockType: exercise.blockType,
        title: exercise.title,
        xp: exercise.xp,
        order: exercise.order,
        estimatedMinutes: exercise.estimatedMinutes
      });
      
      const contentBlockId = blockResult.createContentBlock.id;
      
      // Crear el contenido específico según el tipo
      if (exercise.blockType === 'QUIZ_MCQ' && exercise.quizContent) {
        const quizResult = await this.executeMutation('CreateQuizContent', {
          contentBlockId
        });
        
        const quizContentId = quizResult.createQuizContent.id;
        
        // Crear preguntas
        for (const question of exercise.quizContent.questions) {
          const questionResult = await this.executeMutation('CreateQuizQuestion', {
            quizContentId,
            question: question.question,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            order: question.order
          });
          
          const questionId = questionResult.createQuizQuestion.id;
          
          // Crear opciones
          if (question.options?.length > 0) {
            await this.executeMutation('CreateQuizOptions', {
              questionId,
              options: question.options
            });
          }
        }
      } else if (exercise.blockType === 'ACTION_TASK' && exercise.actionTask) {
        const actionResult = await this.executeMutation('CreateActionTask', {
          contentBlockId,
          ...exercise.actionTask
        });
        
        const actionTaskId = actionResult.createActionTask.id;
        
        // Crear pasos
        if (exercise.actionTask.steps?.length > 0) {
          await this.executeMutation('CreateActionSteps', {
            actionTaskId,
            steps: exercise.actionTask.steps
          });
        }
        
        // Crear entregables
        if (exercise.actionTask.deliverables?.length > 0) {
          await this.executeMutation('CreateActionDeliverables', {
            actionTaskId,
            deliverables: exercise.actionTask.deliverables
          });
        }
      } else if (exercise.blockType === 'EXERCISE' && exercise.exerciseContent) {
        await this.executeMutation('CreateExerciseContent', {
          contentBlockId,
          ...exercise.exerciseContent
        });
      }
    }
    
    logger.info(`Day content created successfully for day: ${dayContentId}`);
    return { success: true };
    
  } catch (error) {
    logger.error('Error creating day content:', error);
    throw error;
  }
}

// Función para queries
async function queryData(queryName, variables = {}) {
  try {
    const dc = getDataConnect();
    const { [queryName]: queryFunction } = require('../../dataconnect/generated/js/default-connector');
    
    if (!queryFunction) {
      throw new Error(`Query '${queryName}' not found`);
    }
    
    const result = await queryFunction(dc, variables);
    logger.info(`Query ${queryName} executed successfully`);
    return result;
    
  } catch (error) {
    logger.error(`Error in queryData: ${error.message}`, error);
    throw error;
  }
}

// Función para mutations genéricas
async function executeMutation(mutationName, variables = {}) {
  try {
    const dc = getDataConnect();
    const { [mutationName]: mutationFunction } = require('../../dataconnect/generated/js/default-connector');
    
    if (!mutationFunction) {
      throw new Error(`Mutation '${mutationName}' not found`);
    }
    
    const result = await mutationFunction(dc, variables);
    logger.info(`Mutation ${mutationName} executed successfully`);
    return result;
    
  } catch (error) {
    logger.error(`Error in executeMutation: ${error.message}`, error);
    throw error;
  }
}

module.exports = {
  getDataConnect,
  queryData,
  executeMutation,
  createCompleteLearningPlan,
  createDayContentWithBlocks
}; 