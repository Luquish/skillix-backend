import OpenAI from 'openai';
import { getConfig } from '@/config'; // Asumiendo que tienes un gestor de configuración

const config = getConfig(); // Carga la configuración (API Key, modelo por defecto, etc.)

// Cliente de OpenAI se inicializa de forma perezosa para facilitar las pruebas
// y evitar depender del orden de importaciones cuando se mockea.
let openai: OpenAI | null = null;

function ensureOpenAiClient(): OpenAI | null {
  if (openai) return openai;
  try {
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API Key no está configurada en las variables de entorno (OPENAI_API_KEY).');
    }
    openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  } catch (error) {
    console.error('Error inicializando el cliente de OpenAI:', error);
    openai = null;
  }
  return openai;
}

interface ChatCompletionParams {
  model?: string;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: { type: 'json_object' | 'text' }; // Para forzar salida JSON
}

export interface LlmResponse {
  success: boolean;
  content: string | null;
  error?: string;
  usage?: OpenAI.CompletionUsage;
}

/**
 * Obtiene una respuesta de completado de chat del modelo OpenAI especificado.
 * @param params Parámetros para la solicitud de completado de chat.
 * @returns Una promesa que se resuelve con la respuesta del LLM.
 */
export async function getOpenAiChatCompletion(
  params: ChatCompletionParams
): Promise<LlmResponse> {
  const client = ensureOpenAiClient();
  if (!client) {
    return {
      success: false,
      content: null,
      error: 'El cliente de OpenAI no está inicializado. Verifica la API Key y la configuración.',
    };
  }

  const modelToUse = params.model || config.openaiModel || 'gpt-4o-mini'; // Usar modelo de params, luego config, luego default

  try {
    const completion = await client.chat.completions.create({
      model: modelToUse,
      messages: params.messages,
      temperature: params.temperature ?? config.llmModelConfig.temperature, // Usa el de config si no se especifica
      max_tokens: params.max_tokens ?? config.llmModelConfig.max_tokens,
      top_p: params.top_p ?? config.llmModelConfig.top_p,
      frequency_penalty: params.frequency_penalty ?? config.llmModelConfig.frequency_penalty,
      presence_penalty: params.presence_penalty ?? config.llmModelConfig.presence_penalty,
      response_format: params.response_format, // Permite forzar JSON si es necesario
    });

    const messageContent = completion.choices[0]?.message?.content;
    
    if (!messageContent) {
      return {
        success: false,
        content: null,
        error: 'La respuesta de OpenAI no contiene contenido en el mensaje.',
        usage: completion.usage,
      };
    }

    return {
      success: true,
      content: messageContent,
      usage: completion.usage,
    };
  } catch (error: unknown) {
    console.error('Error llamando al API de OpenAI:', error);
    let errorMessage = 'Error desconocido al contactar OpenAI.';
    const err = error as { response?: { status: number; data: unknown }; request?: unknown; message?: string };
    if (err.response) {
      // El API devolvió un error (ej. 4xx, 5xx)
      errorMessage = `Error de OpenAI API: ${err.response.status} - ${JSON.stringify(err.response.data)}`;
    } else if (err.request) {
      // La solicitud se hizo pero no se recibió respuesta
      errorMessage = 'No se recibió respuesta de OpenAI API.';
    } else if (err.message) {
      // Algo más ocurrió
      errorMessage = err.message;
    }
    return {
      success: false,
      content: null,
      error: errorMessage,
    };
  }
}

// Podrías añadir más funciones aquí, por ejemplo, para otros tipos de endpoints de OpenAI
// si los necesitas (embeddings, image generation, etc.).
