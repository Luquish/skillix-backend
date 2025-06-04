// src/services/llm/skillAnalyzer.service.ts

import { getOpenAiChatCompletion, LlmResponse } from './openai.service'; // Asumiendo que LlmResponse está exportada
import { getConfig } from '../../config'; // Para acceder a configuraciones generales si es necesario
import OpenAI from 'openai';
import { z } from 'zod'; // Importar Zod

const config = getConfig();

// --- Zod Schemas (equivalentes a tus Pydantic models) y TypeScript Interfaces ---

export const SkillComponentSchema = z.object({
  name: z.string().min(1, "Component name cannot be empty."),
  description: z.string().min(1, "Component description cannot be empty."),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).or(z.string()).describe("Difficulty level: 'beginner', 'intermediate', or 'advanced' (or other string if necessary)."),
  prerequisites: z.array(z.string()),
  estimated_learning_hours: z.number().int().positive("Estimated learning hours must be a positive integer."),
  practical_applications: z.array(z.string()),
});
export type SkillComponent = z.infer<typeof SkillComponentSchema>;

export const SkillAnalysisSchema = z.object({
  skill_name: z.string().min(1, "Skill name cannot be empty."),
  skill_category: z.string().min(1, "Skill category cannot be empty (e.g., 'technical', 'soft', 'creative')."),
  market_demand: z.string().min(1, "Market demand cannot be empty (e.g., 'high', 'medium', 'low')."),
  components: z.array(SkillComponentSchema).min(1, "There must be at least one skill component if the skill is valid and detailed."),
  learning_path_recommendation: z.string().min(1, "Learning path recommendation cannot be empty."),
  real_world_applications: z.array(z.string()),
  complementary_skills: z.array(z.string()),
  is_skill_valid: z.boolean().describe("True if Skillix can/should teach this skill."),
  viability_reason: z.string().nullable().describe("Reason if not viable, or confirmation if it is. Can be null."),
});
export type SkillAnalysis = z.infer<typeof SkillAnalysisSchema>;


// Interfaz para el contexto del usuario que se pasará a la función
export interface UserSkillContext {
  experience: 'beginner' | 'intermediate' | 'advanced' | string; // ej. 'beginner'
  goal: string; // ej. 'general proficiency', 'career advancement'
  time: string; // ej. '15 minutes daily', '1 hour on weekends'
  learning_style?: string; // Opcional, pero bueno tenerlo si el prompt lo usa
}

const SYSTEM_PROMPT_SKILL_ANALYZER = `You are an expert in analyzing skills and breaking them down into learnable components. You also determine if a skill is valid and appropriate for teaching on the Skillix platform.

Skillix Platform Context: Skillix is an online microlearning platform aiming to teach a wide variety of skills safely, ethically, and effectively through short daily lessons. Avoid skills that are dangerous, illegal, unethical, hateful, promote misinformation, or are impossible to teach remotely and safely.

Your responsibilities:
1.  VALIDATE SKILL: First and foremost, determine if the requested skill is valid and appropriate for Skillix. Consider safety, legality, ethics, and teachability via online microlearning. Populate 'is_skill_valid' (boolean) and 'viability_reason' (string - explain why if not valid, or brief confirmation if valid, can be null if valid and reason is obvious).
2.  If 'is_skill_valid' is true, then:
    a.  DECOMPOSE the skill into 3-7 manageable sub-skills/components.
    b.  For each component: provide name, description, difficulty_level ('beginner', 'intermediate', 'advanced'), prerequisites, estimated_learning_hours, and practical_applications.
    c.  IDENTIFY skill_category, market_demand.
    d.  SUGGEST learning_path_recommendation.
    e.  LIST real_world_applications and complementary_skills for the overall skill.

Analysis Framework (if skill is valid):
- Start with the end goal. Break into atomic, teachable units.
- Consider cognitive load, complexity, and map dependencies.
- Include practical applications.

Remember to consider (for valid skills):
- Industry standards, common pitfalls, transferable skills, market trends.

IMPORTANT: You MUST ALWAYS respond with a valid JSON object that strictly matches the following SkillAnalysis structure. Ensure all string fields that describe something (like skill_name, description, recommendation) are not empty if the skill is valid. 'estimated_learning_hours' must be a positive integer. 'components' array should not be empty if the skill is valid and detailed.
{
  "skill_name": "string (the skill being analyzed)",
  "skill_category": "string",
  "market_demand": "string",
  "components": [
    {
      "name": "string",
      "description": "string",
      "difficulty_level": "string ('beginner', 'intermediate', or 'advanced')",
      "prerequisites": ["string"],
      "estimated_learning_hours": number,
      "practical_applications": ["string"]
    }
  ],
  "learning_path_recommendation": "string",
  "real_world_applications": ["string"],
  "complementary_skills": ["string"],
  "is_skill_valid": boolean,
  "viability_reason": "string or null"
}

If the skill is clearly not valid (e.g., "Learn to build a bomb"), 'is_skill_valid' should be false, 'viability_reason' should explain why, and other fields like 'components' can be an empty array or minimal, but 'skill_name' should still reflect the input.
`;

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

  console.log(`Solicitando análisis de habilidad para: "${skill}"`);

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
    // Validar con Zod
    const validatedAnalysis = SkillAnalysisSchema.parse(rawAnalysisResult);
    
    // Si is_skill_valid es true, pero components está vacío, podría ser un problema de generación del LLM.
    if (validatedAnalysis.is_skill_valid && validatedAnalysis.components.length === 0) {
        console.warn(`Skill "${skill}" marcada como válida pero no tiene componentes. Revisar output del LLM.`);
        // Podrías decidir si esto es un error o si es aceptable en algunos casos.
        // Por ahora, lo permitimos pero logueamos una advertencia.
    }
    
    console.log(`Análisis de habilidad completado y validado para: "${skill}". Viable: ${validatedAnalysis.is_skill_valid}`);
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
