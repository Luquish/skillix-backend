import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Middleware de manejo de errores global para Express
 * Debe ser el último middleware registrado en la aplicación
 */
export const errorHandler = (
  error: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Si ya se envió una respuesta, delegar al manejador de errores predeterminado de Express
  if (res.headersSent) {
    return next(error);
  }

  console.error('🚨 Error Handler:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Prioridad 1: Manejo de errores de Firebase Auth (mantener 403)
  if ((error as ApiError).code?.startsWith('auth/')) {
    return res.status(403).json({
      message: 'Invalid or expired token.',
      code: (error as ApiError).code
    });
  }

  // Prioridad 2: Manejo de errores con statusCode específico (respetar códigos 401, 403, 404, etc.)
  const statusCode = (error as ApiError).statusCode;
  if (statusCode) {
    return res.status(statusCode).json({
      message: error.message || 'An error occurred'
    });
  }

  // Prioridad 3: Manejo de errores de validación Zod (solo si no hay statusCode específico)
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Invalid input data.',
      errors: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    });
  }

  // Error genérico del servidor
  res.status(500).json({
    message: 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error.message 
    })
  });
};

/**
 * Middleware para manejar rutas no encontradas (404)
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} not found.`
  });
};

/**
 * Función auxiliar para crear errores con código de estado específico
 */
export const createError = (message: string, statusCode: number): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  return error;
};
