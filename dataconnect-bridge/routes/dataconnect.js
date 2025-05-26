const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const dataconnect = require('../services/dataconnect');
const logger = require('../utils/logger');

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// Health check específico para dataconnect
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'dataconnect-routes',
    timestamp: new Date().toISOString()
  });
});

// Ruta para queries genéricas
router.post('/query', async (req, res) => {
  try {
    const { queryName, variables } = req.body;
    
    if (!queryName) {
      return res.status(400).json({
        error: 'queryName is required'
      });
    }
    
    logger.info(`Executing query: ${queryName}`, { variables });
    const result = await dataconnect.queryData(queryName, variables);
    
    res.json(result);
  } catch (error) {
    logger.error(`Query error: ${error.message}`, error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Ruta para mutations genéricas
router.post('/mutation', async (req, res) => {
  try {
    const { mutationName, variables } = req.body;
    
    if (!mutationName) {
      return res.status(400).json({
        error: 'mutationName is required'
      });
    }
    
    logger.info(`Executing mutation: ${mutationName}`, { variables });
    const result = await dataconnect.executeMutation(mutationName, variables);
    
    res.json(result);
  } catch (error) {
    logger.error(`Mutation error: ${error.message}`, error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Ruta especializada para crear plan de aprendizaje completo
router.post('/create-learning-plan', async (req, res) => {
  try {
    const { userId, planData } = req.body;
    
    if (!userId || !planData) {
      return res.status(400).json({
        error: 'userId and planData are required'
      });
    }
    
    logger.info(`Creating learning plan for user: ${userId}`);
    const result = await dataconnect.createCompleteLearningPlan(userId, planData);
    
    res.json(result);
  } catch (error) {
    logger.error(`Create learning plan error: ${error.message}`, error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Ruta especializada para crear contenido del día
router.post('/create-day-content', async (req, res) => {
  try {
    const { dayContentId, contentData } = req.body;
    
    if (!dayContentId || !contentData) {
      return res.status(400).json({
        error: 'dayContentId and contentData are required'
      });
    }
    
    logger.info(`Creating day content for day: ${dayContentId}`);
    const result = await dataconnect.createDayContentWithBlocks(dayContentId, contentData);
    
    res.json(result);
  } catch (error) {
    logger.error(`Create day content error: ${error.message}`, error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Información del esquema
router.get('/schema-info', async (req, res) => {
  try {
    res.json({
      tables: [
        'User', 'UserPreference', 'LearningPlan', 'SkillAnalysis',
        'PedagogicalAnalysis', 'PlanSection', 'DayContent', 'ContentBlock',
        'AudioContent', 'ReadContent', 'QuizContent', 'ActionTask',
        'Enrollment', 'ContentProgress', 'UserAnalytics', 'AdkSession'
      ],
      enums: [
        'AuthProvider', 'Platform', 'UserExperienceLevel', 'LearningStyle',
        'ContentBlockType', 'CompletionStatus', 'SkillCategory', 
        'MarketDemand', 'ChurnRisk'
      ],
      version: '2.0.0',
      type: 'relational'
    });
  } catch (error) {
    logger.error(`Schema info error: ${error.message}`, error);
    res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router; 