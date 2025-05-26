const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'dataconnect-bridge' },
  transports: [
    // Escribir todos los logs con nivel 'error' y menor a error.log
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // Escribir todos los logs con nivel 'info' y menor a combined.log
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Si no estamos en producción, log a la consola también
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Stream para Morgan
logger.stream = {
  write: function(message, encoding) {
    logger.info(message.trim());
  }
};

module.exports = logger; 