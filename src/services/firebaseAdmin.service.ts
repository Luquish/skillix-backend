// src/services/firebaseAdmin.service.ts

import * as admin from 'firebase-admin';
// El config ya no es necesario aquí, la inicialización es centralizada.
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';

const logger = console; // O tu logger configurado

// La inicialización de Firebase Admin ahora se maneja de forma centralizada
// en `src/config/firebaseAdmin.ts`. Ese archivo se importa al inicio de la
// aplicación, garantizando que `admin` esté configurado antes de que se llame
// a cualquier función de este servicio. Por lo tanto, la función `initializeFirebaseAdmin`
// y el flag `firebaseAdminInitialized` se eliminan.

/**
 * Verifica un Firebase ID Token.
 * @param idToken El token JWT enviado por el cliente.
 * @returns Una promesa que se resuelve con el DecodedIdToken si es válido.
 * @throws Error si el token es inválido o hay un problema con la verificación.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  // La comprobación `firebaseAdminInitialized` se elimina. Si el código llega aquí,
  // el SDK ya está inicializado. Si no lo estuviera, la app habría fallado al arrancar.
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
 * Crea un nuevo usuario en Firebase Authentication.
 * @param userData Objeto con los datos del usuario a crear (email, password, displayName).
 * @returns Una promesa que se resuelve con el UserRecord del usuario creado.
 * @throws Error si falla la creación del usuario.
 */
export async function createUserInAuth(
  userData: admin.auth.CreateRequest
): Promise<admin.auth.UserRecord> {
  try {
    const userRecord = await admin.auth().createUser(userData);
    logger.info(`Usuario creado en Firebase Auth con UID: ${userRecord.uid}`);
    return userRecord;
  } catch (error: any) {
    logger.error(`Error creando usuario en Firebase Auth para email ${userData.email}: ${error.code} - ${error.message}`);
    throw error;
  }
}

/**
 * Obtiene los datos de un usuario de Firebase Authentication por su UID.
 * @param uid El UID del usuario a buscar.
 * @returns Una promesa que se resuelve con el UserRecord del usuario.
 * @throws Error si el usuario no se encuentra o hay un problema.
 */
export async function getUserFromAuth(uid: string): Promise<admin.auth.UserRecord> {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord;
  } catch (error: any) {
    logger.error(`Error obteniendo usuario de Firebase Auth con UID ${uid}: ${error.code} - ${error.message}`);
    throw error;
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
  // La comprobación `firebaseAdminInitialized` se elimina.
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
