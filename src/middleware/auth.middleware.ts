import { Request, Response, NextFunction } from 'express';
import * as FirebaseService from '../services/firebase.service';
import * as DataConnectService from '../services/dataConnect.service';
import { DbUser } from '../services/dataConnect.types';

// Exportamos la interfaz para que pueda ser utilizada en los controladores
export interface AuthenticatedRequest extends Request {
  user?: DbUser;
}

/**
 * Middleware para verificar el token de Firebase y adjuntar el usuario a la request.
 * El token debe ser enviado en el header 'Authorization' como 'Bearer <token>'.
 */
export const isAuthenticated = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided.' });
  }

  const token = authorization.split('Bearer ')[1];

  try {
    // Verificar el token usando el servicio de Firebase Admin
    const decodedToken = await FirebaseService.verifyFirebaseIdToken(token);
    const { uid } = decodedToken;

    // Buscar al usuario en nuestra base de datos usando el UID de Firebase
    const userProfile = await DataConnectService.getUserByFirebaseUid(uid);
    
    if (!userProfile) {
      // Este caso es importante. Significa que el usuario está autenticado en Firebase
      // pero no tiene un registro en nuestra DB. Para el endpoint de 'create-plan',
      // esto sería un error, pero para un endpoint de 'sign-up' sería el comportamiento esperado.
      return res.status(401).json({ message: 'User is not registered in our system.' });
    }
    
    // 3. Adjuntar el objeto de usuario completo al objeto request
    req.user = userProfile;
    
    next();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Authentication error:', errorMessage);
    // El token puede ser inválido, expirado, etc.
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};
