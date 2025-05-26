const logger = require('../utils/logger');

/**
 * Adaptador para transformar los datos de los agentes Python
 * a la estructura normalizada de Firebase Data Connect
 */
class DataConnectAdapter {
  
  /**
   * Transforma el plan de aprendizaje completo desde los agentes
   */
  async transformLearningPlan(agentData) {
    try {
      const { skill_analysis, learning_plan, pedagogical_analysis } = agentData;
      
      return {
        // Datos principales del plan
        learningPlan: {
          generatedBy: 'openai-gpt4'
        },
        
        // Análisis de habilidades
        skillAnalysis: {
          skill: skill_analysis.skill,
          skillCategory: this.mapSkillCategory(skill_analysis.skill_category),
          marketDemand: this.mapMarketDemand(skill_analysis.market_demand),
          generatedBy: 'openai-gpt4'
        },
        
        // Componentes de la habilidad
        skillComponents: skill_analysis.components.map((comp, idx) => ({
          name: comp.name || comp,
          description: comp.description || '',
          importance: comp.importance || 3,
          order: idx
        })),
        
        // Prerequisitos
        skillPrerequisites: skill_analysis.prerequisites.map((prereq, idx) => ({
          name: prereq.name || prereq,
          description: prereq.description || '',
          isRequired: prereq.required !== false,
          order: idx
        })),
        
        // Caminos profesionales
        careerPaths: skill_analysis.career_paths.map((path, idx) => ({
          title: path.title || path,
          description: path.description || '',
          averageSalary: path.salary || null,
          demandLevel: this.mapMarketDemand(path.demand || 'MEDIUM'),
          order: idx
        })),
        
        // Análisis pedagógico
        pedagogicalAnalysis: {
          cognitivLoadAssessment: pedagogical_analysis.cognitive_load_assessment || 'Balanced'
        },
        
        // Objetivos de aprendizaje
        learningObjectives: pedagogical_analysis.learning_objectives.map((obj, idx) => ({
          objective: obj.objective || obj,
          measurable: obj.measurable !== false,
          timeframe: obj.timeframe || '30 days',
          order: idx
        })),
        
        // Niveles de Bloom
        bloomsTaxonomy: Object.entries(pedagogical_analysis.blooms_distribution || {}).map(([level, percentage]) => ({
          level,
          percentage: parseInt(percentage)
        })),
        
        // Técnicas de engagement
        engagementTechniques: pedagogical_analysis.engagement_techniques.map(tech => ({
          name: tech.name || tech,
          description: tech.description || '',
          frequency: tech.frequency || 'Daily'
        })),
        
        // Métodos de evaluación
        assessmentMethods: pedagogical_analysis.assessment_methods.map(method => ({
          type: method.type || method,
          description: method.description || '',
          frequency: method.frequency || 'Per Section'
        })),
        
        // Secciones del plan
        sections: learning_plan.sections.map((section, idx) => ({
          title: section.title,
          description: section.description || null,
          order: idx,
          days: section.days.map(day => ({
            dayNumber: day.day_number,
            title: day.title,
            focusArea: day.focus_area || '',
            isActionDay: day.is_action_day || false,
            objectives: day.objectives || []
          }))
        }))
      };
      
    } catch (error) {
      logger.error('Error transforming learning plan:', error);
      throw error;
    }
  }
  
  /**
   * Transforma el contenido del día generado
   */
  async transformDayContent(dayData) {
    try {
      const blocks = [];
      
      // Transformar bloques de audio
      if (dayData.audio_blocks) {
        dayData.audio_blocks.forEach((audio, idx) => {
          blocks.push({
            blockType: 'AUDIO',
            title: audio.title,
            xp: audio.xp || 10,
            order: idx,
            estimatedMinutes: Math.ceil((audio.duration || 180) / 60),
            audioContent: {
              audioUrl: audio.audio_url || '',
              transcript: audio.transcript || '',
              duration: audio.duration || 180,
              voiceType: audio.voice || 'es-ES-Standard-A'
            }
          });
        });
      }
      
      // Transformar bloques de lectura
      if (dayData.read_blocks) {
        dayData.read_blocks.forEach((read, idx) => {
          blocks.push({
            blockType: 'READ',
            title: read.title,
            xp: read.xp || 15,
            order: blocks.length,
            estimatedMinutes: read.estimated_time || 5,
            readContent: {
              content: read.content,
              estimatedReadTime: read.estimated_time || 5,
              keyConcepts: (read.key_concepts || []).map((concept, cidx) => ({
                concept: concept.term || concept,
                definition: concept.definition || '',
                order: cidx
              }))
            }
          });
        });
      }
      
      // Transformar quizzes
      if (dayData.quiz_blocks) {
        dayData.quiz_blocks.forEach((quiz, idx) => {
          blocks.push({
            blockType: 'QUIZ_MCQ',
            title: quiz.title || 'Quiz de comprensión',
            xp: quiz.xp || 20,
            order: blocks.length,
            estimatedMinutes: quiz.estimated_time || 3,
            quizContent: {
              questions: quiz.questions.map((q, qidx) => ({
                question: q.question,
                correctAnswer: q.correct_answer,
                explanation: q.explanation || '',
                order: qidx,
                options: q.options.map((opt, oidx) => ({
                  optionText: opt,
                  isCorrect: opt === q.correct_answer,
                  order: oidx
                }))
              }))
            }
          });
        });
      }
      
      // Transformar tareas de acción
      if (dayData.action_tasks) {
        dayData.action_tasks.forEach((task, idx) => {
          blocks.push({
            blockType: 'ACTION_TASK',
            title: task.title,
            xp: task.xp || 50,
            order: blocks.length,
            estimatedMinutes: task.estimated_time || 30,
            actionTask: {
              taskType: task.type || 'practice',
              description: task.description,
              instructions: task.instructions || '',
              estimatedTime: task.estimated_time || 30,
              steps: (task.steps || []).map((step, sidx) => ({
                instruction: step,
                order: sidx
              })),
              deliverables: (task.deliverables || []).map((deliverable, didx) => ({
                description: deliverable.description || deliverable,
                type: deliverable.type || 'document',
                order: didx
              }))
            }
          });
        });
      }
      
      return {
        objectives: dayData.objectives || [],
        blocks
      };
      
    } catch (error) {
      logger.error('Error transforming day content:', error);
      throw error;
    }
  }
  
  /**
   * Mapea categorías de habilidades
   */
  mapSkillCategory(category) {
    const mapping = {
      'technical': 'TECHNICAL',
      'creative': 'CREATIVE',
      'business': 'BUSINESS',
      'personal': 'PERSONAL_DEVELOPMENT',
      'language': 'LANGUAGE'
    };
    return mapping[category?.toLowerCase()] || 'OTHER';
  }
  
  /**
   * Mapea niveles de demanda de mercado
   */
  mapMarketDemand(demand) {
    const mapping = {
      'high': 'HIGH',
      'alta': 'HIGH',
      'medium': 'MEDIUM',
      'media': 'MEDIUM',
      'low': 'LOW',
      'baja': 'LOW'
    };
    return mapping[demand?.toLowerCase()] || 'MEDIUM';
  }
  
  /**
   * Mapea riesgo de abandono
   */
  mapChurnRisk(risk) {
    const mapping = {
      'low': 'LOW',
      'bajo': 'LOW',
      'medium': 'MEDIUM',
      'medio': 'MEDIUM',
      'high': 'HIGH',
      'alto': 'HIGH'
    };
    return mapping[risk?.toLowerCase()] || 'MEDIUM';
  }
  
  /**
   * Transforma datos de analytics
   */
  transformAnalytics(analyticsData) {
    return {
      totalXp: analyticsData.total_xp || 0,
      sessionsCount: analyticsData.sessions_count || 0,
      averageSessionTime: analyticsData.avg_session_time || 0,
      blocksCompleted: analyticsData.blocks_completed || 0,
      quizAvgScore: analyticsData.quiz_avg_score || null,
      currentStreak: analyticsData.current_streak || 0,
      longestStreak: analyticsData.longest_streak || 0,
      preferredLearningTime: analyticsData.preferred_time || null,
      engagementScore: analyticsData.engagement_score || null,
      churnRisk: this.mapChurnRisk(analyticsData.churn_risk)
    };
  }
}

module.exports = new DataConnectAdapter(); 