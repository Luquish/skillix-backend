#!/usr/bin/env ts-node

import { StandaloneLearningSimulator } from '../simulators/standalone-simulator';

interface JourneyOptions {
  skill: string;
  days: number;
  detailed: boolean;
  export?: string;
}

class JourneyRunner {
  private simulator: StandaloneLearningSimulator;

  constructor() {
    this.simulator = new StandaloneLearningSimulator();
  }

  async runJourney(options: JourneyOptions) {
    console.log('🚀 Iniciando simulación de Learning Journey...\n');
    console.log(`📚 Skill: ${options.skill}`);
    console.log(`📅 Días: ${options.days}`);
    console.log(`🔍 Detallado: ${options.detailed ? 'Sí' : 'No'}\n`);

    try {
      const startTime = Date.now();
      
      // Ejecutar journey completo
      const journey = await this.simulator.simulateCompleteJourney(options.skill, options.days);
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log('\n🎉 ¡Journey completado exitosamente!');
      console.log(`⏱️  Tiempo: ${duration}s\n`);

      // Mostrar resumen
      this.showSummary(journey);

      if (options.detailed) {
        this.showDetailedResults(journey);
      }

      if (options.export) {
        this.exportResults(journey, options.export);
      }

      return journey;

    } catch (error) {
      console.error('❌ Error en la simulación:', error);
      process.exit(1);
    }
  }

  private showSummary(journey: any) {
    console.log('📊 RESUMEN DEL JOURNEY:');
    console.log('========================');
    console.log(`✅ Skill Analysis: ${journey.skillAnalysis ? '✓' : '✗'}`);
    console.log(`✅ Learning Plan: ${journey.learningPlan ? '✓' : '✗'}`);
    console.log(`✅ Daily Content: ${journey.dailyContent.length} días generados`);
    console.log(`✅ Action Tasks: ${journey.actionTasks.length} tareas generadas`);
    console.log(`✅ Ski Messages: ${journey.skiMessages.length} mensajes generados`);
    
    if (journey.skillAnalysis) {
      console.log(`\n🎯 SKILL ANALYSIS:`);
      console.log(`   • Válida: ${journey.skillAnalysis.isSkillValid ? 'Sí' : 'No'}`);
      console.log(`   • Categoría: ${journey.skillAnalysis.skillCategory}`);
      console.log(`   • Demanda: ${journey.skillAnalysis.marketDemand}`);
      console.log(`   • Componentes: ${journey.skillAnalysis.components.length}`);
    }

    if (journey.learningPlan) {
      console.log(`\n📋 LEARNING PLAN:`);
      console.log(`   • Duración: ${journey.learningPlan.totalDurationWeeks} semanas`);
      console.log(`   • Tiempo diario: ${journey.learningPlan.dailyTimeMinutes} minutos`);
      console.log(`   • Nivel objetivo: ${journey.learningPlan.skillLevelTarget}`);
      console.log(`   • Hitos: ${journey.learningPlan.milestones.length}`);
    }

    // Análisis de contenido
    const actionDays = journey.dailyContent.filter((c: any) => c?.is_action_day).length;
    const contentDays = journey.dailyContent.filter((c: any) => !c?.is_action_day).length;
    
    console.log(`\n📚 CONTENIDO GENERADO:`);
    console.log(`   • Días de contenido: ${contentDays}`);
    console.log(`   • Action days: ${actionDays}`);
    console.log(`   • Total XP disponible: ${this.calculateTotalXP(journey)}`);

    console.log('');
  }

  private showDetailedResults(journey: any) {
    console.log('🔍 DETALLES DEL JOURNEY:');
    console.log('========================\n');

    // Detalles por día
    journey.dailyContent.forEach((content: any, index: number) => {
      const dayNum = index + 1;
      console.log(`📅 DÍA ${dayNum}: ${content?.title || 'Sin título'}`);
      
      if (content?.is_action_day) {
        console.log(`   🎯 ACTION DAY`);
        const task = journey.actionTasks.find((t: any) => t?.title.includes(`${dayNum}`));
        if (task) {
          console.log(`   📝 Tarea: ${task.title}`);
          console.log(`   ⏱️  Tiempo: ${task.time_estimate}`);
          console.log(`   🎁 XP: ${task.xp}`);
        }
      } else {
        console.log(`   📖 CONTENT DAY`);
        console.log(`   🎯 Objetivos: ${content?.objectives?.length || 0}`);
        console.log(`   🧠 Conceptos: ${(content?.main_content as any)?.keyConcepts?.length || 0}`);
        console.log(`   ❓ Ejercicios: ${content?.exercises?.length || 0}`);
        console.log(`   🎁 XP: ${content?.total_xp || 0}`);
      }

      const skiMsg = journey.skiMessages[index];
      if (skiMsg) {
        console.log(`   🦊 Ski: "${skiMsg.message.substring(0, 50)}..."`);
      }
      console.log('');
    });

    // Mensajes de Ski
    console.log('🦊 MENSAJES DE SKI:');
    console.log('===================');
    journey.skiMessages.forEach((msg: any, index: number) => {
      if (msg) {
        console.log(`Día ${index + 1}: ${msg.message}`);
        console.log(`   Estilo: ${msg.emoji_style}, Animación: ${msg.animation_suggestion}\n`);
      }
    });
  }

  private exportResults(journey: any, fileName: string) {
    const fs = require('fs');
    const path = require('path');
    
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filePath = path.join(exportDir, fileName);
    const data = {
      timestamp: new Date().toISOString(),
      journey: journey,
      summary: {
        skill: journey.skillAnalysis?.skillName,
        totalDays: journey.dailyContent.length,
        actionDays: journey.dailyContent.filter((c: any) => c?.is_action_day).length,
        totalXP: this.calculateTotalXP(journey),
        planDuration: journey.learningPlan?.totalDurationWeeks,
        dailyTime: journey.learningPlan?.dailyTimeMinutes
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`📁 Resultados exportados a: ${filePath}`);
  }

  private calculateTotalXP(journey: any): number {
    let totalXP = 0;
    
    journey.dailyContent.forEach((content: any) => {
      if (content && !content.is_action_day) {
        totalXP += content.total_xp || 0;
      }
    });

    journey.actionTasks.forEach((task: any) => {
      if (task) {
        totalXP += task.xp || 0;
      }
    });

    return totalXP;
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  // Configuración por defecto
  const options: JourneyOptions = {
    skill: 'JavaScript',
    days: 7,
    detailed: false
  };

  // Parsear argumentos
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--skill':
      case '-s':
        options.skill = args[++i] || options.skill;
        break;
      case '--days':
      case '-d':
        options.days = parseInt(args[++i]) || options.days;
        break;
      case '--detailed':
      case '--verbose':
      case '-v':
        options.detailed = true;
        break;
      case '--export':
      case '-e':
        options.export = args[++i] || `journey-${Date.now()}.json`;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  const runner = new JourneyRunner();
  await runner.runJourney(options);
}

function showHelp() {
  console.log(`
🎭 Learning Journey Simulator

Uso: npm run sim:journey [opciones]

Opciones:
  -s, --skill <skill>      Habilidad a simular (default: JavaScript)
  -d, --days <number>      Número de días (default: 7)
  -v, --detailed           Mostrar detalles completos
  -e, --export <file>      Exportar resultados a archivo JSON
  -h, --help               Mostrar esta ayuda

Ejemplos:
  npm run sim:journey
  npm run sim:journey -- --skill "Python" --days 10 --detailed
  npm run sim:journey -- -s "React" -d 5 -v -e "react-journey.json"

🎯 Ideal para OpenAI Codex - Sin networking, solo simulación pura!
  `);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

export { JourneyRunner }; 