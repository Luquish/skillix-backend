import axios from 'axios';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'test-api-key';
// Configurar el host del emulador de auth basado en firebase.json (puerto 9099)
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
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }


  
  const userRecord = await admin.auth().createUser({ email, password });



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

