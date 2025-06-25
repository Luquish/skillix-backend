import { Router } from 'express';
import { syncProfileController } from '../controllers/auth.controller';
import { attachDecodedToken } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/errorHandler';

const router = Router();

// Ruta que sincroniza el perfil del usuario autenticado (email o social).
// No requiere middleware isAuthenticated porque la verificación se realiza dentro del controlador.
router.post(
  '/sync-profile', 
  attachDecodedToken, // Adjunta el DecodedIdToken a req.user
  asyncHandler(syncProfileController) // El controlador ahora puede asumir que req.user es DecodedIdToken
);

// No se necesita una ruta de 'login' en el backend para la autenticación estándar de Firebase.
// El cliente maneja el login con el SDK de Firebase y obtiene un ID Token.
// Ese ID Token se envía a nuestros endpoints privados para su verificación
// por el middleware `isAuthenticated`.

export default router;
