import winston from 'winston';

// Configuración de formatos personalizados
const { combine, timestamp, printf, colorize } = winston.format;

// Formato personalizado para la consola
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  const metaStr = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

// Crear el logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    colorize(),
    timestamp(),
    consoleFormat
  ),
  transports: [
    new winston.transports.Console()
  ],
});

// Exportar el logger
export default logger;