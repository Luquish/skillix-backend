import * as dotenv from 'dotenv';

// Cargar configuración de entorno ANTES que nada
dotenv.config();

import axios from 'axios';
import * as admin from 'firebase-admin';
import { getConfig } from '../../src/config';

// Obtener configuración desde el sistema centralizado
const config = getConfig();

// Importar firebase.service.ts DESPUÉS de configurar variables de entorno
import '../../src/services/firebase.service';

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'test-api-key';
// Usar configuración centralizada para el emulador de auth
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
const AUTH_EMULATOR_URL = `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword`;

export interface TestUserAuth {
  uid: string;
  token: string;
}

/**
 * Crea un usuario en el emulador de Firebase Auth y devuelve su UID y token de sesión.
 */
export const createTestUserAndGetToken = async (
  email: string,
  password = 'password123'
): Promise<TestUserAuth> => {
  // firebase.service.ts ya inicializó Firebase Admin SDK con configuración de emulador

  // Crear usuario usando Firebase Admin SDK
  const userRecord = await admin.auth().createUser({ email, password });

  // Obtener ID token del emulador usando Web API
  const response = await axios.post(
    AUTH_EMULATOR_URL,
    { email, password, returnSecureToken: true },
    {
      params: { key: FIREBASE_WEB_API_KEY },
    }
  );

  return { uid: userRecord.uid, token: response.data.idToken };
};

/**
 * Inicia sesión en el emulador con las credenciales indicadas y devuelve un token.
 */
export const getTestUserAuthToken = async (
  email: string,
  password = 'password123'
): Promise<string | null> => {
  try {
    const response = await axios.post(
      AUTH_EMULATOR_URL,
      {
        email,
        password,
        returnSecureToken: true,
      },
      {
        params: { key: FIREBASE_WEB_API_KEY },
      }
    );
    return response.data.idToken;
  } catch (error: any) {

    return null;
  }
};

