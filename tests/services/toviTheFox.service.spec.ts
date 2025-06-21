import { getSkiMotivationalMessage, getSkiStreakCelebration, getSkiDailyMotivation } from '../../src/services/llm/toviTheFox.service';
import { getOpenAiChatCompletion } from '../../src/services/llm/openai.service';

// Mock del servicio de OpenAI
jest.mock('../../src/services/llm/openai.service');
const mockGetOpenAiChatCompletion = getOpenAiChatCompletion as jest.MockedFunction<typeof getOpenAiChatCompletion>;

describe('ToviTheFox Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSkiMotivationalMessage', () => {
    const mockUserContext = {
      name: 'Juan',
      skill: 'JavaScript',
      experience: 'BEGINNER',
      time: '30 minutos',
      goal: 'Ser desarrollador web',
    };

    it('debería generar un mensaje motivacional exitosamente', async () => {
      // Arrange
      const mockSkiMessage = {
        message: '¡Hola Juan! 🌟 ¡Es hora de conquistar JavaScript! Recuerda, cada línea de código te acerca más a tu objetivo de ser desarrollador web. ¡Vamos a por esos 30 minutos de aprendizaje puro! 🚀',
        emoji_style: 'encouraging' as const,
        animation_suggestion: 'jumping_with_joy',
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockSkiMessage),
        usage: { prompt_tokens: 80, completion_tokens: 150, total_tokens: 230 },
      });

      const input = {
        userContext: mockUserContext,
        situation: 'daily_greeting_morning' as const,
        currentStreakDays: 3,
      };

      // Act
      const result = await getSkiMotivationalMessage(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.message).toContain('Juan');
      expect(result?.emoji_style).toBe('encouraging');
      expect(result?.animation_suggestion).toBe('jumping_with_joy');
      expect(mockGetOpenAiChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
          temperature: 0.75,
          response_format: { type: 'json_object' },
        })
      );
    });

    it('debería incluir detalles del streak en el mensaje', async () => {
      // Arrange
      const mockMessage = {
        message: '¡Increíble streak de 7 días!',
        emoji_style: 'celebratory' as const,
        animation_suggestion: 'celebration_dance',
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockMessage),
        usage: { prompt_tokens: 60, completion_tokens: 100, total_tokens: 160 },
      });

      const input = {
        userContext: mockUserContext,
        situation: 'milestone_achieved' as const,
        currentStreakDays: 7,
      };

      // Act
      const result = await getSkiMotivationalMessage(input);

      // Assert
      expect(result).not.toBeNull();
      expect(mockGetOpenAiChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('7 days'),
            }),
          ]),
        })
      );
    });

    it('debería manejar situaciones personalizadas', async () => {
      // Arrange
      const mockMessage = {
        message: 'Mensaje personalizado para situación específica',
        emoji_style: 'supportive' as const,
        animation_suggestion: 'thinking_pose',
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockMessage),
        usage: { prompt_tokens: 90, completion_tokens: 120, total_tokens: 210 },
      });

      const input = {
        userContext: mockUserContext,
        situation: 'custom_prompt' as const,
        customPromptDetails: 'El usuario está luchando con loops en JavaScript',
      };

      // Act
      const result = await getSkiMotivationalMessage(input);

      // Assert
      expect(result).not.toBeNull();
      expect(mockGetOpenAiChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('loops en JavaScript'),
            }),
          ]),
        })
      );
    });

    it('debería devolver null cuando OpenAI falla', async () => {
      // Arrange
      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: false,
        content: null,
        error: 'Error de conexión con OpenAI',
      });

      const input = {
        userContext: mockUserContext,
        situation: 'generic_encouragement' as const,
      };

      // Act
      const result = await getSkiMotivationalMessage(input);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getSkiStreakCelebration', () => {
    it('debería generar una celebración de streak exitosamente', async () => {
      // Arrange
      const mockCelebration = {
        streak_count: 7,
        celebration_message: '¡INCREÍBLE! ¡Una semana completa de aprendizaje! 🎉 María, has demostrado que la constancia es tu superpoder. ¡Esto se está volviendo un hábito increíble!',
        special_animation: 'fireworks_dance',
        reward_suggestion: 'Desbloquea el badge "Semana Perfecta" y gana 100 XP extra',
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockCelebration),
        usage: { prompt_tokens: 70, completion_tokens: 140, total_tokens: 210 },
      });

      const input = {
        userName: 'María',
        streakDays: 7,
      };

      // Act
      const result = await getSkiStreakCelebration(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.streak_count).toBe(7);
      expect(result?.celebration_message).toContain('María');
      expect(result?.special_animation).toBe('fireworks_dance');
      expect(result?.reward_suggestion).toContain('badge');
      expect(mockGetOpenAiChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.8,
          response_format: { type: 'json_object' },
        })
      );
    });

    it('debería generar diferentes celebraciones para diferentes milestones', async () => {
      // Arrange
      const mockCelebration = {
        streak_count: 100,
        celebration_message: '¡100 DÍAS! ¡Eres oficialmente una LEYENDA del aprendizaje!',
        special_animation: 'legendary_transformation',
        reward_suggestion: 'Crown badge y título especial',
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockCelebration),
        usage: { prompt_tokens: 80, completion_tokens: 160, total_tokens: 240 },
      });

      const input = {
        userName: 'Carlos',
        streakDays: 100,
      };

      // Act
      const result = await getSkiStreakCelebration(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.streak_count).toBe(100);
      expect(mockGetOpenAiChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('100 DÍAS'),
            }),
          ]),
        })
      );
    });

    it('debería corregir inconsistencias en el streak count', async () => {
      // Arrange
      const mockCelebration = {
        streak_count: 5, // Diferente al input (14)
        celebration_message: 'Celebración',
        special_animation: 'happy_dance',
        reward_suggestion: null,
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockCelebration),
        usage: { prompt_tokens: 50, completion_tokens: 80, total_tokens: 130 },
      });

      // Spy on console.warn
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const input = {
        userName: 'Ana',
        streakDays: 14,
      };

      // Act
      const result = await getSkiStreakCelebration(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.streak_count).toBe(14); // Debe usar el valor correcto del input
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Streak count mismatch')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getSkiDailyMotivation', () => {
    it('debería generar motivación diaria con analytics', async () => {
      // Arrange
      const mockDailyMotivation = {
        greeting: '¡Buenos días, Pedro! 🌅',
        motivation: 'Hoy es el día perfecto para avanzar en tu journey de Python. Tus patrones de aprendizaje muestran que rindes mejor por las mañanas.',
        reminder: 'Recuerda: 20 minutos de práctica consistente valen más que 2 horas esporádicas.',
        signoff: '¡Ski está aquí para apoyarte! 🦊✨',
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockDailyMotivation),
        usage: { prompt_tokens: 120, completion_tokens: 180, total_tokens: 300 },
      });

      const mockAnalyticsInfo = {
        optimal_learning_time: {
          preferred_time_slots: ['08:00-10:00', '14:00-16:00'],
          peak_performance_time: '09:00',
          completion_rate_by_time: { morning: 85, afternoon: 70, evening: 60 },
        },
        streak_maintenance_analysis: {
          risk_level: 'LOW',
          intervention_strategies: ['morning_reminder', 'progress_celebration'],
        },
        key_insights: ['Aprende mejor por las mañanas', 'Prefiere contenido visual'],
        overall_engagement_score: 8.5,
      };

      const input = {
        userName: 'Pedro',
        analyticsInfo: mockAnalyticsInfo,
      };

      // Act
      const result = await getSkiDailyMotivation(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.greeting).toContain('Pedro');
      expect(result?.motivation).toBeTruthy();
      expect(result?.reminder).toBeTruthy();
      expect(result?.signoff).toContain('Ski');
      expect(mockGetOpenAiChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Pedro'),
            }),
          ]),
        })
      );
    });

    it('debería manejar usuarios sin analytics completos', async () => {
      // Arrange
      const mockMotivation = {
        greeting: '¡Hola, Learner! 👋',
        motivation: 'Cada día es una nueva oportunidad para crecer y aprender algo nuevo.',
        reminder: 'La consistencia es la clave del éxito en el aprendizaje.',
        signoff: '¡Vamos juntos en esta aventura! 🦊',
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockMotivation),
        usage: { prompt_tokens: 60, completion_tokens: 100, total_tokens: 160 },
      });

      const input = {
        userName: undefined,
        analyticsInfo: {
          overall_engagement_score: 0.7,
          key_insights: ['Usuario nuevo', 'Sin patrones definidos aún'],
          streak_risk_level: 'medium' as const,
          streak_intervention_strategies: ['Enviar recordatorios amigables'],
        },
      };

      // Act
      const result = await getSkiDailyMotivation(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.greeting).toContain('Learner');
    });
  });
}); 