// Simulador standalone que NO depende de Jest - para CLI tools
import { 
  SkillAnalysis, 
  LearningPlan, 
  DayContent, 
  ActionTask,
  SkiMessage,
  StreakCelebration,
  DailyMotivation 
} from '../../src/services/llm/schemas';

export interface SimulationOptions {
  enableLogging?: boolean;
  simulateErrors?: boolean;
  customResponses?: Record<string, any>;
}

export class StandaloneLearningSimulator {
  private options: SimulationOptions;
  
  constructor(options: SimulationOptions = {}) {
    this.options = { enableLogging: true, ...options };
  }

  private log(message: string) {
    if (this.options.enableLogging) {
      console.log(`🎭 [Simulator] ${message}`);
    }
  }

  /**
   * Simula análisis de habilidad directamente
   */
  async simulateSkillAnalysis(skill: string): Promise<SkillAnalysis> {
    this.log(`Analizando habilidad: ${skill}`);
    
    const mockSkillAnalysis: SkillAnalysis = {
      skillName: skill,
      skillCategory: 'TECHNICAL',
      marketDemand: 'HIGH',
      isSkillValid: true,
      viabilityReason: `${skill} es una habilidad muy demandada en el mercado`,
      learningPathRecommendation: `Comenzar con fundamentos de ${skill}`,
      realWorldApplications: ['Desarrollo web', 'Aplicaciones móviles', 'Software empresarial'],
      complementarySkills: ['HTML', 'CSS', 'TypeScript', 'Node.js'],
      generatedBy: 'standalone-simulation',
      components: [
        {
          name: 'Fundamentos',
          description: `Conceptos básicos de ${skill}`,
          difficultyLevel: 'BEGINNER',
          prerequisitesText: [],
          estimatedLearningHours: 20,
          practicalApplications: ['Variables', 'Funciones', 'Estructuras de control'],
          order: 1
        },
        {
          name: 'Intermedio',
          description: `Conceptos intermedios de ${skill}`,
          difficultyLevel: 'INTERMEDIATE',
          prerequisitesText: ['Fundamentos'],
          estimatedLearningHours: 30,
          practicalApplications: ['Clases', 'Módulos', 'APIs'],
          order: 2
        }
      ]
    };

    // Simular delay realista
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    this.log(`✅ Análisis completado para: ${skill}`);
    return mockSkillAnalysis;
  }

  /**
   * Simula creación de plan de aprendizaje
   */
  async simulateLearningPlanCreation(skillAnalysis: SkillAnalysis): Promise<LearningPlan> {
    this.log(`Creando plan de aprendizaje para: ${skillAnalysis.skillName}`);
    
    const mockLearningPlan: LearningPlan = {
      skillName: skillAnalysis.skillName,
      generatedBy: 'standalone-simulation',
      totalDurationWeeks: 8,
      dailyTimeMinutes: 30,
      skillLevelTarget: 'INTERMEDIATE',
      milestones: [
        `Día 1: Introducción a ${skillAnalysis.skillName}`,
        `Día 3: Variables y Funciones en ${skillAnalysis.skillName}`,
        `Día 5: Proyecto Práctico`,
        `Día 7: Conceptos Avanzados`,
        `Día 10: Proyecto Final`
      ],
      progressMetrics: [
        'Completar ejercicios diarios',
        'Aprobar quizzes con 80%+',
        'Completar proyectos prácticos'
      ],
      flexibilityOptions: [
        'Día de recuperación semanal',
        'Módulos opcionales de profundización'
      ],
      sections: [
        {
          title: 'Fundamentos',
          description: `Aprende los conceptos básicos de ${skillAnalysis.skillName}`,
          order: 1,
          days: []
        }
      ],
      dailyActivities: [
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
          name: `${skillAnalysis.skillName} Official Documentation`,
          urlOrDescription: `https://docs.${skillAnalysis.skillName.toLowerCase()}.org`,
          resourceType: 'documentation',
          order: 1
        },
        {
          name: `${skillAnalysis.skillName} Tutorial`,
          urlOrDescription: `Interactive ${skillAnalysis.skillName} tutorial`,
          resourceType: 'tutorial',
          order: 2
        }
             ],
       pedagogicalAnalysis: undefined
     };

     await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 250));
    
    this.log(`✅ Plan creado para: ${skillAnalysis.skillName}`);
    return mockLearningPlan;
  }

  /**
   * Simula generación de contenido diario
   */
  async simulateContentGeneration(
    learningPlan: LearningPlan, 
    dayNumber: number,
    isActionDay = false
  ): Promise<DayContent> {
    this.log(`Generando contenido para Día ${dayNumber} (Action Day: ${isActionDay})`);
    
         let mockDayContent: DayContent;
     
     if (isActionDay) {
       mockDayContent = {
         title: `Día ${dayNumber}: Proyecto Práctico`,
         is_action_day: true,
         objectives: [
           `Completar objetivos del día ${dayNumber}`,
           'Aplicar conocimientos en proyecto práctico'
         ],
         main_content: null,
         exercises: [],
         action_task: null, // Se genera por separado
         total_xp: 0,
         estimated_time: '45 minutos'
       };
     } else {
       mockDayContent = {
         title: `Día ${dayNumber}: Aprendiendo ${learningPlan.skillName}`,
         is_action_day: false,
         objectives: [
           `Completar objetivos del día ${dayNumber}`,
           `Aprender nuevos conceptos de ${learningPlan.skillName}`
         ],
                    main_content: {
             title: `Contenido principal Día ${dayNumber}`,
             textContent: `Este es el contenido educativo para el día ${dayNumber} sobre ${learningPlan.skillName}. 

## Conceptos Clave

En este día aprenderás conceptos fundamentales que te ayudarán a dominar ${learningPlan.skillName}.

### Ejemplos Prácticos

Veremos ejemplos reales de cómo se usa ${learningPlan.skillName} en la industria.

### Ejercicios

Completarás ejercicios diseñados para reforzar tu comprensión.`,
             keyConcepts: [
               {
                 term: `Concepto ${dayNumber} de ${learningPlan.skillName}`,
                 definition: `Definición del concepto ${dayNumber} relacionado con ${learningPlan.skillName}`,
                 order: 1
               }
             ],
             funFact: `¡Dato curioso del día ${dayNumber} sobre ${learningPlan.skillName}!`,
             xp: 20
           } as any,
         exercises: [
           {
             type: 'quiz_mcq',
             question: `¿Cuál es el concepto clave del día ${dayNumber} en ${learningPlan.skillName}?`,
             options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
             answer: 0,
             explanation: 'La opción A es correcta porque...',
             xp: 20
           }
         ],
         action_task: null,
         total_xp: 40,
         estimated_time: '30 minutos'
       };
     }

    await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 120));
    
    this.log(`✅ Contenido generado para Día ${dayNumber}`);
    return mockDayContent;
  }

  /**
   * Simula generación de Action Day task
   */
  async simulateActionDayTask(dayNumber: number, skillAnalysis: SkillAnalysis): Promise<ActionTask> {
    this.log(`Generando Action Day task para Día ${dayNumber}`);
    
    const mockActionTask: ActionTask = {
      title: `Proyecto del Día ${dayNumber}: ${skillAnalysis.skillName} en Acción`,
      challenge_description: `Construye un proyecto práctico que aplique todo lo que has aprendido sobre ${skillAnalysis.skillName} hasta el día ${dayNumber}`,
      steps: [
        'Paso 1: Planificar la estructura del proyecto',
        'Paso 2: Implementar la funcionalidad básica',
        'Paso 3: Añadir características específicas de ' + skillAnalysis.skillName,
        'Paso 4: Probar y refinar el proyecto'
      ],
      time_estimate: '45 minutos',
      tips: [
        `Comienza con lo más simple en ${skillAnalysis.skillName}`,
        'Prueba frecuentemente tu código',
        'No tengas miedo de experimentar',
        'Consulta la documentación cuando tengas dudas'
      ],
      real_world_context: `Este tipo de proyectos con ${skillAnalysis.skillName} se usan frecuentemente en empresas de tecnología`,
      success_criteria: [
        'El proyecto funciona correctamente',
        'Código limpio y bien comentado',
        'Funcionalidades de ' + skillAnalysis.skillName + ' implementadas correctamente',
        'Proyecto completo y funcional'
      ],
      ski_motivation: `¡Excelente trabajo llegando al día ${dayNumber}! 🚀 ¡Este proyecto con ${skillAnalysis.skillName} consolidará todo tu aprendizaje!`,
      difficulty_adaptation: null,
      xp: 75
    };

    await new Promise(resolve => setTimeout(resolve, 120 + Math.random() * 180));
    
    this.log(`✅ Action Day task generada para Día ${dayNumber}`);
    return mockActionTask;
  }

  /**
   * Simula mensajes motivacionales de Ski
   */
  async simulateSkiMotivation(situation: string = 'daily_greeting_morning', skillName?: string): Promise<SkiMessage> {
    this.log(`Generando mensaje de Ski para: ${situation}`);
    
    const messages = {
      daily_greeting_morning: `¡Buenos días! 🦊☀️ ¡Es hora de conquistar el día con ${skillName || 'nuevos conocimientos'}! ¡Vamos a por ello! 🌟`,
      task_completion: `¡Fantástico trabajo! 🎉 Has completado otro día de aprendizaje. ¡Cada día te acercas más a ser un experto! 💪`,
      milestone_achieved: `¡INCREÍBLE! 🏆 Has alcanzado un hito importante. ¡Tu dedicación es inspiradora! 🌟`,
      user_struggling: `¡Hey, no te rindas! 💪 Todos los expertos pasaron por donde tú estás ahora. ¡Sigue adelante, puedes hacerlo! 🦊`,
      action_day_start: `¡Día de acción! 🚀 Hoy vas a poner en práctica todo lo que has aprendido. ¡Esto será emocionante! 🎯`
    };

    const animations = {
      daily_greeting_morning: 'waving_enthusiastically',
      task_completion: 'celebration_dance',
      milestone_achieved: 'jumping_with_joy',
      user_struggling: 'supportive_hug',
      action_day_start: 'excited_preparation'
    };

    const styles = {
      daily_greeting_morning: 'energetic',
      task_completion: 'celebratory',
      milestone_achieved: 'celebratory',
      user_struggling: 'supportive',
      action_day_start: 'encouraging'
    } as const;

    const mockSkiMessage: SkiMessage = {
      message: messages[situation as keyof typeof messages] || messages.daily_greeting_morning,
      emoji_style: styles[situation as keyof typeof styles] || 'encouraging',
      animation_suggestion: animations[situation as keyof typeof animations] || 'friendly_wave'
    };

    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    this.log(`✅ Mensaje de Ski generado`);
    return mockSkiMessage;
  }

  /**
   * Simula el journey completo
   */
  async simulateCompleteJourney(skill: string, days: number = 7): Promise<{
    skillAnalysis: SkillAnalysis,
    learningPlan: LearningPlan,
    dailyContent: DayContent[],
    actionTasks: ActionTask[],
    skiMessages: SkiMessage[]
  }> {
    this.log(`🚀 Iniciando journey completo para ${skill} - ${days} días`);
    
    // 1. Análisis de habilidad
    const skillAnalysis = await this.simulateSkillAnalysis(skill);

    // 2. Plan de aprendizaje
    const learningPlan = await this.simulateLearningPlanCreation(skillAnalysis);

    // 3. Contenido diario y action days
    const dailyContent: DayContent[] = [];
    const actionTasks: ActionTask[] = [];
    const skiMessages: SkiMessage[] = [];

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
      const situation = day === 1 ? 'daily_greeting_morning' : 
                       isActionDay ? 'action_day_start' : 'task_completion';
      const skiMsg = await this.simulateSkiMotivation(situation, skill);
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
}

// Instancia singleton para uso fácil
export const standaloneLearningSimulator = new StandaloneLearningSimulator(); 