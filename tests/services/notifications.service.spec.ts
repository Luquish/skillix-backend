import { NotificationService } from '../../src/services/llm/notifications.service';
import { getSkiMotivationalMessage } from '../../src/services/llm/toviTheFox.service';
import { sendFcmNotification } from '../../src/services/firebase.service';
import { getUserDeviceTokens } from '../../src/services/dataConnect.service';

// Mock de todas las dependencias
jest.mock('../../src/services/llm/toviTheFox.service');
jest.mock('../../src/services/firebase.service');
jest.mock('../../src/services/dataConnect.service');

const mockGetSkiMotivationalMessage = getSkiMotivationalMessage as jest.MockedFunction<typeof getSkiMotivationalMessage>;
const mockSendFcmNotification = sendFcmNotification as jest.MockedFunction<typeof sendFcmNotification>;
const mockGetUserDeviceTokens = getUserDeviceTokens as jest.MockedFunction<typeof getUserDeviceTokens>;

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = new NotificationService();
  });

  describe('sendLearningReminderNotification', () => {
    const mockUserAnalytics = {
      optimal_learning_time_start: "09:00",
      optimal_learning_time_end: "11:00",
      optimal_learning_time_reasoning: "Alta concentración matutina",
      content_difficulty_recommendation: "maintain",
      ideal_session_length_minutes: 25,
      streak_risk_level: "low" as const,
      streak_intervention_strategies: ["morning_reminder", "progress_celebration"],
      overall_engagement_score: 0.85,
      key_insights: [
        "Usuario altamente comprometido",
        "Aprende mejor por las mañanas",
        "Prefiere ejercicios prácticos"
      ]
    };

    const mockUserContext = {
      name: 'Ana Martínez',
      skill: 'React Development',
      experience: 'INTERMEDIATE',
      time: '30 minutes daily',
    };

    it('debería enviar notificación de recordatorio exitosamente', async () => {
      // Arrange
      const mockDeviceTokens = ['token-123', 'token-456'];
      mockGetUserDeviceTokens.mockResolvedValue(mockDeviceTokens);
      mockSendFcmNotification.mockResolvedValue(true);

      // Act
      const result = await notificationService.sendLearningReminderNotification(
        'user-123',
        mockUserAnalytics,
        mockUserContext
      );

      // Assert
      expect(result).toBe(true);
      expect(mockGetUserDeviceTokens).toHaveBeenCalledWith('user-123');
      expect(mockSendFcmNotification).toHaveBeenCalledTimes(2);
      expect(mockSendFcmNotification).toHaveBeenCalledWith(
        'token-123',
        expect.stringContaining('🧠'),
        expect.stringContaining('09:00'),
        expect.objectContaining({
          type: 'learning_reminder',
          deep_link: 'home_screen'
        })
      );
    });

    it('debería usar estrategias de intervención para usuarios con alto riesgo de churn', async () => {
      // Arrange
      const highRiskAnalytics = {
        ...mockUserAnalytics,
        streak_risk_level: "high" as const,
        streak_intervention_strategies: ["personalized_encouragement", "easier_content"],
      };

      const mockDeviceTokens = ['token-123'];
      const mockSkiMessage = {
        message: "¡Hola Ana! 🦊 No dejes que tu racha se pierda. Recuerda que cada pequeño paso cuenta.",
        emoji_style: 'supportive' as const,
        animation_suggestion: 'encouraging_nod'
      };

      mockGetUserDeviceTokens.mockResolvedValue(mockDeviceTokens);
      mockGetSkiMotivationalMessage.mockResolvedValue(mockSkiMessage);
      mockSendFcmNotification.mockResolvedValue(true);

      // Act
      const result = await notificationService.sendLearningReminderNotification(
        'user-456',
        highRiskAnalytics,
        mockUserContext
      );

      // Assert
      expect(result).toBe(true);
      expect(mockGetSkiMotivationalMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          situation: "custom_prompt",
          customPromptDetails: expect.stringContaining("personalized_encouragement")
        })
      );
      expect(mockSendFcmNotification).toHaveBeenCalledWith(
        'token-123',
        "🚀 ¡No dejes que tu racha se apague!",
        mockSkiMessage.message,
        expect.objectContaining({
          type: "streak_saver_reminder"
        })
      );
    });

    it('debería manejar notificaciones para riesgo medio de streak', async () => {
      // Arrange
      const mediumRiskAnalytics = {
        ...mockUserAnalytics,
        streak_risk_level: "medium" as const,
        streak_intervention_strategies: ["gentle_reminder", "progress_highlight"],
      };

      const mockDeviceTokens = ['token-789'];
      mockGetUserDeviceTokens.mockResolvedValue(mockDeviceTokens);
      mockSendFcmNotification.mockResolvedValue(true);

      // Act
      const result = await notificationService.sendLearningReminderNotification(
        'user-789',
        mediumRiskAnalytics,
        mockUserContext
      );

      // Assert
      expect(result).toBe(true);
      expect(mockSendFcmNotification).toHaveBeenCalledWith(
        'token-789',
        expect.any(String),
        expect.stringContaining('gentle_reminder'),
        expect.objectContaining({
          type: "streak_maintenance_reminder"
        })
      );
    });

    it('debería devolver false cuando no hay tokens de dispositivo', async () => {
      // Arrange
      mockGetUserDeviceTokens.mockResolvedValue([]);

      // Act
      const result = await notificationService.sendLearningReminderNotification(
        'user-no-tokens',
        mockUserAnalytics,
        mockUserContext
      );

      // Assert
      expect(result).toBe(false);
      expect(mockSendFcmNotification).not.toHaveBeenCalled();
    });

    it('debería manejar fallos parciales en el envío', async () => {
      // Arrange
      const mockDeviceTokens = ['token-success', 'token-fail', 'token-success-2'];
      mockGetUserDeviceTokens.mockResolvedValue(mockDeviceTokens);
      mockSendFcmNotification
        .mockResolvedValueOnce(true)  // token-success
        .mockResolvedValueOnce(false) // token-fail
        .mockResolvedValueOnce(true); // token-success-2

      // Act
      const result = await notificationService.sendLearningReminderNotification(
        'user-mixed-results',
        mockUserAnalytics,
        mockUserContext
      );

      // Assert
      expect(result).toBe(false); // Should return false if ANY notification fails
      expect(mockSendFcmNotification).toHaveBeenCalledTimes(3);
    });

    it('debería usar key insights cuando no hay datos específicos de tiempo', async () => {
      // Arrange
      const minimalAnalytics = {
        overall_engagement_score: 0.7,
        key_insights: ["Usuario comprometido pero necesita más motivación", "Prefiere contenido visual"],
        streak_risk_level: undefined,
        streak_intervention_strategies: undefined,
        optimal_learning_time_start: undefined,
        optimal_learning_time_end: undefined,
        optimal_learning_time_reasoning: undefined,
        content_difficulty_recommendation: undefined,
        ideal_session_length_minutes: undefined,
      };

      const mockDeviceTokens = ['token-minimal'];
      mockGetUserDeviceTokens.mockResolvedValue(mockDeviceTokens);
      mockSendFcmNotification.mockResolvedValue(true);

      // Act
      const result = await notificationService.sendLearningReminderNotification(
        'user-minimal',
        minimalAnalytics,
        mockUserContext
      );

      // Assert
      expect(result).toBe(true);
      expect(mockSendFcmNotification).toHaveBeenCalledWith(
        'token-minimal',
        expect.stringContaining('🔔'),
        expect.stringContaining("Usuario comprometido pero necesita más motivación"),
        expect.objectContaining({
          type: "learning_reminder"
        })
      );
    });
  });

  describe('sendAchievementNotification', () => {
    const mockUserContext = {
      name: 'Carlos',
      skill: 'Python Programming',
    };

    it('debería enviar notificación de logro exitosamente', async () => {
      // Arrange
      const mockDeviceTokens = ['token-achievement'];
      const mockSkiMessage = {
        message: "¡Increíble Carlos! 🎉 Completar el Día 5 de Python es un gran logro. ¡Tu dedicación está dando frutos!",
        emoji_style: 'celebratory' as const,
        animation_suggestion: 'victory_dance'
      };

      mockGetUserDeviceTokens.mockResolvedValue(mockDeviceTokens);
      mockGetSkiMotivationalMessage.mockResolvedValue(mockSkiMessage);
      mockSendFcmNotification.mockResolvedValue(true);

      // Act
      const result = await notificationService.sendAchievementNotification(
        'user-achiever',
        'completaste el Día 5 de Python!',
        mockUserContext
      );

      // Assert
      expect(result).toBe(true);
      expect(mockGetSkiMotivationalMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          userContext: expect.objectContaining({
            name: 'Carlos',
            skill: 'Python Programming'
          }),
          situation: "milestone_achieved",
          customPromptDetails: expect.stringContaining("completaste el Día 5 de Python")
        })
      );
      expect(mockSendFcmNotification).toHaveBeenCalledWith(
        'token-achievement',
        "🎉 ¡Felicidades!",
        mockSkiMessage.message,
        expect.objectContaining({
          type: "achievement_notification",
          achievement_details: "completaste el Día 5 de Python!"
        })
      );
    });

    it('debería usar mensaje por defecto cuando Ski falla', async () => {
      // Arrange
      const mockDeviceTokens = ['token-fallback'];
      mockGetUserDeviceTokens.mockResolvedValue(mockDeviceTokens);
      mockGetSkiMotivationalMessage.mockResolvedValue(null); // Ski fails
      mockSendFcmNotification.mockResolvedValue(true);

      // Act
      const result = await notificationService.sendAchievementNotification(
        'user-fallback',
        'completó el primer proyecto',
        mockUserContext
      );

      // Assert
      expect(result).toBe(true);
      expect(mockSendFcmNotification).toHaveBeenCalledWith(
        'token-fallback',
        "¡Gran Trabajo!",
        "¡Has logrado: completó el primer proyecto! Sigue así.",
        expect.objectContaining({
          type: "achievement_notification"
        })
      );
    });

    it('debería devolver false cuando no hay tokens de dispositivo', async () => {
      // Arrange
      mockGetUserDeviceTokens.mockResolvedValue(null);

      // Act
      const result = await notificationService.sendAchievementNotification(
        'user-no-tokens',
        'algún logro',
        mockUserContext
      );

      // Assert
      expect(result).toBe(false);
      expect(mockGetSkiMotivationalMessage).not.toHaveBeenCalled();
      expect(mockSendFcmNotification).not.toHaveBeenCalled();
    });

    it('debería manejar múltiples tokens con fallos parciales', async () => {
      // Arrange
      const mockDeviceTokens = ['token-1', 'token-2', 'token-3'];
      const mockSkiMessage = {
        message: "¡Excelente trabajo!",
        emoji_style: 'celebratory' as const,
        animation_suggestion: 'celebration'
      };

      mockGetUserDeviceTokens.mockResolvedValue(mockDeviceTokens);
      mockGetSkiMotivationalMessage.mockResolvedValue(mockSkiMessage);
      mockSendFcmNotification
        .mockResolvedValueOnce(true)  // token-1: success
        .mockResolvedValueOnce(false) // token-2: fail
        .mockResolvedValueOnce(true); // token-3: success

      // Act
      const result = await notificationService.sendAchievementNotification(
        'user-partial-fail',
        'completó un hito importante',
        mockUserContext
      );

      // Assert
      expect(result).toBe(false); // Should return false if ANY token fails
      expect(mockSendFcmNotification).toHaveBeenCalledTimes(3);
    });

    it('debería funcionar sin nombre de usuario', async () => {
      // Arrange
      const mockDeviceTokens = ['token-anonymous'];
      const mockSkiMessage = {
        message: "¡Increíble progreso! 🌟",
        emoji_style: 'encouraging' as const,
        animation_suggestion: 'thumbs_up'
      };

      mockGetUserDeviceTokens.mockResolvedValue(mockDeviceTokens);
      mockGetSkiMotivationalMessage.mockResolvedValue(mockSkiMessage);
      mockSendFcmNotification.mockResolvedValue(true);

      const contextWithoutName = {
        skill: 'JavaScript',
      };

      // Act
      const result = await notificationService.sendAchievementNotification(
        'user-anonymous',
        'terminó el curso básico',
        contextWithoutName
      );

      // Assert
      expect(result).toBe(true);
      expect(mockGetSkiMotivationalMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          userContext: expect.objectContaining({
            name: undefined,
            skill: 'JavaScript'
          })
        })
      );
    });
  });
}); 