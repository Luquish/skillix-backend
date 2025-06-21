import { Request, Response } from 'express';
import * as DataConnectService from '../services/dataConnect.service';
import * as FirebaseService from '../services/firebase.service';
import { AuthProvider, DbUser } from '../services/dataConnect.types';

/**
 * Controlador para sincronizar el perfil del usuario autenticado en nuestra base de datos.
 * Recibe un ID Token de Firebase (ya sea de autenticación por email o social) y
 * aplica una lógica de "obtener o crear" en la DB.
 */
export const syncProfileController = async (req: Request, res: Response) => {
  const { authorization } = req.headers;
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided.' });
  }
  
  const token = authorization.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided.' });
  }

  try {
    // 1. Verificar el token de Firebase. Si es inválido, esto lanzará un error.
    const decodedToken = await FirebaseService.verifyFirebaseIdToken(token);
    const { uid, email, name, picture, email_verified } = decodedToken;

    // 2. Intentar obtener el usuario de nuestra base de datos.
    const existingUser = await DataConnectService.getUserByFirebaseUid(uid);

    if (existingUser) {
      // 2a. El usuario ya existe (es un login). Devolvemos sus datos.
      console.log(`Usuario existente ${uid} ha iniciado sesión.`);
      return res.status(200).json({
        message: 'User logged in successfully!',
        user: existingUser,
      });
    } else {
      // 2b. El usuario no existe (es un sign-up). Lo creamos.
      console.log(`Nuevo usuario social con UID: ${uid}. Creando perfil en la DB...`);

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

      const newUserInput: DbUser = {
        firebaseUid: uid,
        email: email!,
        name: name,
        photoUrl: picture,
        authProvider: authProvider,
        emailVerified: email_verified || false,
      };

      const createdUserInDb = await DataConnectService.createUser(newUserInput);

      if (!createdUserInDb) {
        console.error(`CRITICAL: User authenticated (uid: ${uid}) but failed to create in DB.`);
        return res.status(500).json({ message: 'Failed to create user profile.' });
      }

      console.log(`Nuevo usuario creado en DB con UID: ${createdUserInDb.firebaseUid}`);
      return res.status(201).json({
        message: 'User created successfully!',
        user: {
          uid: newUserInput.firebaseUid,
          email: newUserInput.email,
          name: newUserInput.name,
        }
      });
    }
  } catch (error: unknown) {
    console.error('Error in syncProfileController:', error);
    // Si el error es por un token inválido, devolver 403
    if ((error as { code?: string }).code && (error as { code?: string }).code!.startsWith('auth/')) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    // Cualquier otro error (ej. fallo de conexión con la DB) es un 500
    return res.status(500).json({ message: 'An internal server error occurred.' });
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
