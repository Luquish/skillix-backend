// src/config/index.ts
import * as dotenv from 'dotenv';
dotenv.config(); // Carga variables de .env a process.env

interface LlmModelConfig {
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

interface AppConfig {
  nodeEnv: string;
  port: number;
  openaiApiKey: string | undefined;
  openaiModel: string; // Modelo OpenAI por defecto
  llmModelConfig: LlmModelConfig; // Configuración genérica para LLM
  firebaseServiceAccountPath: string;
  // Añade aquí otras configuraciones que necesites
}

const config: AppConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  llmModelConfig: {
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    max_tokens: parseInt(process.env.LLM_MAX_TOKENS || '4000', 10),
    top_p: parseFloat(process.env.LLM_TOP_P || '1'),
    frequency_penalty: parseFloat(process.env.LLM_FREQUENCY_PENALTY || '0'),
    presence_penalty: parseFloat(process.env.LLM_PRESENCE_PENALTY || '0'),
  },
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
};

export function getConfig(): AppConfig {
  if (!config.openaiApiKey) {
    console.warn('ADVERTENCIA: OPENAI_API_KEY no está configurada en el entorno.');
  }
  return config;
}