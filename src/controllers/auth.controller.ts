import { Request, Response } from 'express';
import { z } from 'zod';
import * as DataConnectService from '../services/dataConnect.service';
import * as FirebaseService from '../services/firebase.service';
import { AuthProvider, DbUser, Platform } from '../services/dataConnect.types';

// Esquema de validación para el registro
const SignUpSchema = z.object({
  email: z.string().email('Invalid email format.'),
  name: z.string().min(1, 'Name is required.'),
  firebaseUid: z.string().min(1, 'Firebase UID is required.').optional(), // Hacerlo opcional por compatibilidad
});

/**
 * Controlador para registrar un nuevo usuario.
 * Asume que el usuario YA existe en Firebase Auth (creado por el frontend)
 * y solo crea el perfil en la base de datos de Data Connect.
 */
export const signUpController = async (req: Request, res: Response) => {
  try {
    // 1. Validar la entrada usando el esquema Zod
    const { email, name, firebaseUid } = SignUpSchema.parse(req.body);

    // 2. Si no se proporciona el UID, intentar obtenerlo del token de autorización
    let uid = firebaseUid;
    if (!uid) {
      const { authorization } = req.headers;
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({ 
          message: 'Unauthorized: Firebase UID required in body or token in Authorization header.' 
        });
      }
      
      const token = authorization.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
      }

      try {
        const decodedToken = await FirebaseService.verifyFirebaseIdToken(token);
        uid = decodedToken.uid;
        console.log(`Using UID from token: ${uid}`);
      } catch (error: unknown) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ message: 'Invalid Firebase token.' });
      }
    }

    // 3. Verificar que el usuario existe en Firebase Auth
    console.log(`Verifying user exists in Firebase Auth for UID: ${uid}...`);
    let userRecord;
    try {
      userRecord = await FirebaseService.getUserFromAuth(uid);
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'auth/user-not-found') {
        return res.status(404).json({
          message: 'User not found in Firebase Auth. Please ensure the user is created in Firebase first.'
        });
      }
      throw error;
    }
    console.log(`User verified in Firebase Auth: ${userRecord.email}`);

    // 4. Verificar si el usuario ya existe en nuestra base de datos
    const existingUser = await DataConnectService.getUserByFirebaseUid(uid);
    if (existingUser) {
      console.log(`User already exists in database: ${existingUser.email}`);
      return res.status(200).json({
        message: 'User already registered!',
        user: {
          uid: existingUser.firebaseUid,
          email: existingUser.email,
          name: existingUser.name,
        },
      });
    }

    // 5. Crear el registro del usuario en nuestra base de datos (Data Connect)
    console.log(`Creating user profile in Data Connect DB for UID: ${uid}...`);
    const newUserInput: DbUser = {
      firebaseUid: uid,
      email: userRecord.email!,
      name: name || userRecord.displayName || userRecord.email!.split('@')[0],
      authProvider: AuthProvider.EMAIL,
      emailVerified: userRecord.emailVerified,
    };
    const createdUserInDb = await DataConnectService.createUser(newUserInput);

    if (!createdUserInDb) {
      console.error(`CRITICAL: Failed to create user profile in Data Connect DB for UID: ${uid}`);
      return res.status(500).json({ message: 'Failed to create user profile in database.' });
    }
    console.log(`User profile created in Data Connect DB for UID: ${createdUserInDb.firebaseUid}`);

    // 6. Devolver la respuesta
    res.status(201).json({
      message: 'User registered successfully!',
      user: {
        uid: newUserInput.firebaseUid,
        email: newUserInput.email,
        name: newUserInput.name,
      },
    });
  } catch (error: unknown) {
    // Manejar errores de validación de Zod
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ message: errorMessage, errors: error.errors });
    }
    
    // Loguear el error completo para facilitar la depuración
    const errorInfo = error instanceof Error 
      ? { message: error.message, code: (error as any).code, stack: error.stack }
      : { message: String(error), code: undefined, stack: undefined };
    console.error('Error in signUpController:', errorInfo);
    res.status(500).json({ message: 'Internal server error during user registration.' });
  }
};

/**
 * Controlador para manejar el inicio de sesión o registro con proveedores sociales (Google, Apple).
 * El cliente debe enviar el ID Token de Firebase en el header de autorización.
 * Este controlador implementa una lógica de "obtener o crear" (get or create).
 */
export const socialSignInController = async (req: Request, res: Response) => {
  const { authorization } = req.headers;
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Unauthorized: No token provided.' });
  }
  
  const token = authorization.split('Bearer ')[1];
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized: No token provided.' });
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
    console.error('Error in socialSignInController:', error);
    // Si el error es por un token inválido, devolver 403
    if ((error as { code?: string }).code && (error as { code?: string }).code!.startsWith('auth/')) {
      return res.status(403).json({ message: 'Forbidden: Invalid authentication token.' });
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
