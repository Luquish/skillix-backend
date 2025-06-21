// src/services/llm/skillAnalyzer.service.ts

import { getOpenAiChatCompletion, LlmResponse } from './openai.service'; // Asumiendo que LlmResponse está exportada
import { getConfig } from '../../config'; // Para acceder a configuraciones generales si es necesario
import OpenAI from 'openai';
import { z } from 'zod'; // Importar Zod

// Importar schemas y tipos desde el archivo centralizado
import {
  SkillAnalysisSchema,
  type SkillAnalysis
} from './schemas';
import { SYSTEM_PROMPT_SKILL_ANALYZER } from './prompts';

const config = getConfig();

// --- Interfaz para el contexto del usuario ---

// Interfaz para el contexto del usuario que se pasará a la función
export interface UserSkillContext {
  experience: 'beginner' | 'intermediate' | 'advanced' | string; // ej. 'beginner'
  goal: string; // ej. 'general proficiency', 'career advancement'
  time: string; // ej. '15 minutes daily', '1 hour on weekends'
  learning_style?: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | string; // Estilo de aprendizaje preferido
  preferred_study_time?: 'morning' | 'afternoon' | 'evening' | 'flexible' | string; // Horario preferido
  learning_context?: 'career_change' | 'skill_improvement' | 'hobby' | 'academic' | 'promotion' | string; // Contexto de uso
  challenge_preference?: 'gradual' | 'moderate' | 'intense' | string; // Nivel de desafío preferido
}

/**
 * Analiza una habilidad dada utilizando OpenAI para descomponerla y evaluar su viabilidad.
 * @param skill La habilidad que el usuario quiere aprender (texto libre).
 * @param userContext El contexto del usuario (experiencia, meta, tiempo disponible).
 * @returns Una promesa que se resuelve con el objeto SkillAnalysis o null si hay un error.
 */
export async function analyzeSkillWithOpenAI(
  skill: string,
  userContext: UserSkillContext
): Promise<SkillAnalysis | null> {
  const userMessage = `Analyze this skill for learning path creation and platform viability:
Skill: ${skill}
User Experience: ${userContext.experience}
Learning Goal: ${userContext.goal}
Available Time: ${userContext.time}
${userContext.learning_style ? `Preferred Learning Style: ${userContext.learning_style}` : ''}
${userContext.preferred_study_time ? `Preferred Study Time: ${userContext.preferred_study_time}` : ''}
${userContext.learning_context ? `Learning Context: ${userContext.learning_context}` : ''}
${userContext.challenge_preference ? `Challenge Preference: ${userContext.challenge_preference}` : ''}

Provide a comprehensive skill breakdown and viability assessment in the exact JSON format specified in the system instructions.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT_SKILL_ANALYZER,
    },
    {
      role: 'user',
      content: userMessage,
    },
  ];

  const response: LlmResponse = await getOpenAiChatCompletion({
    messages,
    model: config.openaiModel, 
    temperature: 0.5, 
    response_format: { type: 'json_object' }, 
  });

  if (!response.success || !response.content) {
    console.error('Error en el análisis de habilidad de OpenAI:', response.error);
    return null;
  }

  try {
    const rawAnalysisResult = JSON.parse(response.content);
    
    const validatedAnalysis = SkillAnalysisSchema.parse(rawAnalysisResult);
    
    // Si is_skill_valid es true, pero components está vacío, podría ser un problema de generación del LLM.
    if (validatedAnalysis.isSkillValid && validatedAnalysis.components.length === 0) {
        console.warn(`Skill "${skill}" marcada como válida pero no tiene componentes. Revisar output del LLM.`);
        // Podrías decidir si esto es un error o si es aceptable en algunos casos.
        // Por ahora, lo permitimos pero logueamos una advertencia.
    }
    
    return validatedAnalysis;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Error de validación Zod para SkillAnalysis:', error.errors);
    } else {
      console.error('Error parseando la respuesta JSON de SkillAnalysis de OpenAI:', error);
    }
    console.error('Contenido original de OpenAI que falló al parsear/validar:', response.content);
    return null;
  }
}
