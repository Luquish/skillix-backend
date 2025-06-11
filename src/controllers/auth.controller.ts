import { Request, Response } from 'express';
import { z } from 'zod';
import * as DataConnectService from '../services/dataConnect.service';
import * as FirebaseAdminService from '../services/firebaseAdmin.service';
import { AuthProvider, Platform } from '../services/dataConnect.types';

// Esquema de validación para el registro
const SignUpSchema = z.object({
  email: z.string().email('Invalid email format.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  name: z.string().min(1, 'Name is required.'),
  platform: z.enum(['IOS', 'ANDROID', 'WEB', 'UNKNOWN']).optional().default('UNKNOWN'),
});

/**
 * Controlador para registrar un nuevo usuario.
 * Crea el usuario en Firebase Auth y luego en la base de datos de Data Connect.
 */
export const signUpController = async (req: Request, res: Response) => {
  try {
    // 1. Validar la entrada usando el esquema Zod
    const { email, password, name } = SignUpSchema.parse(req.body);

    // 2. Crear el usuario en Firebase Authentication usando el servicio centralizado
    console.log(`Creating user in Firebase Auth for email: ${email}...`);
    const userRecord = await FirebaseAdminService.createUserInAuth({
      email,
      password,
      displayName: name,
    });
    console.log(`User created in Firebase Auth with UID: ${userRecord.uid}.`);

    // 3. Crear el registro del usuario en nuestra base de datos (Data Connect)
    console.log(`Creating user profile in Data Connect DB for UID: ${userRecord.uid}...`);
    const newUserInput: DataConnectService.CreateUserInputForService = {
      firebaseUid: userRecord.uid,
      email: userRecord.email!,
      name: userRecord.displayName,
      authProvider: 'EMAIL',
      emailVerified: userRecord.emailVerified,
    };
    const createdUserInDb = await DataConnectService.createUser(newUserInput);

    if (!createdUserInDb) {
      // Este es un caso problemático: el usuario existe en Auth pero no en nuestra DB.
      // Se podría añadir una lógica para reintentar o limpiar.
      console.error(`CRITICAL: User created in Auth (uid: ${userRecord.uid}) but failed to create in Data Connect DB.`);
      return res.status(500).json({ message: 'User authenticated but failed to create profile.' });
    }
    console.log(`User profile created in Data Connect DB with ID: ${createdUserInDb.id}`);

    // 4. Devolver la respuesta (sin incluir la contraseña)
    res.status(201).json({
      message: 'User created successfully!',
      user: {
        id: createdUserInDb.id,
        uid: createdUserInDb.firebaseUid,
        email: createdUserInDb.email,
        name: createdUserInDb.name,
      },
    });
  } catch (error: any) {
    // Manejar errores de validación de Zod
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ message: errorMessage, errors: error.errors });
    }
    // Manejar errores de Firebase Auth
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ message: 'The email address is already in use by another account.' });
    }
    if (error.code && error.code.startsWith('auth/')) {
        return res.status(400).json({ message: error.message || 'An authentication error occurred.' });
    }
    // Loguear el error completo para facilitar la depuración
    console.error('Error in signUpController:', error.message, { code: error.code, stack: error.stack });
    res.status(500).json({ message: 'Internal server error during sign-up.' });
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
    const decodedToken = await FirebaseAdminService.verifyFirebaseIdToken(token);
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
        authProvider = 'GOOGLE';
      } else if (providerId === 'apple.com') {
        authProvider = 'APPLE';
      } else {
        // En el flujo de sign-up con email, el proveedor no viene en el token de la misma forma.
        // Pero para el social sign-in, este es el fallback. Usaremos 'EMAIL' según la definición de tipo.
        authProvider = 'EMAIL';
      }

      const newUserInput: DataConnectService.CreateUserInputForService = {
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

      console.log(`Nuevo usuario creado en DB con ID: ${createdUserInDb.id}`);
      return res.status(201).json({
        message: 'User created successfully!',
        user: {
          id: createdUserInDb.id,
          uid: createdUserInDb.firebaseUid,
          email: createdUserInDb.email,
          name: createdUserInDb.name,
        }
      });
    }
  } catch (error: any) {
    console.error('Error in socialSignInController:', error);
    // Si el error es por un token inválido, devolver 403
    if (error.code && error.code.startsWith('auth/')) {
      return res.status(403).json({ message: 'Forbidden: Invalid authentication token.' });
    }
    // Cualquier otro error (ej. fallo de conexión con la DB) es un 500
    return res.status(500).json({ message: 'An internal server error occurred.' });
  }
};
