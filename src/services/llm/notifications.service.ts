// src/services/notifications.service.ts

import { UserAnalytics } from './schemas';
import { getSkiMotivationalMessage } from './toviTheFox.service';
import { UserDataForContent } from './contentGenerator.service';
import { sendFcmNotification } from '@/services/firebase.service';
import { getUserDeviceTokens } from '@/services/dataConnect.service';

const logger = console; // O tu logger configurado

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>; // Datos adicionales para la notificación (deep linking, etc.)
}

export class NotificationService {
  constructor() {
    // Podrías inyectar el servicio de Firebase Admin aquí si es necesario
    logger.info("NotificationService inicializado.");
  }

  private async prepareNotificationFromAnalytics(
    userIdInternalDb: string, // Tu ID de usuario de la base de datos, no firebaseUid
    userAnalytics: UserAnalytics,
    userContext?: Partial<UserDataForContent> // Para personalizar mensajes de Ski
  ): Promise<NotificationPayload | null> {
    let title = "🔔 Skillix Recordatorio!";
    let body = "Es un buen momento para continuar tu aprendizaje.";
    const data: Record<string, string> = { type: "learning_reminder" };

    // 1. Usar OptimalLearningTime
    if (userAnalytics.optimal_learning_time_start && userAnalytics.optimal_learning_time_end) {
      title = `🧠 Tu momento óptimo para aprender en Skillix!`;
      body = `Según tus patrones, ¡ahora (${userAnalytics.optimal_learning_time_start} - ${userAnalytics.optimal_learning_time_end}) es un gran momento para aprender ${userContext?.skill || 'algo nuevo'}! ${userAnalytics.optimal_learning_time_reasoning?.toLowerCase() || ''}`;
      data.deep_link = "home_screen"; // Ejemplo
    }

    // 2. Usar StreakMaintenance para mensajes más específicos
    if (userAnalytics.streak_risk_level) {
      if (userAnalytics.streak_risk_level === "high" && userAnalytics.streak_intervention_strategies && userAnalytics.streak_intervention_strategies.length > 0) {
        title = "🚀 ¡No dejes que tu racha se apague!";
        // Podríamos usar Ski para generar un mensaje aquí basado en las estrategias
        const skiInput = {
            userContext: { name: userContext?.name, skill: userContext?.skill },
            situation: "custom_prompt" as const,
            customPromptDetails: `El usuario tiene un riesgo alto de perder su racha. Estrategia sugerida: ${userAnalytics.streak_intervention_strategies[0]}. Genera un mensaje corto y motivador de Ski.`
        };
        const skiMsg = await getSkiMotivationalMessage(skiInput);
        body = skiMsg?.message || userAnalytics.streak_intervention_strategies[0]; // Fallback a la estrategia
        data.type = "streak_saver_reminder";
      } else if (userAnalytics.streak_risk_level === "medium") {
        body = `¡Sigue con tu racha de aprendizaje! ${userAnalytics.streak_intervention_strategies?.[0] || 'Un poco cada día hace una gran diferencia.'}`;
        data.type = "streak_maintenance_reminder";
      }
    }
    
    // 3. (Opcional) Usar key_insights para un mensaje más general si los anteriores no aplican
    if (body === "Es un buen momento para continuar tu aprendizaje." && userAnalytics.key_insights.length > 0) {
        body = userAnalytics.key_insights[0]; // Tomar el primer insight clave
    }

    // TODO: Considerar la localización si tu app soporta múltiples idiomas.

    return { title, body, data };
  }

  /**
   * Envía una notificación de recordatorio de aprendizaje basada en el análisis del usuario.
   * @param userIdInternalDb El ID interno del usuario en tu base de datos.
   * @param userAnalytics El objeto UserAnalytics con los insights.
   * @param userContext Contexto adicional del usuario para personalizar mensajes.
   * @returns true si al menos una notificación fue enviada exitosamente, false en caso contrario.
   */
  public async sendLearningReminderNotification(
    userIdInternalDb: string,
    userAnalytics: UserAnalytics,
    userContext?: Partial<UserDataForContent>
  ): Promise<boolean> {
    const deviceTokens = await getUserDeviceTokens(userIdInternalDb); // Necesitas implementar esto en dataConnect.service.ts
    if (!deviceTokens || deviceTokens.length === 0) {
      logger.warn(`No se encontraron tokens de dispositivo para el usuario ID: ${userIdInternalDb}. No se puede enviar notificación.`);
      return false;
    }

    const notificationPayload = await this.prepareNotificationFromAnalytics(userIdInternalDb, userAnalytics, userContext);

    if (!notificationPayload) {
      logger.warn(`No se pudo preparar el payload de notificación para el usuario ID: ${userIdInternalDb}.`);
      return false;
    }

    logger.info(`Enviando notificación de recordatorio a usuario ID: ${userIdInternalDb}. Título: ${notificationPayload.title}`);

    let allSentSuccessfully = true;
    for (const token of deviceTokens) {
      const success = await sendFcmNotification(
        token,
        notificationPayload.title,
        notificationPayload.body,
        notificationPayload.data
      );
      if (!success) {
        allSentSuccessfully = false;
        logger.error(`Fallo al enviar notificación FCM al token: ${token} para el usuario ID: ${userIdInternalDb}`);
        // TODO: Manejar tokens inválidos/caducados (ej. eliminarlos de la DB).
      }
    }
    return allSentSuccessfully;
  }

  /**
   * Envía una notificación de felicitación por completar un día/sección o alcanzar un hito.
   * @param userIdInternalDb El ID interno del usuario en tu base de datos.
   * @param achievement El logro (ej. "completaste el Día 5 de Python!").
   * @param userContext Contexto del usuario para personalizar el mensaje de Ski.
   * @returns true si al menos una notificación fue enviada exitosamente, false en caso contrario.
   */
  public async sendAchievementNotification(
    userIdInternalDb: string,
    achievement: string,
    userContext: Partial<UserDataForContent> & { name?: string }
  ): Promise<boolean> {
    const deviceTokens = await getUserDeviceTokens(userIdInternalDb);
     if (!deviceTokens || deviceTokens.length === 0) {
      logger.warn(`No se encontraron tokens de dispositivo para el usuario ID: ${userIdInternalDb}. No se puede enviar notificación de logro.`);
      return false;
    }

    const skiInput = {
        userContext: { name: userContext?.name, skill: userContext?.skill },
        situation: "milestone_achieved" as const, // o "task_completion"
        customPromptDetails: `El usuario ${userContext.name || 'Learner'} acaba de lograr lo siguiente: ${achievement}. Genera un mensaje de felicitación corto y entusiasta de Ski.`
    };
    const skiMsg = await getSkiMotivationalMessage(skiInput);

    const title = skiMsg ? "🎉 ¡Felicidades!" : "¡Gran Trabajo!";
    const body = skiMsg?.message || `¡Has logrado: ${achievement}! Sigue así.`;
    const data: Record<string, string> = { type: "achievement_notification", achievement_details: achievement };

    logger.info(`Enviando notificación de logro a usuario ID: ${userIdInternalDb}. Logro: ${achievement}`);
    
    let allSentSuccessfully = true;
    for (const token of deviceTokens) {
      const success = await sendFcmNotification(token, title, body, data);
      if (!success) {
        allSentSuccessfully = false;
        logger.error(`Fallo al enviar notificación de logro FCM al token: ${token} para el usuario ID: ${userIdInternalDb}`);
      }
    }
    return allSentSuccessfully;
  }
}

// Exportar una instancia singleton si se prefiere, o permitir que se instancie donde se necesite.
// export const notificationService = new NotificationService();
