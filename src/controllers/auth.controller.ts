import { Request, Response } from 'express';
import * as DataConnectService from '../services/dataConnect.service';
import * as FirebaseService from '../services/firebase.service';
import { AuthProvider, DbUser } from '../services/dataConnect.types';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createError } from '../utils/errorHandler';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';

/**
 * Controlador para sincronizar el perfil del usuario autenticado en nuestra base de datos.
 * Recibe un ID Token de Firebase (ya sea de autenticación por email o social) y
 * aplica una lógica de "obtener o crear" en la DB.
 */
export const syncProfileController = async (req: AuthenticatedRequest, res: Response) => {
  const decodedToken = req.user;

  // Guarda de tipo para asegurar que tenemos un DecodedIdToken
  if (!decodedToken || !('uid' in decodedToken) || !('firebase' in decodedToken)) {
    throw createError('User token is invalid or not correctly processed.', 401);
  }
  
  const { uid, email, name, picture, email_verified } = decodedToken;

  // 2. Intentar obtener el usuario de nuestra base de datos usando SDK generado
  const existingUser = await DataConnectService.getUserByFirebaseUid(uid);

  if (existingUser) {
    // 2a. El usuario ya existe (es un login). Devolvemos sus datos.
    return res.status(200).json({
      message: 'User logged in successfully!',
      user: existingUser,
    });
  } else {
    // 2b. El usuario no existe (es un sign-up). Lo creamos.
    const providerId = decodedToken.firebase.sign_in_provider;
    let authProvider: AuthProvider;

    if (providerId === 'google.com') {
      authProvider = AuthProvider.GOOGLE;
    } else if (providerId === 'apple.com') {
      authProvider = AuthProvider.APPLE;
    } else if (providerId === 'password') {
      authProvider = AuthProvider.EMAIL; // Asumiendo que EMAIL es para password/email auth
    } else {
      return res.status(400).json({ message: `Unsupported sign-in provider: ${providerId}` });
    }

    if (!email) {
      return res.status(400).json({ message: 'Email not provided by authentication provider.' });
    }

    // ✅ Usar SDK generado con tipos específicos
    const newUserInput: DbUser = {
      firebaseUid: uid,
      email: email,
      name: name,
      photoUrl: picture,
      authProvider: authProvider,
      emailVerified: email_verified || false,
    };
    
    const createdUserInDb = await DataConnectService.createUser(newUserInput);

    if (!createdUserInDb) {
      return res.status(500).json({ message: 'Failed to create user profile.' });
    }

    return res.status(201).json({
      message: 'User created successfully!',
      user: {
        uid: uid,
        email: email,
        name: name,
      }
    });
  }
};

/**
 * Controlador para verificar un token de Firebase y lo adjunta a la solicitud para su uso posterior.
 */
export const verifyToken = async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'El token es requerido.' });
    }

    try {
        const decodedToken = await FirebaseService.verifyFirebaseIdToken(token);
        // Opcional: Podrías querer devolver algún dato del perfil del usuario aquí
        res.status(200).json({ message: 'Token verificado con éxito.', data: { uid: decodedToken.uid } });
    } catch (error: unknown) {
        // El servicio ya loguea el error, aquí solo respondemos al cliente
        const code = (error as { code?: string }).code;
        res.status(401).json({ message: 'Token inválido o expirado.', error: code });
    }
};
