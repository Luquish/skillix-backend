import * as DataConnectService from './dataConnect.service';
import * as ContentGenerator from './llm/contentGenerator.service';
import { SkillAnalysis } from './llm/schemas';
import { CompletionStatus } from './dataConnect.types';
import { DayContent } from './llm/schemas';

interface OrchestratorInput {
  userId: string;
  learningPlanId: string;
  dayNumber: number;
  performanceSummary?: string;
}

interface OrchestratorResult {
  success: boolean;
  message: string;
  statusCode?: number;
  data?: DayContent;
}

/**
 * Orquesta la generación y guardado de contenido para un día específico de un plan.
 */
export const generateAndSaveContentForDay = async (
  input: OrchestratorInput
): Promise<OrchestratorResult> => {
  const { userId, learningPlanId, dayNumber, performanceSummary } = input;
  console.log(`Iniciando generación de contenido para el día ${dayNumber} del plan ${learningPlanId}`);

  // 1. Obtener toda la información necesaria en paralelo
  const [plan, user] = await Promise.all([
    DataConnectService.getLearningPlanStructureById(learningPlanId),
    DataConnectService.getUserByFirebaseUid(userId),
  ]);

  // 2. Validaciones
  if (!plan) {
    return { success: false, message: 'Learning plan not found.', statusCode: 404 };
  }
  if (plan.userFirebaseUid !== userId) {
    return { success: false, message: 'User is not authorized to modify this plan.', statusCode: 403 };
  }
  if (!user) {
    return { success: false, message: 'User profile not found.', statusCode: 404 };
  }
  const totalDays = plan.sections?.flatMap(s => s.days ?? []).length ?? 0;
  if (dayNumber > totalDays) {
    console.log(`Plan ${learningPlanId} completado. No hay más días que generar.`);
    return { success: true, message: 'Learning plan successfully completed. No more content to generate.' };
  }

  // 3. Encontrar los metadatos del día a generar
  const dayMetadata = plan.sections?.flatMap(s => s.days ?? []).find(d => d.dayNumber === dayNumber);
  if (!dayMetadata) {
    return { success: false, message: `Day ${dayNumber} metadata not found in plan structure.`, statusCode: 404 };
  }

  // 4. Construir el input para el servicio de LLM
  const llmInput: ContentGenerator.ContentGenerationInput = {
    dayInfo: {
      day_number: dayMetadata.dayNumber,
      title: dayMetadata.title,
      focus_area: dayMetadata.focusArea,
      is_action_day: dayMetadata.isActionDay,
      objectives: dayMetadata.objectives,
    },
    userData: {
      name: user.name ?? 'Learner',
      skill: plan.skillName,
      experience: plan.skillLevelTarget,
      time: `${plan.dailyTimeMinutes} minutes`,
      learning_style: "MIXED",
      goal: `Aprender ${plan.skillName}`,
    },
    previousDayContentSummary: performanceSummary ? { title: `Day ${dayNumber - 1}`, userPerformance: performanceSummary } : undefined,
    // adaptiveInsights se puede añadir aquí cuando el servicio de analítica esté listo
  };

  // 5. Generar contenido con el LLM
  console.log(`Llamando al LLM para generar contenido para el día ${dayNumber}...`);
  const generatedDayContent = await ContentGenerator.generateDailyContentStructureWithOpenAI(llmInput);

  if (!generatedDayContent) {
    return { success: false, message: 'Failed to generate daily content structure from LLM.', statusCode: 500 };
  }
  
  // Si es un día de acción, generar la tarea específica
  if (generatedDayContent.is_action_day) {
    console.log(`Día de acción detectado. Generando tarea de acción...`);
    const actionTaskInput: ContentGenerator.ActionDayInput = {
      dayInfo: llmInput.dayInfo,
      userData: llmInput.userData,
      skillAnalysisContext: plan.skillAnalysis as SkillAnalysis
    };
    generatedDayContent.action_task = await ContentGenerator.generateActionDayTaskWithOpenAI(actionTaskInput);
  }

  // 6. Guardar el contenido generado en la base de datos
  console.log(`Guardando el contenido generado para el día ${dayNumber} en la base de datos...`);
  const saveSuccess = await DataConnectService.saveDailyContentDetailsInDB(dayMetadata.id, generatedDayContent);
  
  if (!saveSuccess) {
    return { success: false, message: 'Failed to save generated content to the database.', statusCode: 500 };
  }

  // 7. Actualizar el progreso del usuario marcando el día como 'IN_PROGRESS'
  await DataConnectService.updateDayCompletionStatus(dayMetadata.id, CompletionStatus.IN_PROGRESS);
  
  console.log(`Contenido para el día ${dayNumber} del plan ${learningPlanId} generado y guardado exitosamente.`);
  return {
    success: true,
    message: `Content for day ${dayNumber} generated and saved successfully.`,
    data: generatedDayContent,
  };
}; 