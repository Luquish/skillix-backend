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

// Función para crear contenido del día
async function createDayContentWithBlocks(dayContentId, contentData) {
  try {
    const dc = getDataConnect();
    const transformed = await adapter.transformDayContent(contentData);
    
    // 1. Crear objetivos del día
    if (transformed.objectives.length > 0) {
      const { createDayObjectives } = require('../../dataconnect/generated/js/default-connector');
      await createDayObjectives(dc, {
        dayContentId,
        objectives: transformed.objectives.map((obj, idx) => ({
          dayContentId,
          objective: obj,
          order: idx
        }))
      });
    }
    
    // 2. Crear bloques de contenido
    for (const block of transformed.blocks) {
      const { createContentBlock } = require('../../dataconnect/generated/js/default-connector');
      const blockResult = await createContentBlock(dc, {
        dayContentId,
        blockType: block.blockType,
        title: block.title,
        xp: block.xp,
        order: block.order,
        estimatedMinutes: block.estimatedMinutes
      });
      
      const contentBlockId = blockResult.id;
      
      // Crear contenido específico según el tipo
      switch (block.blockType) {
        case 'AUDIO':
          if (block.audioContent) {
            const { createAudioContent } = require('../../dataconnect/generated/js/default-connector');
            await createAudioContent(dc, {
              contentBlockId,
              ...block.audioContent
            });
          }
          break;
          
        case 'READ':
          if (block.readContent) {
            const { createReadContent } = require('../../dataconnect/generated/js/default-connector');
            const readResult = await createReadContent(dc, {
              contentBlockId,
              content: block.readContent.content,
              estimatedReadTime: block.readContent.estimatedReadTime
            });
            
            // Crear conceptos clave
            if (block.readContent.keyConcepts.length > 0) {
              const { createKeyConcepts } = require('../../dataconnect/generated/js/default-connector');
              await createKeyConcepts(dc, {
                readContentId: readResult.id,
                concepts: block.readContent.keyConcepts.map(kc => ({
                  readContentId: readResult.id,
                  ...kc
                }))
              });
            }
          }
          break;
          
        case 'QUIZ_MCQ':
          if (block.quizContent) {
            const { createQuizContent } = require('../../dataconnect/generated/js/default-connector');
            const quizResult = await createQuizContent(dc, { contentBlockId });
            
            // Crear preguntas
            for (const question of block.quizContent.questions) {
              const { createQuizQuestion } = require('../../dataconnect/generated/js/default-connector');
              const questionResult = await createQuizQuestion(dc, {
                quizContentId: quizResult.id,
                question: question.question,
                correctAnswer: question.correctAnswer,
                explanation: question.explanation,
                order: question.order
              });
              
              // Crear opciones
              if (question.options.length > 0) {
                const { createQuizOptions } = require('../../dataconnect/generated/js/default-connector');
                await createQuizOptions(dc, {
                  questionId: questionResult.id,
                  options: question.options.map(opt => ({
                    questionId: questionResult.id,
                    ...opt
                  }))
                });
              }
            }
          }
          break;
          
        case 'ACTION_TASK':
          if (block.actionTask) {
            const { createActionTask } = require('../../dataconnect/generated/js/default-connector');
            const taskResult = await createActionTask(dc, {
              contentBlockId,
              ...block.actionTask
            });
            
            // Crear pasos
            if (block.actionTask.steps.length > 0) {
              const { createActionSteps } = require('../../dataconnect/generated/js/default-connector');
              await createActionSteps(dc, {
                actionTaskId: taskResult.id,
                steps: block.actionTask.steps.map(step => ({
                  actionTaskId: taskResult.id,
                  ...step
                }))
              });
            }
            
            // Crear entregables
            if (block.actionTask.deliverables.length > 0) {
              const { createActionDeliverables } = require('../../dataconnect/generated/js/default-connector');
              await createActionDeliverables(dc, {
                actionTaskId: taskResult.id,
                deliverables: block.actionTask.deliverables.map(del => ({
                  actionTaskId: taskResult.id,
                  ...del
                }))
              });
            }
          }
          break;
      }
    }
    
    logger.info(`Day content created successfully for day ${dayContentId}`);
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