#!/usr/bin/env ts-node

import { StandaloneLearningSimulator } from '../simulators/standalone-simulator';

interface PerformanceTestOptions {
  iterations: number;
  concurrency: number;
  skill: string;
  days: number;
  warmup: boolean;
}

class PerformanceTester {
  private simulator: StandaloneLearningSimulator;
  private results: any[] = [];

  constructor() {
    this.simulator = new StandaloneLearningSimulator({ enableLogging: false });
  }

  async runPerformanceTest(options: PerformanceTestOptions) {
    console.log('🚀 Iniciando Performance Test...\n');
    console.log(`🔄 Iteraciones: ${options.iterations}`);
    console.log(`⚡ Concurrencia: ${options.concurrency}`);
    console.log(`📚 Skill: ${options.skill}`);
    console.log(`📅 Días por journey: ${options.days}`);
    console.log(`🔥 Warmup: ${options.warmup ? 'Sí' : 'No'}\n`);

    // Warmup opcional
    if (options.warmup) {
      await this.performWarmup();
    }

    // Ejecutar test principal
    const startTime = Date.now();
    await this.runConcurrentTests(options);
    const endTime = Date.now();

    // Análisis de resultados
    this.analyzeResults(endTime - startTime, options);
  }

  private async performWarmup() {
    console.log('🔥 Ejecutando warmup...');
    try {
      await this.simulator.simulateCompleteJourney('Warmup', 3);
      console.log('✅ Warmup completado\n');
    } catch (error) {
      console.warn('⚠️  Warmup falló:', error);
    }
  }

  private async runConcurrentTests(options: PerformanceTestOptions) {
    const batches = Math.ceil(options.iterations / options.concurrency);
    
    console.log(`📊 Ejecutando ${batches} batches de ${options.concurrency} tests cada uno...\n`);

    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(options.concurrency, options.iterations - (batch * options.concurrency));
      const promises: Promise<any>[] = [];

      console.log(`🔄 Batch ${batch + 1}/${batches} (${batchSize} tests)...`);

      for (let i = 0; i < batchSize; i++) {
        const testId = (batch * options.concurrency) + i + 1;
        promises.push(this.runSingleTest(testId, options));
      }

      const batchResults = await Promise.allSettled(promises);
      
      const successful = batchResults.filter(r => r.status === 'fulfilled').length;
      const failed = batchResults.filter(r => r.status === 'rejected').length;
      
      console.log(`   ✅ Exitosos: ${successful}, ❌ Fallos: ${failed}`);
    }
  }

  private async runSingleTest(testId: number, options: PerformanceTestOptions): Promise<any> {
    const testStartTime = Date.now();
    
    try {
      const result = await this.simulator.simulateCompleteJourney(
        `${options.skill}-${testId}`, 
        options.days
      );
      
      const testEndTime = Date.now();
      const duration = testEndTime - testStartTime;

      const testResult = {
        testId,
        success: true,
        duration,
        skill: `${options.skill}-${testId}`,
        days: options.days,
        componentsGenerated: {
          skillAnalysis: !!result.skillAnalysis,
          learningPlan: !!result.learningPlan,
          dailyContent: result.dailyContent.length,
          actionTasks: result.actionTasks.length,
          skiMessages: result.skiMessages.length
        },
        timestamp: new Date().toISOString()
      };

      this.results.push(testResult);
      return testResult;

    } catch (error) {
      const testEndTime = Date.now();
      const duration = testEndTime - testStartTime;

      const testResult = {
        testId,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };

      this.results.push(testResult);
      throw testResult;
    }
  }

  private analyzeResults(totalDuration: number, options: PerformanceTestOptions) {
    console.log('\n📊 ANÁLISIS DE PERFORMANCE:');
    console.log('============================');

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);

    console.log(`✅ Tests exitosos: ${successful.length}/${options.iterations}`);
    console.log(`❌ Tests fallidos: ${failed.length}/${options.iterations}`);
    console.log(`📈 Tasa de éxito: ${((successful.length / options.iterations) * 100).toFixed(2)}%`);
    console.log(`⏱️  Tiempo total: ${(totalDuration / 1000).toFixed(2)}s`);

    if (successful.length > 0) {
      const durations = successful.map(r => r.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);
      const medianDuration = durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)];

      console.log(`\n⏱️  TIEMPOS DE RESPUESTA:`);
      console.log(`   • Promedio: ${avgDuration.toFixed(2)}ms`);
      console.log(`   • Mínimo: ${minDuration}ms`);
      console.log(`   • Máximo: ${maxDuration}ms`);
      console.log(`   • Mediana: ${medianDuration}ms`);

      // Throughput
      const totalJourneys = successful.length * options.days;
      const throughputPerSecond = (totalJourneys / (totalDuration / 1000)).toFixed(2);
      
      console.log(`\n🚀 THROUGHPUT:`);
      console.log(`   • Journeys por segundo: ${(successful.length / (totalDuration / 1000)).toFixed(2)}`);
      console.log(`   • Días simulados por segundo: ${throughputPerSecond}`);
      console.log(`   • Total días simulados: ${totalJourneys}`);

      // Percentiles
      const sortedDurations = durations.sort((a, b) => a - b);
      const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
      const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)];

      console.log(`\n📈 PERCENTILES:`);
      console.log(`   • P95: ${p95}ms`);
      console.log(`   • P99: ${p99}ms`);
    }

    if (failed.length > 0) {
      console.log(`\n❌ ERRORES DETECTADOS:`);
      const errorCounts: Record<string, number> = {};
      failed.forEach(f => {
        const error = f.error || 'Unknown error';
        errorCounts[error] = (errorCounts[error] || 0) + 1;
      });

      Object.entries(errorCounts).forEach(([error, count]) => {
        console.log(`   • ${error}: ${count} veces`);
      });
    }

    // Recomendaciones
    this.generateRecommendations(successful, failed, options);
  }

  private generateRecommendations(successful: any[], failed: any[], options: PerformanceTestOptions) {
    console.log(`\n💡 RECOMENDACIONES:`);
    console.log('===================');

    const successRate = successful.length / options.iterations;
    const avgDuration = successful.length > 0 ? 
      successful.reduce((sum, r) => sum + r.duration, 0) / successful.length : 0;

    if (successRate < 0.95) {
      console.log(`⚠️  Tasa de éxito baja (${(successRate * 100).toFixed(1)}%). Revisar estabilidad.`);
    }

    if (avgDuration > 5000) { // > 5 segundos
      console.log(`⚠️  Duración promedio alta (${avgDuration.toFixed(0)}ms). Considerar optimización.`);
    }

    if (options.concurrency > 5 && failed.length > 0) {
      console.log(`⚠️  Fallos con alta concurrencia. Considerar reducir concurrencia.`);
    }

    if (successful.length > 0 && avgDuration < 1000) {
      console.log(`✅ Performance excelente (${avgDuration.toFixed(0)}ms promedio).`);
    }

    if (successRate === 1.0) {
      console.log(`✅ Estabilidad perfecta (100% éxito).`);
    }

    // Recomendaciones específicas para Codex
    console.log(`\n🎯 PARA OPENAI CODEX:`);
    console.log(`   • Usar concurrencia baja (1-3) para mejor estabilidad`);
    console.log(`   • Tests de 3-7 días son ideales para análisis rápido`);
    console.log(`   • Aprovechar exportación JSON para análisis offline`);
  }

  exportResults(fileName?: string) {
    const fs = require('fs');
    const path = require('path');
    
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filePath = path.join(exportDir, fileName || `performance-${Date.now()}.json`);
    const data = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.length,
        successful: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length
      },
      results: this.results
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`\n📁 Resultados exportados a: ${filePath}`);
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  const options: PerformanceTestOptions = {
    iterations: 10,
    concurrency: 3,
    skill: 'JavaScript',
    days: 5,
    warmup: true
  };

  let exportFile: string | undefined;

  // Parsear argumentos
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--iterations':
      case '-i':
        options.iterations = parseInt(args[++i]) || options.iterations;
        break;
      case '--concurrency':
      case '-c':
        options.concurrency = parseInt(args[++i]) || options.concurrency;
        break;
      case '--skill':
      case '-s':
        options.skill = args[++i] || options.skill;
        break;
      case '--days':
      case '-d':
        options.days = parseInt(args[++i]) || options.days;
        break;
      case '--no-warmup':
        options.warmup = false;
        break;
      case '--export':
      case '-e':
        exportFile = args[++i] || `perf-${Date.now()}.json`;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  const tester = new PerformanceTester();
  await tester.runPerformanceTest(options);
  
  if (exportFile) {
    tester.exportResults(exportFile);
  }
}

function showHelp() {
  console.log(`
🚀 Performance Tester for Learning Journey Simulator

Uso: npm run perf:test [opciones]

Opciones:
  -i, --iterations <n>     Número de tests (default: 10)
  -c, --concurrency <n>    Tests concurrentes (default: 3)
  -s, --skill <skill>      Habilidad base (default: JavaScript)
  -d, --days <n>           Días por journey (default: 5)
  --no-warmup              Saltar warmup
  -e, --export <file>      Exportar resultados
  -h, --help               Mostrar ayuda

Ejemplos:
  npm run perf:test
  npm run perf:test -- -i 20 -c 5 -d 3
  npm run perf:test -- --skill "Python" --iterations 50 --export "python-perf.json"

🎯 Perfecto para validar performance en OpenAI Codex!
  `);
}

if (require.main === module) {
  main().catch(console.error);
}

export { PerformanceTester }; 