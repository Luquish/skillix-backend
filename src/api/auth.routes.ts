import { Router } from 'express';
import {
  signUpController,
  socialSignInController,
} from '../controllers/auth.controller';

const router = Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Registra un nuevo usuario con email y contraseña.
 * @access  Public
 */
router.post('/signup', signUpController);

// Ruta para manejar el login/signup con proveedores sociales (Google, Apple)
// Esta ruta no usa `isAuthenticated` porque maneja tanto a usuarios nuevos como existentes.
// La verificación del token se hace dentro del controlador.
router.post('/social-signin', socialSignInController);

// No se necesita una ruta de 'login' en el backend para la autenticación estándar de Firebase.
// El cliente maneja el login con el SDK de Firebase y obtiene un ID Token.
// Ese ID Token se envía a nuestros endpoints privados para su verificación
// por el middleware `isAuthenticated`.

export default router;
