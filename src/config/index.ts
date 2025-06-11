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
  openaiModel: string;
  llmModelConfig: LlmModelConfig;
  firebaseServiceAccountPath: string;
  firebaseProjectId: string | undefined;
  googleApplicationCredentials: string | undefined;
  dataConnectServiceId: string;
  dataConnectLocation: string;
  dataConnectEmulatorHost: string | undefined;
  firebaseWebApiKey: string;
  firebaseAuthEmulatorHost: string | undefined;
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
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  dataConnectServiceId: process.env.DATA_CONNECT_SERVICE_ID || '',
  dataConnectLocation: process.env.DATA_CONNECT_LOCATION || 'us-central1',
  dataConnectEmulatorHost: process.env.DATA_CONNECT_EMULATOR_HOST,
  firebaseWebApiKey: process.env.FIREBASE_WEB_API_KEY || 'test-api-key',
  firebaseAuthEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
};

export function getConfig(): AppConfig {
  if (!config.openaiApiKey) {
    console.warn('ADVERTENCIA: OPENAI_API_KEY no está configurada en el entorno.');
  }
  return config;
}