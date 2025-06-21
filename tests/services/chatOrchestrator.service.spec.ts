import { orchestrateChatResponse } from '../../src/services/llm/chatOrchestrator.service';
import { getOpenAiChatCompletion } from '../../src/services/llm/openai.service';

// Mock del servicio de OpenAI
jest.mock('../../src/services/llm/openai.service');
const mockGetOpenAiChatCompletion = getOpenAiChatCompletion as jest.MockedFunction<typeof getOpenAiChatCompletion>;

describe('ChatOrchestrator Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('orchestrateChatResponse', () => {
    const mockChatContext = {
      user: {
        firebaseUid: 'test-user-123',
        name: 'Ana Martinez',
        skill: 'Python Programming',
      },
      currentLearningPlanSummary: {
        planId: 'plan-456',
        skillName: 'Python Programming',
        totalDurationWeeks: 8,
        currentDayNumber: 3,
        currentSectionTitle: 'Variables and Data Types',
        nextDayTitle: 'Control Structures',
        milestones: ['Master Python basics', 'Build first project', 'Data structures'],
      },
      recentDayContentSummary: {
        dayTitle: 'Day 3: Variables and Data Types',
        objectives: ['Understand variables', 'Work with different data types', 'Practice string manipulation'],
        focusArea: 'Python Fundamentals',
        keyConcepts: [
          { term: 'Variable', definition: 'A container for storing data values' },
          { term: 'String', definition: 'A sequence of characters' },
        ],
      },
      userAnalyticsSummary: {
        key_insights: ['Learns best in the morning', 'Prefers hands-on exercises'],
        overall_engagement_score: 0.85,
        optimal_learning_time_start: '09:00',
        optimal_learning_time_end: '11:00',
        streak_risk_level: 'low' as const,
        streak_intervention_strategies: ['morning_reminders'],
        content_difficulty_recommendation: 'maintain',
        ideal_session_length_minutes: 25,
      },
    };

    it('debería generar una respuesta de chat exitosamente', async () => {
      // Arrange
      const mockChatResponse = {
        responseText: '¡Hola Ana! 🌟 Veo que estás en el Día 3 trabajando con Variables y Data Types. Es genial que mantengas tu racha de aprendizaje. Según tus patrones, las mañanas son tu mejor momento para estudiar. ¿En qué puedo ayudarte hoy?',
        suggested_actions: [
          {
            action_type: 'review_concept',
            display_text: 'Revisar conceptos de variables',
            payload: { concept: 'variables' }
          },
          {
            action_type: 'practice_exercise',
            display_text: 'Hacer ejercicio práctico',
            payload: { exerciseType: 'string_manipulation' }
          }
        ],
        needs_more_info_prompt: null
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockChatResponse),
        usage: { prompt_tokens: 250, completion_tokens: 180, total_tokens: 430 },
      });

      const input = {
        userInput: '¡Hola! ¿Cómo voy con mi aprendizaje?',
        chatContext: mockChatContext,
      };

      // Act
      const result = await orchestrateChatResponse(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.responseText).toContain('Ana');
      expect(result?.responseText).toContain('Día 3');
      expect(result?.suggested_actions).toHaveLength(2);
      expect(result?.suggested_actions?.[0]?.action_type).toBe('review_concept');
      expect(result?.needs_more_info_prompt).toBeNull();
      expect(mockGetOpenAiChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.6,
          response_format: { type: 'json_object' },
        })
      );
    });

    it('debería incluir historial de chat en la conversación', async () => {
      // Arrange
      const chatHistory = [
        { role: 'user' as const, content: 'Explica qué son las variables' },
        { role: 'assistant' as const, content: 'Las variables son contenedores para almacenar datos...' },
        { role: 'user' as const, content: '¿Puedes darme un ejemplo?' },
      ];

      const mockResponse = {
        responseText: 'Claro! Por ejemplo: nombre = "Ana" es una variable que almacena tu nombre como un string.',
        suggested_actions: [
          {
            action_type: 'code_example',
            display_text: 'Ver más ejemplos de código',
            payload: { topic: 'variables' }
          }
        ],
        needs_more_info_prompt: null
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockResponse),
        usage: { prompt_tokens: 300, completion_tokens: 150, total_tokens: 450 },
      });

      const input = {
        userInput: '¿Puedes darme un ejemplo?',
        chatHistory: chatHistory,
        chatContext: mockChatContext,
      };

      // Act
      const result = await orchestrateChatResponse(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.responseText).toContain('ejemplo');
      expect(mockGetOpenAiChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: 'Explica qué son las variables' }),
            expect.objectContaining({ role: 'assistant', content: 'Las variables son contenedores para almacenar datos...' }),
            expect.objectContaining({ role: 'user', content: '¿Puedes darme un ejemplo?' }),
          ]),
        })
      );
    });

    it('debería solicitar más información cuando no puede responder', async () => {
      // Arrange
      const mockResponseNeedsInfo = {
        responseText: 'Me gustaría ayudarte con esa pregunta sobre el Día 5, pero necesito ver los detalles específicos de ese día.',
        suggested_actions: [
          {
            action_type: 'fetch_day_details',
            display_text: 'Obtener detalles del Día 5',
            payload: { dayNumber: 5 }
          }
        ],
        needs_more_info_prompt: 'Para darte la mejor respuesta sobre el Día 5, necesito acceder a su contenido específico. ¿Quieres que busque esos detalles?'
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockResponseNeedsInfo),
        usage: { prompt_tokens: 200, completion_tokens: 120, total_tokens: 320 },
      });

      const input = {
        userInput: '¿Cuáles son los conceptos clave del Día 5?',
        chatContext: mockChatContext,
      };

      // Act
      const result = await orchestrateChatResponse(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.responseText).toContain('Día 5');
      expect(result?.needs_more_info_prompt).toContain('contenido específico');
      expect(result?.suggested_actions?.[0]?.action_type).toBe('fetch_day_details');
      expect(result?.suggested_actions?.[0]?.payload).toEqual({ dayNumber: 5 });
    });

    it('debería usar contexto detallado cuando está disponible', async () => {
      // Arrange
      const contextWithDetails = {
        ...mockChatContext,
        detailedContext: {
          dayContent: {
            title: 'Day 5: Functions and Modules',
            objectives: ['Define functions', 'Import modules', 'Write reusable code'],
            main_content: {
              title: 'Python Functions',
              textContent: 'Functions are reusable blocks of code...',
              keyConcepts: [
                { term: 'Function', definition: 'A reusable block of code that performs a specific task' }
              ]
            }
          }
        }
      };

      const mockDetailedResponse = {
        responseText: 'Perfecto! Veo que tienes acceso al contenido del Día 5 sobre Functions and Modules. Los conceptos clave incluyen la definición de funciones como bloques de código reutilizables...',
        suggested_actions: [
          {
            action_type: 'practice_function',
            display_text: 'Practicar creando funciones',
            payload: { exerciseType: 'function_definition' }
          }
        ],
        needs_more_info_prompt: null
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockDetailedResponse),
        usage: { prompt_tokens: 350, completion_tokens: 200, total_tokens: 550 },
      });

      const input = {
        userInput: '¿Cuáles son los conceptos clave del Día 5?',
        chatContext: contextWithDetails,
      };

      // Act
      const result = await orchestrateChatResponse(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.responseText).toContain('Functions and Modules');
      expect(result?.responseText).toContain('bloques de código reutilizables');
      expect(result?.suggested_actions?.[0]?.action_type).toBe('practice_function');
    });

    it('debería manejar preguntas sobre progreso y analytics', async () => {
      // Arrange
      const mockProgressResponse = {
        responseText: 'Ana, tu progreso es excelente! Con un engagement score de 0.85 y tu preferencia por aprender en las mañanas (9:00-11:00), estás manteniendo un ritmo fantástico. Tu riesgo de perder la racha es bajo, lo que significa que estás muy comprometida con tu aprendizaje.',
        suggested_actions: [
          {
            action_type: 'view_progress',
            display_text: 'Ver progreso detallado',
            payload: { section: 'analytics' }
          },
          {
            action_type: 'schedule_reminder',
            display_text: 'Configurar recordatorio matutino',
            payload: { time: '09:00' }
          }
        ],
        needs_more_info_prompt: null
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockProgressResponse),
        usage: { prompt_tokens: 280, completion_tokens: 170, total_tokens: 450 },
      });

      const input = {
        userInput: '¿Cómo va mi progreso? ¿Cuándo aprendo mejor?',
        chatContext: mockChatContext,
      };

      // Act
      const result = await orchestrateChatResponse(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.responseText).toContain('0.85');
      expect(result?.responseText).toContain('9:00-11:00');
      expect(result?.suggested_actions?.[1]?.action_type).toBe('schedule_reminder');
    });

    it('debería proporcionar respuesta por defecto cuando OpenAI falla', async () => {
      // Arrange
      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: false,
        content: null,
        error: 'OpenAI API error',
      });

      const input = {
        userInput: 'Ayuda con variables',
        chatContext: mockChatContext,
      };

      // Act
      const result = await orchestrateChatResponse(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.responseText).toContain('no puedo responder en este momento');
      expect(result?.responseText).toContain('🦊');
      expect(result?.needs_more_info_prompt).toBeNull();
      expect(result?.suggested_actions).toEqual([]);
    });

    it('debería manejar respuestas JSON inválidas con fallback', async () => {
      // Arrange
      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: 'Invalid JSON response from OpenAI',
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      const input = {
        userInput: 'Explica los loops',
        chatContext: mockChatContext,
      };

      // Act
      const result = await orchestrateChatResponse(input);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.responseText).toContain('pequeño problema procesando');
      expect(result?.responseText).toContain('🦊');
      expect(result?.needs_more_info_prompt).toBeNull();
      expect(result?.suggested_actions).toEqual([]);
    });

    it('debería limitar el historial de chat a 10 mensajes recientes', async () => {
      // Arrange
             const longChatHistory = Array.from({ length: 15 }, (_, i) => ({
         role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
         content: `Message ${i + 1}`,
       }));

      const mockResponse = {
        responseText: 'Respuesta basada en historial limitado',
        suggested_actions: [],
        needs_more_info_prompt: null
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockResponse),
        usage: { prompt_tokens: 200, completion_tokens: 100, total_tokens: 300 },
      });

      const input = {
        userInput: 'Nueva pregunta',
        chatHistory: longChatHistory,
        chatContext: mockChatContext,
      };

      // Act
      const result = await orchestrateChatResponse(input);

      // Assert
      expect(result).not.toBeNull();
      
      // Verify the call was made with correct structure
      expect(mockGetOpenAiChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.6,
          response_format: { type: 'json_object' },
        })
      );

      // Verify it limited the history (should have system + limited history + user input)
      const callArgs = mockGetOpenAiChatCompletion.mock.calls[0][0];
      const messageContents = callArgs.messages.map((m: any) => m.content);
      expect(messageContents.some((content: string) => content === 'Message 1')).toBe(false);
      expect(messageContents.some((content: string) => content === 'Nueva pregunta')).toBe(true);
    });

    it('debería incluir información de contexto de usuario en el prompt', async () => {
      // Arrange
      const mockResponse = {
        responseText: 'Contexto incluido correctamente',
        suggested_actions: [],
        needs_more_info_prompt: null
      };

      mockGetOpenAiChatCompletion.mockResolvedValue({
        success: true,
        content: JSON.stringify(mockResponse),
        usage: { prompt_tokens: 300, completion_tokens: 100, total_tokens: 400 },
      });

      const input = {
        userInput: 'Pregunta general',
        chatContext: mockChatContext,
      };

      // Act
      await orchestrateChatResponse(input);

      // Assert
      expect(mockGetOpenAiChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Ana Martinez')
            }),
          ]),
        })
      );
    });
  });
}); 