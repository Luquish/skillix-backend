import OpenAI from 'openai';
import { getConfig } from '@/config'; // Asumiendo que tienes un gestor de configuración

const config = getConfig(); // Carga la configuración (API Key, modelo por defecto, etc.)

// Inicializar el cliente de OpenAI
// La API Key se tomará de la variable de entorno OPENAI_API_KEY por defecto
// si no se pasa explícitamente aquí.
// Es mejor configurar la API key a través de la variable de entorno.
let openai: OpenAI;

try {
  if (!config.openaiApiKey) {
    throw new Error('OpenAI API Key no está configurada en las variables de entorno (OPENAI_API_KEY).');
  }
  openai = new OpenAI({
    apiKey: config.openaiApiKey,
  });
  console.log('Cliente de OpenAI inicializado correctamente.');
} catch (error) {
  console.error('Error inicializando el cliente de OpenAI:', error);
  // Podrías lanzar el error para detener la aplicación si OpenAI es crítico,
  // o manejarlo de forma que la app pueda funcionar sin OpenAI para ciertas partes.
  // Por ahora, lo logueamos y openai quedará indefinido.
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
  if (!openai) {
    return {
      success: false,
      content: null,
      error: 'El cliente de OpenAI no está inicializado. Verifica la API Key y la configuración.',
    };
  }

  const modelToUse = params.model || config.openaiModel || 'gpt-4o-mini'; // Usar modelo de params, luego config, luego default

  try {
    console.log(`Enviando solicitud a OpenAI. Modelo: ${modelToUse}, Temp: ${params.temperature ?? config.llmModelConfig.temperature}`);
    const completion = await openai.chat.completions.create({
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
  } catch (error: any) {
    console.error('Error llamando al API de OpenAI:', error);
    let errorMessage = 'Error desconocido al contactar OpenAI.';
    if (error.response) {
      // El API devolvió un error (ej. 4xx, 5xx)
      errorMessage = `Error de OpenAI API: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
    } else if (error.request) {
      // La solicitud se hizo pero no se recibió respuesta
      errorMessage = 'No se recibió respuesta de OpenAI API.';
    } else if (error.message) {
      // Algo más ocurrió
      errorMessage = error.message;
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
