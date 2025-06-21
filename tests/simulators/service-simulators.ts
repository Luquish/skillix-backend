// Mock del servicio OpenAI
import { 
  analyzeSkillWithOpenAI, 
  UserSkillContext 
} from '../../src/services/llm/skillAnalyzer.service';
import { 
  generateLearningPlanWithOpenAI,
  OnboardingDataForPlanner,
  LearningPlanInput 
} from '../../src/services/llm/learningPlanner.service';
import { 
  generateDailyContentStructureWithOpenAI,
  generateActionDayTaskWithOpenAI,
  ContentGenerationInput,
  ActionDayInput 
} from '../../src/services/llm/contentGenerator.service';
import { 
  getSkiMotivationalMessage,
  getSkiStreakCelebration,
  getSkiDailyMotivation 
} from '../../src/services/llm/toviTheFox.service';
import { getOpenAiChatCompletion } from '../../src/services/llm/openai.service';
import { 
  SkillAnalysis, 
  LearningPlan, 
  DayContent, 
  ActionTask,
  SkiMessage,
  StreakCelebration,
  DailyMotivation 
} from '../../src/services/llm/schemas';

jest.mock('../../src/services/llm/openai.service');
const mockGetOpenAiChatCompletion = getOpenAiChatCompletion as jest.MockedFunction<typeof getOpenAiChatCompletion>;

export interface SimulationOptions {
  enableLogging?: boolean;
  simulateErrors?: boolean;
  customResponses?: Record<string, any>;
}

export class LearningJourneySimulator {
  private options: SimulationOptions;
  
  constructor(options: SimulationOptions = {}) {
    this.options = { enableLogging: true, ...options };
  }

  private log(message: string) {
    if (this.options.enableLogging) {
      console.log(`🎭 [Simulator] ${message}`);
    }
  }

  private createMockUser(overrides = {}) {
    return {
      firebaseUid: 'mock-user-123',
      name: 'Usuario Simulado',
      email: 'simulado@test.com',
      ...overrides
    };
  }

  private createMockUserContext(skill = 'JavaScript'): UserSkillContext {
    return {
      experience: 'beginner',
      goal: 'Convertirse en desarrollador web',
      time: '30 minutos diarios',
      learning_style: 'visual',
      preferred_study_time: 'morning',
      learning_context: 'career_change',
      challenge_preference: 'gradual'
    };
  }

  /**
   * Simula el análisis completo de una habilidad
   */
  async simulateSkillAnalysis(skill: string): Promise<SkillAnalysis | null> {
    this.log(`Analizando habilidad: ${skill}`);
    
    const mockSkillAnalysis = {
      skillName: skill,
      skillCategory: 'TECHNICAL' as const,
      marketDemand: 'HIGH' as const,
      isSkillValid: true,
      viabilityReason: `${skill} es una habilidad muy demandada en el mercado`,
      learningPathRecommendation: `Comenzar con fundamentos de ${skill}`,
      realWorldApplications: ['Desarrollo web', 'Aplicaciones móviles'],
      complementarySkills: ['HTML', 'CSS', 'TypeScript'],
      generatedBy: 'simulation',
      components: [
        {
          name: 'Fundamentos',
          description: `Conceptos básicos de ${skill}`,
          difficultyLevel: 'BEGINNER' as const,
          prerequisitesText: [],
          estimatedLearningHours: 20,
          practicalApplications: ['Variables', 'Funciones'],
          order: 1
        }
      ]
    };

    mockGetOpenAiChatCompletion.mockResolvedValueOnce({
      success: true,
      content: JSON.stringify(mockSkillAnalysis),
      usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
    });

    const result = await analyzeSkillWithOpenAI(skill, this.createMockUserContext(skill));
    this.log(`✅ Análisis completado para: ${skill}`);
    return result;
  }

  /**
   * Simula la creación de un plan de aprendizaje
   */
  async simulateLearningPlanCreation(skillAnalysis: SkillAnalysis): Promise<LearningPlan | null> {
    this.log(`Creando plan de aprendizaje para: ${skillAnalysis.skillName}`);
    
    const mockLearningPlan = {
      total_duration_weeks: 8,
      daily_time_minutes: 30,
      skill_level_target: 'INTERMEDIATE',
      milestones: [
        'Día 1: Introducción a JavaScript',
        'Día 3: Variables y Funciones',
        'Día 5: Proyecto Práctico',
        'Día 7: DOM Manipulation'
      ],
      progress_metrics: ['Completar ejercicios diarios', 'Aprobar quizzes con 80%+'],
      flexibility_options: ['Día de recuperación semanal'],
      daily_activities: [
        {
          type: 'focused_reading',
          duration_minutes: 15,
          description: 'Lectura del contenido principal',
          order: 1
        },
        {
          type: 'interactive_quiz',
          duration_minutes: 10,
          description: 'Ejercicios prácticos',
          order: 2
        },
        {
          type: 'small_exercise',
          duration_minutes: 5,
          description: 'Práctica adicional',
          order: 3
        }
      ],
      resources: [
        {
          name: 'MDN JavaScript Guide',
          url: 'https://developer.mozilla.org/docs/Web/JavaScript',
          order: 1
        }
      ]
    };

    mockGetOpenAiChatCompletion.mockResolvedValueOnce({
      success: true,
      content: JSON.stringify(mockLearningPlan),
      usage: { prompt_tokens: 150, completion_tokens: 300, total_tokens: 450 }
    });

    const planInput: LearningPlanInput = {
      onboardingData: {
        skill: skillAnalysis.skillName,
        experience: 'beginner',
        time: '30 minutos',
        goal: 'Ser desarrollador web'
      },
      skillAnalysis
    };

    const result = await generateLearningPlanWithOpenAI(planInput);
    this.log(`✅ Plan creado para: ${skillAnalysis.skillName}`);
    return result;
  }

  /**
   * Simula la generación de contenido para un día específico
   */
  async simulateContentGeneration(
    learningPlan: LearningPlan, 
    dayNumber: number,
    isActionDay = false
  ): Promise<DayContent | null> {
    this.log(`Generando contenido para Día ${dayNumber} (Action Day: ${isActionDay})`);
    
    const mockDayContent = {
      title: `Día ${dayNumber}: ${isActionDay ? 'Proyecto Práctico' : 'Teoría y Práctica'}`,
      is_action_day: isActionDay,
      objectives: [
        `Completar objetivos del día ${dayNumber}`,
        isActionDay ? 'Aplicar conocimientos en proyecto' : 'Aprender nuevos conceptos'
      ],
      main_content: isActionDay ? null : {
        title: `Contenido principal Día ${dayNumber}`,
        textContent: `Este es el contenido educativo para el día ${dayNumber}...`,
        keyConcepts: [
          {
            term: `Concepto ${dayNumber}`,
            definition: `Definición del concepto ${dayNumber}`,
            order: 1
          }
        ],
        funFact: `Dato curioso del día ${dayNumber}`,
        xp: 20
      },
      exercises: isActionDay ? [] : [
        {
          type: 'quiz_mcq',
          question: `¿Cuál es el concepto clave del día ${dayNumber}?`,
          options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
          answer: 0,
          explanation: 'La opción A es correcta',
          xp: 20
        }
      ],
      action_task: isActionDay ? null : null, // Se genera por separado
      total_xp: isActionDay ? 0 : 40,
      estimated_time: '30 minutos'
    };

    mockGetOpenAiChatCompletion.mockResolvedValueOnce({
      success: true,
      content: JSON.stringify(mockDayContent),
      usage: { prompt_tokens: 120, completion_tokens: 250, total_tokens: 370 }
    });

    const contentInput: ContentGenerationInput = {
      dayInfo: {
        day_number: dayNumber,
        title: mockDayContent.title,
        focus_area: isActionDay ? 'Aplicación práctica' : 'Aprendizaje teórico',
        is_action_day: isActionDay,
        objectives: mockDayContent.objectives
      },
      userData: {
        name: 'Usuario Simulado',
        skill: learningPlan.skillName,
        experience: 'BEGINNER',
        time: '30 minutos',
        goal: 'Aprender efectivamente',
        learning_style: 'visual',
        preferred_study_time: 'morning',
        learning_context: 'career_change',
        challenge_preference: 'gradual'
      }
    };

    const result = await generateDailyContentStructureWithOpenAI(contentInput);
    this.log(`✅ Contenido generado para Día ${dayNumber}`);
    return result;
  }

  /**
   * Simula la generación de una tarea de Action Day
   */
  async simulateActionDayTask(dayNumber: number, skillAnalysis: SkillAnalysis): Promise<ActionTask | null> {
    this.log(`Generando Action Day task para Día ${dayNumber}`);
    
    const mockActionTask = {
      title: `Proyecto del Día ${dayNumber}`,
      challenge_description: `Construye un proyecto práctico aplicando lo aprendido hasta el día ${dayNumber}`,
      steps: [
        'Paso 1: Planificar la estructura',
        'Paso 2: Implementar funcionalidad básica',
        'Paso 3: Añadir características avanzadas',
        'Paso 4: Probar y refinar'
      ],
      time_estimate: '45 minutos',
      tips: [
        'Comienza con lo más simple',
        'Prueba frecuentemente',
        'No tengas miedo de experimentar'
      ],
      real_world_context: 'Este tipo de proyectos se usan en empresas reales',
      success_criteria: [
        'El proyecto funciona correctamente',
        'Código limpio y comentado',
        'Funcionalidades implementadas'
      ],
      ski_motivation: `¡Excelente trabajo llegando al día ${dayNumber}! 🚀 ¡Este proyecto consolidará todo tu aprendizaje!`,
      difficulty_adaptation: null,
      xp: 75
    };

    mockGetOpenAiChatCompletion.mockResolvedValueOnce({
      success: true,
      content: JSON.stringify(mockActionTask),
      usage: { prompt_tokens: 140, completion_tokens: 280, total_tokens: 420 }
    });

    const actionInput: ActionDayInput = {
      dayInfo: {
        day_number: dayNumber,
        title: mockActionTask.title,
        focus_area: 'Aplicación práctica',
        is_action_day: true,
        objectives: ['Aplicar conocimientos', 'Completar proyecto']
      },
      userData: {
        name: 'Usuario Simulado',
        skill: skillAnalysis.skillName,
        experience: 'BEGINNER',
        time: '45 minutos',
        goal: 'Construir proyectos reales',
        learning_style: 'visual',
        preferred_study_time: 'afternoon',
        learning_context: 'skill_improvement',
        challenge_preference: 'moderate'
      },
      skillAnalysisContext: skillAnalysis
    };

    const result = await generateActionDayTaskWithOpenAI(actionInput);
    this.log(`✅ Action Day task generada para Día ${dayNumber}`);
    return result;
  }

  /**
   * Simula mensajes motivacionales de Ski
   */
  async simulateSkiMotivation(situation: string = 'daily_greeting_morning'): Promise<SkiMessage | null> {
    this.log(`Generando mensaje de Ski para: ${situation}`);
    
    const mockSkiMessage = {
      message: `¡Hola! 🦊 ¡Es hora de conquistar el día con nuevo aprendizaje! ¡Vamos a por ello! 🌟`,
      emoji_style: 'encouraging',
      animation_suggestion: 'jumping_with_joy'
    };

    mockGetOpenAiChatCompletion.mockResolvedValueOnce({
      success: true,
      content: JSON.stringify(mockSkiMessage),
      usage: { prompt_tokens: 80, completion_tokens: 120, total_tokens: 200 }
    });

    const result = await getSkiMotivationalMessage({
      userContext: { name: 'Usuario Simulado', skill: 'JavaScript' },
      situation: situation as any
    });

    this.log(`✅ Mensaje de Ski generado`);
    return result;
  }

  /**
   * Simula el journey completo de un usuario por múltiples días
   */
  async simulateCompleteJourney(skill: string, days: number = 7): Promise<{
    skillAnalysis: SkillAnalysis | null,
    learningPlan: LearningPlan | null,
    dailyContent: (DayContent | null)[],
    actionTasks: (ActionTask | null)[],
    skiMessages: (SkiMessage | null)[]
  }> {
    this.log(`🚀 Iniciando journey completo para ${skill} - ${days} días`);
    
    // 1. Análisis de habilidad
    const skillAnalysis = await this.simulateSkillAnalysis(skill);
    if (!skillAnalysis) throw new Error('Failed to simulate skill analysis');

    // 2. Plan de aprendizaje
    const learningPlan = await this.simulateLearningPlanCreation(skillAnalysis);
    if (!learningPlan) throw new Error('Failed to simulate learning plan');

    // 3. Contenido diario y action days
    const dailyContent: (DayContent | null)[] = [];
    const actionTasks: (ActionTask | null)[] = [];
    const skiMessages: (SkiMessage | null)[] = [];

    for (let day = 1; day <= days; day++) {
      const isActionDay = day % 3 === 0; // Cada 3 días es Action Day
      
      // Contenido del día
      const content = await this.simulateContentGeneration(learningPlan, day, isActionDay);
      dailyContent.push(content);

      // Si es Action Day, generar tarea
      if (isActionDay) {
        const actionTask = await this.simulateActionDayTask(day, skillAnalysis);
        actionTasks.push(actionTask);
      }

      // Mensaje motivacional de Ski
      const skiMsg = await this.simulateSkiMotivation(
        day === 1 ? 'daily_greeting_morning' : 'task_completion'
      );
      skiMessages.push(skiMsg);

      this.log(`📅 Día ${day} completado (Action Day: ${isActionDay})`);
    }

    this.log(`🎉 Journey completo simulado para ${skill}!`);
    
    return {
      skillAnalysis,
      learningPlan,
      dailyContent,
      actionTasks,
      skiMessages
    };
  }

  /**
   * Reset de mocks para tests limpios
   */
  resetMocks() {
    jest.clearAllMocks();
  }
}

// Instancia singleton para uso fácil
export const learningSimulator = new LearningJourneySimulator(); 