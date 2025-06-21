import OpenAI from 'openai';
import { getOpenAiChatCompletion } from '../../src/services/llm/openai.service';

// Mock del módulo de configuración
jest.mock('../../src/config', () => ({
  getConfig: jest.fn(() => ({
    openaiApiKey: 'test-api-key',
    openaiModel: 'gpt-4o-mini',
    llmModelConfig: {
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    },
  })),
}));

// Mock del módulo completo de OpenAI
jest.mock('openai');

const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const mockCreate = jest.fn();

describe('OpenAI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock para la instancia de OpenAI
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }) as any);
  });

  describe('getOpenAiChatCompletion', () => {
    it('debería devolver una respuesta exitosa con contenido válido', async () => {
      // Arrange
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Esta es una respuesta de prueba de OpenAI',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const params = {
        messages: [
          { role: 'user' as const, content: 'Hola, ¿cómo estás?' },
        ],
        temperature: 0.5,
      };

      // Act
      const result = await getOpenAiChatCompletion(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.content).toBe('Esta es una respuesta de prueba de OpenAI');
      expect(result.usage).toEqual(mockResponse.usage);
      expect(result.error).toBeUndefined();
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: params.messages,
        temperature: 0.5,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        response_format: undefined,
      });
    });

    it('debería usar valores por defecto de configuración cuando no se especifican parámetros', async () => {
      // Arrange
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Respuesta con configuración por defecto',
            },
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const params = {
        messages: [
          { role: 'system' as const, content: 'Eres un asistente útil' },
          { role: 'user' as const, content: 'Explica algo' },
        ],
      };

      // Act
      const result = await getOpenAiChatCompletion(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: params.messages,
        temperature: 0.7, // Valor por defecto de config
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        response_format: undefined,
      });
    });

    it('debería manejar el caso cuando no hay contenido en la respuesta', async () => {
      // Arrange
      const mockResponse = {
        choices: [
          {
            message: {
              content: null, // Sin contenido
            },
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const params = {
        messages: [
          { role: 'user' as const, content: 'Test sin contenido' },
        ],
      };

      // Act
      const result = await getOpenAiChatCompletion(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.content).toBeNull();
      expect(result.error).toBe('La respuesta de OpenAI no contiene contenido en el mensaje.');
      expect(result.usage).toEqual(mockResponse.usage);
    });

    it('debería manejar errores de API de OpenAI (4xx, 5xx)', async () => {
      // Arrange
      const apiError = {
        response: {
          status: 429,
          data: { error: { message: 'Rate limit exceeded' } },
        },
      };
      mockCreate.mockRejectedValue(apiError);

      const params = {
        messages: [
          { role: 'user' as const, content: 'Test error' },
        ],
      };

      // Act
      const result = await getOpenAiChatCompletion(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.content).toBeNull();
      expect(result.error).toContain('Error de OpenAI API: 429');
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('debería manejar errores de red (sin respuesta)', async () => {
      // Arrange
      const networkError = {
        request: {}, // Indica que la solicitud se hizo pero no se recibió respuesta
        message: 'Network error',
      };
      mockCreate.mockRejectedValue(networkError);

      const params = {
        messages: [
          { role: 'user' as const, content: 'Test network error' },
        ],
      };

      // Act
      const result = await getOpenAiChatCompletion(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.content).toBeNull();
      expect(result.error).toBe('No se recibió respuesta de OpenAI API.');
    });

    it('debería usar el formato de respuesta JSON cuando se especifica', async () => {
      // Arrange
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"resultado": "éxito"}',
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const params = {
        messages: [
          { role: 'user' as const, content: 'Devuelve un JSON' },
        ],
        response_format: { type: 'json_object' as const },
      };

      // Act
      const result = await getOpenAiChatCompletion(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.content).toBe('{"resultado": "éxito"}');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: 'json_object' },
        })
      );
    });

    it('debería usar modelo personalizado cuando se especifica', async () => {
      // Arrange
      const mockResponse = {
        choices: [{ message: { content: 'Respuesta del modelo personalizado' } }],
        usage: { prompt_tokens: 5, completion_tokens: 8, total_tokens: 13 },
      };
      mockCreate.mockResolvedValue(mockResponse);

      const params = {
        messages: [
          { role: 'user' as const, content: 'Test modelo personalizado' },
        ],
        model: 'gpt-4',
      };

      // Act
      const result = await getOpenAiChatCompletion(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
        })
      );
    });
  });
}); 