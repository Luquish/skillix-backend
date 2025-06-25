import { Request, Response, NextFunction } from 'express';
import * as FirebaseService from '../services/firebase.service';
import * as DataConnectService from '../services/dataConnect.service';
import { DbUser } from '../services/dataConnect.types';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';

// La request puede llevar el token decodificado o el perfil de usuario de la DB
export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken | DbUser;
}

/**
 * Middleware que solo verifica el token de Firebase y adjunta el DecodedIdToken.
 * No comprueba si el usuario existe en nuestra base de datos.
 * Ideal para endpoints de registro/sincronización.
 */
export const attachDecodedToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided.' });
  }
  const token = authorization.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided.' });
  }

  try {
    const decodedToken = await FirebaseService.verifyFirebaseIdToken(token);
    req.user = decodedToken; // Adjunta el token decodificado
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid or expired token.';
    return res.status(403).json({ message: errorMessage });
  }
};


/**
 * Middleware que verifica el token Y que el usuario existe en nuestra base de datos.
 * Adjunta el perfil de usuario de la DB (`DbUser`) a la request.
 * Ideal para la mayoría de endpoints protegidos.
 */
export const isAuthenticated = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided.' });
  }

  const token = authorization.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided.' });
  }

  try {
    const decodedToken = await FirebaseService.verifyFirebaseIdToken(token);
    const userProfile = await DataConnectService.getUserByFirebaseUid(decodedToken.uid);
    
    if (!userProfile) {
      return res.status(401).json({ message: 'User is authenticated but not registered in the system.' });
    }
    
    req.user = userProfile; // Adjunta el perfil de la DB
    
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Authentication error:', errorMessage);
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};
