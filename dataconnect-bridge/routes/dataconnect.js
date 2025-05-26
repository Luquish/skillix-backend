const express = require('express');
const router = express.Router();
const { getDataConnect, queryData, executeMutation } = require('../services/dataconnect');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// Middleware de autenticación para todas las rutas
router.use(authenticate);

// Ejecutar query
router.post('/query', async (req, res, next) => {
  try {
    const { queryName, variables } = req.body;
    
    if (!queryName) {
      return res.status(400).json({
        error: {
          message: 'queryName is required',
          status: 400
        }
      });
    }
    
    logger.info(`Executing query: ${queryName}`, { variables });
    
    const result = await queryData(queryName, variables);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error(`Query error: ${error.message}`, error);
    next(error);
  }
});

// Ejecutar mutation
router.post('/mutation', async (req, res, next) => {
  try {
    const { mutationName, variables } = req.body;
    
    if (!mutationName) {
      return res.status(400).json({
        error: {
          message: 'mutationName is required',
          status: 400
        }
      });
    }
    
    logger.info(`Executing mutation: ${mutationName}`, { variables });
    
    const result = await executeMutation(mutationName, variables);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error(`Mutation error: ${error.message}`, error);
    next(error);
  }
});

// Obtener esquema (útil para debugging)
router.get('/schema', async (req, res, next) => {
  try {
    const dataConnect = getDataConnect();
    
    // Esto dependerá de cómo Data Connect exponga el esquema
    res.json({
      success: true,
      message: 'Schema endpoint - implementation pending'
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router; 