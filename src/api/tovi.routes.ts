import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import * as ToviController from '../controllers/tovi.controller';
import { asyncHandler } from '../utils/errorHandler';

const router = Router();

// --- RUTAS DE TOVI ---

// Ruta para obtener mensajes de Tovi por parámetro de RUTA
// EJ: /api/tovi/messages/daily_greeting
router.get(
    '/messages/:situation', 
    isAuthenticated, 
    asyncHandler(ToviController.getToviMessageFromPath)
);

// Ruta para obtener mensajes de Tovi por QUERY string
// EJ: /api/tovi/messages?situation=milestone_achieved
router.get(
    '/messages', 
    isAuthenticated, 
    asyncHandler(ToviController.getToviMessageFromQuery)
);


export default router; 