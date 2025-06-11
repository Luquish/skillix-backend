// src/services/firebaseAdmin.service.ts

import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';
import { CreateRequest, UserRecord } from 'firebase-admin/auth';
import { Message, getMessaging } from 'firebase-admin/messaging';
// Importamos los servicios específicos ya inicializados desde nuestra configuración central
import { auth } from '../config/firebaseAdmin'; 

const logger = console; // O tu logger configurado

/**
 * Verifica un Firebase ID Token.
 * @param idToken El token JWT enviado por el cliente.
 * @returns Una promesa que se resuelve con el DecodedIdToken si es válido.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  try {
    // Usamos 'auth' directamente, que es el servicio ya inicializado
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error: any) {
    logger.warn(`Error verificando Firebase ID Token: ${error.code} - ${error.message}`);
    throw error;
  }
}

/**
 * Crea un nuevo usuario en Firebase Authentication.
 * @param userData Objeto con los datos del usuario a crear.
 * @returns Una promesa que se resuelve con el UserRecord del usuario creado.
 */
export async function createUserInAuth(
  userData: CreateRequest
): Promise<UserRecord> {
  try {
    const userRecord = await auth.createUser(userData);
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
 */
export async function getUserFromAuth(uid: string): Promise<UserRecord> {
  try {
    const userRecord = await auth.getUser(uid);
    return userRecord;
  } catch (error: any) {
    logger.error(`Error obteniendo usuario de Firebase Auth con UID ${uid}: ${error.code} - ${error.message}`);
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

  const message: Message = {
    notification: {
      title,
      body,
    },
    data: data || {},
    token: deviceToken,
  };

  try {
    // getMessaging() obtiene el servicio de mensajería del app inicializada por defecto
    const response = await getMessaging().send(message);
    logger.info(`Notificación FCM enviada exitosamente a token ${deviceToken.substring(0,20)}... : ${response}`);
    return true;
  } catch (error: any) {
    logger.error(`Error enviando notificación FCM al token ${deviceToken.substring(0,20)}...: ${error.code} - ${error.message}`);
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-registration-token') {
      logger.info(`Token FCM inválido o no registrado: ${deviceToken}. Debería ser eliminado de la base de datos.`);
    }
    return false;
  }
}
