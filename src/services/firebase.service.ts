import * as admin from 'firebase-admin';
import { DataConnect, getDataConnect as getDataConnectAdmin } from 'firebase-admin/data-connect';
import { getConfig } from '../config';
import * as path from 'path';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';

const config = getConfig();
import logger from '../utils/logger';
let dataConnectInstance: DataConnect | null = null;

// --- CONSTANTES DE CONFIGURACIÓN ---
const IS_EMULATOR = !!(process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.NODE_ENV === 'test');
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;

// Use configuration values for Data Connect service to allow environment based
// customization. Defaults are provided for local development.
const DATA_CONNECT_SERVICE_ID = config.dataConnectServiceId || 'skillix-db-service';
const DATA_CONNECT_LOCATION = config.dataConnectLocation || 'us-central1';

function initialize() {
    // Inicializa la app de admin si no existe.
  if (admin.apps.length === 0) {
    try {
      // Configuración específica para emuladores vs producción
      if (IS_EMULATOR) {
        logger.info('🧪 Firebase Admin SDK: Initializing for EMULATOR environment');
        
        // En entorno de emulador, podemos usar credenciales simplificadas
        admin.initializeApp({
          projectId: config.firebaseProjectId || 'skillix-db',
          // No necesitamos service account en emulador
        });
        
        // Configurar emulador de auth si está disponible
        if (AUTH_EMULATOR_HOST) {
          logger.info(`🧪 Firebase Auth Emulator detected at: ${AUTH_EMULATOR_HOST}`);
          // Firebase Admin SDK detecta automáticamente el emulador por la variable de entorno
        }
        
        logger.info('✅ Firebase Admin App initialized successfully for EMULATOR (default app)');
      } else {
        logger.info('🚀 Firebase Admin SDK: Initializing for PRODUCTION environment');
        
        const serviceAccountPath = path.resolve(process.cwd(), config.firebaseServiceAccountPath);
        logger.info(`🔑 Using service account file from path: ${serviceAccountPath}`);
        
        const credential = admin.credential.cert(serviceAccountPath);
        admin.initializeApp({ 
          credential,
          projectId: config.firebaseProjectId 
        });
        
        logger.info('✅ Firebase Admin App initialized successfully for PRODUCTION (default app)');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ CRITICAL: Failed to initialize Firebase Admin SDK', { 
        error: errorMessage,
        isEmulator: IS_EMULATOR,
        authEmulatorHost: AUTH_EMULATOR_HOST 
      });
      return; // No continuar si falla la inicialización de admin
    }
  }

  // Inicializar Firebase Data Connect usando Admin SDK
  if (!dataConnectInstance) {
    try {
      dataConnectInstance = getDataConnectAdmin({
        serviceId: DATA_CONNECT_SERVICE_ID,
        location: DATA_CONNECT_LOCATION,
      });
      
      logger.info(`✅ Firebase Data Connect Admin SDK initialized for service: ${DATA_CONNECT_SERVICE_ID} in ${DATA_CONNECT_LOCATION}`);
      if (IS_EMULATOR) {
        logger.info('🧪 Firebase Data Connect: Emulator mode detected. The SDK will connect to the emulator automatically.');
      } else {
        logger.info('🚀 Firebase Data Connect: Production mode - connecting to live service');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Failed to initialize Firebase Data Connect Admin SDK:', errorMessage);
    }
  }
}

// Se llama a la inicialización al cargar el módulo para garantizar que esté listo.
initialize();

// --- FUNCIONES EXPORTADAS ---

/**
 * Obtiene la instancia de DataConnect.
 * @returns La instancia de DataConnect.
 * @throws Error si la instancia no ha sido inicializada.
 */
export function getDb(): DataConnect {
  if (!dataConnectInstance) {
    throw new Error('DataConnect instance has not been initialized. Check Firebase Admin SDK setup.');
  }
  return dataConnectInstance;
}

/**
 * Alias para getDb() - Obtiene la instancia de DataConnect.
 * @returns La instancia de DataConnect.
 * @throws Error si la instancia no ha sido inicializada.
 */
export function getDataConnect(): DataConnect {
  return getDb();
}

/**
 * Verifica un Firebase ID Token.
 * @param idToken El token JWT enviado por el cliente.
 * @returns Una promesa que se resuelve con el DecodedIdToken si es válido.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  try {
    console.log('🔍 DEBUG - Token verification:');
    console.log('- Token (first 50 chars):', idToken?.substring(0, 50));
    console.log('- Is Emulator Mode:', IS_EMULATOR);
    console.log('- Auth Emulator Host:', AUTH_EMULATOR_HOST);
    
    // ✅ En modo emulador, Firebase Admin SDK debe aceptar tanto ID tokens como custom tokens
    // checkRevoked = false para emulador permite custom tokens
    const decodedToken = await admin.auth().verifyIdToken(idToken, !IS_EMULATOR);
    console.log('✅ Token verified successfully');
    console.log('- Token UID:', decodedToken.uid);
    console.log('- Token audience:', decodedToken.aud);
    console.log('- Token issuer:', decodedToken.iss);
    return decodedToken;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.log('❌ Token verification failed:', err.code, err.message);
    
    // ✅ En modo emulador, dar más información de debug para custom tokens
    if (IS_EMULATOR) {
      console.log('🧪 [EMULATOR] Additional debug info:');
      console.log('- Token appears to be:', idToken?.includes('ey') ? 'JWT format' : 'Unknown format');
      console.log('- Expected project ID:', config.firebaseProjectId);
    }
    
    logger.warn(`Error verificando Firebase ID Token: ${err.code} - ${err.message}`);
    throw error;
  }
}

/**
 * Crea un nuevo usuario en Firebase Authentication.
 * @param userData Objeto con los datos del usuario a crear.
 * @returns Una promesa que se resuelve con el UserRecord del usuario creado.
 */
export async function createUserInAuth(
  userData: admin.auth.CreateRequest
): Promise<admin.auth.UserRecord> {
  try {
    const userRecord = await admin.auth().createUser(userData);
    logger.info(`Usuario creado en Firebase Auth con UID: ${userRecord.uid}`);
    return userRecord;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    logger.error(`Error creando usuario en Firebase Auth para email ${userData.email}: ${err.code} - ${err.message}`);
    throw error;
  }
}

/**
 * Obtiene los datos de un usuario de Firebase Authentication por su UID.
 * @param uid El UID del usuario a buscar.
 * @returns Una promesa que se resuelve con el UserRecord del usuario.
 */
export async function getUserFromAuth(uid: string): Promise<admin.auth.UserRecord> {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    logger.error(`Error obteniendo usuario de Firebase Auth con UID ${uid}: ${err.code} - ${err.message}`);
    throw error;
  }
}

/**
 * Envía una notificación push a través de Firebase Cloud Messaging (FCM).
 * @param deviceToken El token FCM del dispositivo de destino.
 * @param title El título de la notificación.
 * @param body El cuerpo del mensaje de la notificación.
 * @param data Datos adicionales opcionales.
 * @returns true si el mensaje fue enviado exitosamente, false en caso contrario.
 */
export async function sendFcmNotification(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!deviceToken) {
    logger.warn("No se proporcionó deviceToken para enviar FCM.");
    return false;
  }

  const message: admin.messaging.Message = {
    notification: {
      title,
      body,
    },
    data: data || {},
    token: deviceToken,
  };

  try {
    const response = await admin.messaging().send(message);
    logger.info(`Notificación FCM enviada exitosamente a token ${deviceToken.substring(0,20)}... : ${response}`);
    return true;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    logger.error(`Error enviando notificación FCM al token ${deviceToken.substring(0,20)}...: ${err.code} - ${err.message}`);
    if (err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token') {
      logger.info(`Token FCM inválido o no registrado: ${deviceToken}. Debería ser eliminado de la base de datos.`);
    }
    return false;
  }
}

/**
 * Elimina un usuario de Firebase Authentication por su UID.
 * @param uid El UID del usuario a eliminar.
 * @returns Una promesa que se resuelve cuando el usuario es eliminado.
 */
export async function deleteFirebaseUser(uid: string): Promise<void> {
  try {
    await admin.auth().deleteUser(uid);
    logger.info(`Usuario con UID ${uid} eliminado de Firebase Auth exitosamente.`);
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    logger.error(`Error eliminando usuario de Firebase Auth con UID ${uid}: ${err.code} - ${err.message}`);
    // No relanzar el error si el usuario no existe, ya que el objetivo es que no esté.
    if (err.code === 'auth/user-not-found') {
      logger.warn(`Intento de eliminar usuario no encontrado en Firebase Auth (UID: ${uid}). Se considera exitoso.`);
      return;
    }
    throw error;
  }
}

// Exportar el namespace 'admin' para acceder a otros servicios de Firebase si es necesario.
export { admin }; 