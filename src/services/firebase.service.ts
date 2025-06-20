import * as admin from 'firebase-admin';
import { DataConnect, getDataConnect } from 'firebase-admin/data-connect';
import { getConfig } from '../config'; // Ajustada la ruta de importación
import * as path from 'path';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';

const config = getConfig();
const logger = console; // O tu logger configurado
let dataConnectInstance: DataConnect | null = null;

// --- CONSTANTES DE CONFIGURACIÓN ---
const IS_EMULATOR = process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.NODE_ENV === 'test';
const DATA_CONNECT_SERVICE_ID = 'skillix-db-service';
const DATA_CONNECT_LOCATION = 'us-central1';

function initialize() {
  // Inicializa la app de admin si no existe.
  if (admin.apps.length === 0) {
    try {
      const serviceAccountPath = path.resolve(process.cwd(), config.firebaseServiceAccountPath);
      logger.log(`Firebase Admin SDK: Initializing with service account file from path: ${serviceAccountPath}`);
      const credential = admin.credential.cert(serviceAccountPath);
      admin.initializeApp({ credential });
      logger.log('Firebase Admin App initialized successfully (default app).');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('CRITICAL: Failed to initialize Firebase Admin SDK.', errorMessage);
      return; // No continuar si falla la inicialización de admin
    }
  }

  // Una vez que la app de admin está garantizada, inicializamos DataConnect si no lo hemos hecho ya.
  if (!dataConnectInstance) {
    try {
      dataConnectInstance = getDataConnect({
        serviceId: DATA_CONNECT_SERVICE_ID,
        location: DATA_CONNECT_LOCATION,
      });
      logger.log(`Firebase Data Connect SDK initialized for service: ${DATA_CONNECT_SERVICE_ID} in ${DATA_CONNECT_LOCATION}`);
      if (IS_EMULATOR) {
        logger.log(`Firebase Data Connect: Emulator detected. The SDK will connect to the emulator.`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize Firebase Data Connect SDK:', errorMessage);
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
 * Verifica un Firebase ID Token.
 * @param idToken El token JWT enviado por el cliente.
 * @returns Una promesa que se resuelve con el DecodedIdToken si es válido.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
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

// Exportar el namespace 'admin' para acceder a otros servicios de Firebase si es necesario.
export { admin }; 