// src/services/firebaseAdmin.service.ts

import * as admin from 'firebase-admin';
import { getConfig } from '../config'; // Para obtener la ruta al service account key si se usa
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';

const config = getConfig();
const logger = console; // O tu logger configurado

let firebaseAdminInitialized = false;

/**
 * Inicializa el Firebase Admin SDK.
 * Debe llamarse una sola vez al inicio de la aplicación.
 */
export function initializeFirebaseAdmin(): void {
  if (admin.apps.length > 0) {
    firebaseAdminInitialized = true;
    logger.info('Firebase Admin SDK ya está inicializado.');
    return;
  }

  try {
    const serviceAccountPath = config.firebaseServiceAccountPath; // De tu config/index.ts

    if (serviceAccountPath) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const serviceAccount = require(serviceAccountPath); // Cargar el JSON
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // databaseURL: config.firebaseDatabaseUrl, // Si usas Realtime Database
        // storageBucket: config.firebaseStorageBucket, // Si usas Storage
      });
      logger.info('Firebase Admin SDK inicializado con archivo de cuenta de servicio.');
    } else {
      // Si no hay path, intenta usar GOOGLE_APPLICATION_CREDENTIALS o ADC
      // Esto es lo común para entornos como Cloud Run, Cloud Functions
      admin.initializeApp();
      logger.info('Firebase Admin SDK inicializado con credenciales de entorno (ADC o GOOGLE_APPLICATION_CREDENTIALS).');
    }
    firebaseAdminInitialized = true;
  } catch (error: any) {
    logger.error('Error CRÍTICO al inicializar Firebase Admin SDK:', error.message);
    // Considera si la aplicación debe fallar al iniciar si esto no funciona.
    firebaseAdminInitialized = false;
  }
}

/**
 * Verifica un Firebase ID Token.
 * @param idToken El token JWT enviado por el cliente.
 * @returns Una promesa que se resuelve con el DecodedIdToken si es válido.
 * @throws Error si el token es inválido o hay un problema con la verificación.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  if (!firebaseAdminInitialized) {
    logger.error("Intento de verificar token, pero Firebase Admin SDK no está inicializado.");
    throw new Error('Servicio de autenticación no disponible.');
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error: any) {
    logger.warn(`Error verificando Firebase ID Token: ${error.code} - ${error.message}`);
    // Mapear errores específicos de Firebase a errores HTTP si esto fuera un controlador,
    // pero como es un servicio, relanzar o devolver un error específico.
    throw error; // Relanzar para que el llamador lo maneje
  }
}

/**
 * Envía una notificación push a través de Firebase Cloud Messaging (FCM) a un token de dispositivo.
 * @param deviceToken El token FCM del dispositivo de destino.
 * @param title El título de la notificación.
 * @param body El cuerpo del mensaje de la notificación.
 * @param data Datos adicionales opcionales para enviar con la notificación (deep linking, etc.).
 * @returns true si el mensaje fue enviado exitosamente (o al menos aceptado por FCM), false en caso contrario.
 */
export async function sendFcmNotification(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!firebaseAdminInitialized) {
    logger.error("Intento de enviar FCM, pero Firebase Admin SDK no está inicializado.");
    return false;
  }
  if (!deviceToken) {
    logger.warn("No se proporcionó deviceToken para enviar FCM.");
    return false;
  }

  const message: admin.messaging.Message = {
    notification: {
      title,
      body,
    },
    data: data || {}, // FCM requiere que 'data' sea un objeto de strings
    token: deviceToken,
    // Puedes añadir opciones de Android/APNS/Webpush aquí si es necesario
    // apns: { ... },
    // android: { ... },
  };

  try {
    const response = await admin.messaging().send(message);
    logger.info(`Notificación FCM enviada exitosamente a token ${deviceToken.substring(0,20)}... : ${response}`);
    return true;
  } catch (error: any) {
    logger.error(`Error enviando notificación FCM al token ${deviceToken.substring(0,20)}...: ${error.code} - ${error.message}`);
    // Aquí podrías manejar errores específicos de FCM, como 'messaging/registration-token-not-registered'
    // para limpiar tokens inválidos de tu base de datos.
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-registration-token') {
      logger.info(`Token FCM inválido o no registrado: ${deviceToken}. Debería ser eliminado de la base de datos.`);
      // TODO: Implementar lógica para eliminar/marcar token como inválido en tu DB.
    }
    return false;
  }
}

// Podrías añadir otras funciones de Firebase Admin aquí, como:
// - Obtener datos de usuario por UID: admin.auth().getUser(uid)
// - Crear custom tokens: admin.auth().createCustomToken(uid)
// - etc.

// Es importante llamar a initializeFirebaseAdmin() una vez al inicio de tu aplicación,
// por ejemplo, en tu archivo principal app.ts o server.ts.
// Ejemplo:
// import { initializeFirebaseAdmin } from './services/firebaseAdmin.service';
// initializeFirebaseAdmin();
// ... resto de tu app setup ...
