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
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

// ✅ Convertir localhost a 127.0.0.1 para compatibilidad con emulador
const normalizedHost = AUTH_EMULATOR_HOST.replace('localhost', '127.0.0.1');

// ✅ URL correcta para el emulador de Firebase Auth (basado en documentación)
const AUTH_EMULATOR_URL = `http://${normalizedHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword`;

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
  try {
    console.log('🧪 [AUTH HELPER] Starting user creation...');
    console.log('🧪 [AUTH HELPER] Email:', email);
    
    // firebase.service.ts ya inicializó Firebase Admin SDK con configuración de emulador
    console.log('🧪 [AUTH HELPER] Creating user with Firebase Admin SDK...');
    const userRecord = await admin.auth().createUser({ email, password });
    console.log('🧪 [AUTH HELPER] User created successfully, UID:', userRecord.uid);

    // En lugar de usar custom tokens, usamos directamente signInWithPassword
    console.log('🧪 [AUTH HELPER] Signing in with email/password...');
    const response = await axios.post(
      AUTH_EMULATOR_URL,
      {
        email,
        password,
        returnSecureToken: true
      },
      {
        params: { key: FIREBASE_WEB_API_KEY }
      }
    );

    console.log('🧪 [AUTH HELPER] ID token received, length:', response.data.idToken?.length || 'null');
    return { uid: userRecord.uid, token: response.data.idToken };
  } catch (error: any) {
    console.error('❌ [AUTH HELPER] Error creating test user and token:', error.message);
    console.error('❌ [AUTH HELPER] Full error:', error);
    throw error;
  }
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

