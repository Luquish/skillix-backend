const logger = require('../utils/logger');

/**
 * Middleware de autenticación simple basado en API key
 * En producción, considera usar Firebase Auth o JWT
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        message: 'Missing or invalid authorization header',
        status: 401
      }
    });
  }
  
  const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey) {
    logger.error('API_KEY not configured in environment variables');
    return res.status(500).json({
      error: {
        message: 'Server configuration error',
        status: 500
      }
    });
  }
  
  if (apiKey !== validApiKey) {
    logger.warn(`Invalid API key attempt from IP: ${req.ip}`);
    return res.status(401).json({
      error: {
        message: 'Invalid API key',
        status: 401
      }
    });
  }
  
  // API key válida, continuar
  next();
}

module.exports = {
  authenticate
}; 