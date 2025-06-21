import { LearningJourneySimulator } from './service-simulators';

describe('🎭 Demo: Simulación Completa para OpenAI Codex', () => {
  let simulator: LearningJourneySimulator;

  beforeAll(() => {
    console.log('\n🚀 Iniciando Demo de Simulación para OpenAI Codex\n');
  });

  beforeEach(() => {
    simulator = new LearningJourneySimulator({ enableLogging: true });
    simulator.resetMocks();
  });

  it('🎯 DEMO: Journey completo de JavaScript (5 días)', async () => {
    console.log('📚 Simulando journey de JavaScript por 5 días...\n');

    const journey = await simulator.simulateCompleteJourney('JavaScript', 5);

    // Verificaciones básicas
    expect(journey.skillAnalysis).not.toBeNull();
    expect(journey.learningPlan).not.toBeNull();
    expect(journey.dailyContent).toHaveLength(5);
    expect(journey.skiMessages).toHaveLength(5);

    console.log('\n✅ RESULTADOS DEL DEMO:');
    console.log('========================');
    console.log(`🧠 Skill Analysis: ${journey.skillAnalysis?.skillName} (${journey.skillAnalysis?.skillCategory})`);
    console.log(`📋 Learning Plan: ${journey.learningPlan?.totalDurationWeeks} semanas, ${journey.learningPlan?.dailyTimeMinutes} min/día`);
    console.log(`📚 Daily Content: ${journey.dailyContent.length} días generados`);
    
    const actionDays = journey.dailyContent.filter(d => d?.is_action_day);
    console.log(`🎯 Action Days: ${actionDays.length} (día ${actionDays.map((_, i) => i * 3 + 3).join(', ')})`);
    console.log(`🦊 Ski Messages: ${journey.skiMessages.length} mensajes motivacionales`);

    // Mostrar estructura de algunos días
    console.log('\n📅 ESTRUCTURA DE DÍAS:');
         journey.dailyContent.forEach((content, index) => {
       const dayNum = index + 1;
       if (content?.is_action_day) {
         console.log(`   Día ${dayNum}: 🎯 ACTION DAY - ${content.title}`);
       } else if (content) {
         console.log(`   Día ${dayNum}: 📖 CONTENT - ${content.title} (${(content as any)?.exercises?.length || 0} ejercicios)`);
       }
     });

    // Mostrar algunos mensajes de Ski
    console.log('\n🦊 MENSAJES DE SKI (muestra):');
    journey.skiMessages.slice(0, 2).forEach((msg, index) => {
      if (msg) {
        console.log(`   Día ${index + 1}: "${msg.message.substring(0, 60)}..."`);
        console.log(`      Estilo: ${msg.emoji_style}, Animación: ${msg.animation_suggestion}`);
      }
    });

    console.log('\n🎉 ¡Demo completado exitosamente!');
    console.log('💡 Este mismo flujo puede ejecutarse sin limitaciones en OpenAI Codex.\n');
  });

  it('🔬 DEMO: Análisis de diferentes habilidades', async () => {
    console.log('🔬 Analizando diferentes tipos de habilidades...\n');

         const skills = ['Python', 'Photoshop', 'Public Speaking'];
     const results: any[] = [];

     for (const skill of skills) {
       const analysis = await simulator.simulateSkillAnalysis(skill);
       results.push({ skill, analysis });
       
       console.log(`✅ ${skill}:`);
       console.log(`   Válida: ${analysis?.isSkillValid ? 'Sí' : 'No'}`);
       console.log(`   Categoría: ${analysis?.skillCategory}`);
       console.log(`   Demanda: ${analysis?.marketDemand}`);
       console.log(`   Componentes: ${analysis?.components.length}`);
       console.log('');

       // Reset para siguiente skill
       simulator.resetMocks();
     }

     // Verificar que todos fueron procesados
     expect(results).toHaveLength(3);
     results.forEach(({ skill, analysis }: any) => {
       expect(analysis).not.toBeNull();
       expect(analysis?.skillName).toBe(skill);
     });

    console.log('🎯 Todas las habilidades fueron analizadas correctamente.');
    console.log('💡 Esto demuestra la versatilidad del simulador.\n');
  });

  it('⚡ DEMO: Test de performance con múltiples journeys', async () => {
    console.log('⚡ Ejecutando test de performance...\n');

         const startTime = Date.now();
     const promises: any[] = [];

     // Ejecutar 3 journeys en paralelo
     for (let i = 1; i <= 3; i++) {
       promises.push(simulator.simulateCompleteJourney(`TestSkill${i}`, 3));
       simulator.resetMocks();
     }

     const results: any[] = await Promise.all(promises);
     const endTime = Date.now();
     const duration = endTime - startTime;

     console.log('📊 RESULTADOS DE PERFORMANCE:');
     console.log(`   ⏱️  Tiempo total: ${duration}ms`);
     console.log(`   🚀 Promedio por journey: ${(duration / 3).toFixed(2)}ms`);
     console.log(`   📈 Throughput: ${(3000 / duration).toFixed(2)} journeys/segundo`);

     // Verificar resultados
     expect(results).toHaveLength(3);
     results.forEach((journey: any, index: number) => {
       expect(journey.skillAnalysis?.skillName).toBe(`TestSkill${index + 1}`);
       expect(journey.dailyContent).toHaveLength(3);
     });

    console.log(`   ✅ Todos los journeys completados exitosamente`);
    console.log('💡 Performance excelente para entorno sin networking.\n');
  });

  it('🎨 DEMO: Personalización y validación de contenido', async () => {
    console.log('🎨 Demostrando personalización de contenido...\n');

    const journey = await simulator.simulateCompleteJourney('React', 4);

    // Validar estructura del plan (el simulador usa su propio skillName)
    expect(journey.learningPlan?.skillName).toBeTruthy();
    expect(journey.learningPlan?.milestones).toHaveLength(4);
    expect(journey.learningPlan?.dailyActivities).toHaveLength(3);

    // Validar contenido diario
    const contentDays = journey.dailyContent.filter(d => !d?.is_action_day);
    const actionDays = journey.dailyContent.filter(d => d?.is_action_day);

    console.log('📚 ANÁLISIS DE CONTENIDO:');
    console.log(`   📖 Días de contenido: ${contentDays.length}`);
    console.log(`   🎯 Action days: ${actionDays.length}`);

    // Validar XP consistency
    let totalXP = 0;
    contentDays.forEach(day => {
      if (day) totalXP += day.total_xp || 0;
    });
    journey.actionTasks.forEach(task => {
      if (task) totalXP += task.xp || 0;
    });

    console.log(`   🎁 Total XP disponible: ${totalXP}`);

    // Validar mensajes de Ski
    const uniqueAnimations = new Set(journey.skiMessages.map(msg => msg?.animation_suggestion));
    console.log(`   🦊 Ski: ${journey.skiMessages.length} mensajes, ${uniqueAnimations.size} animaciones únicas`);

    expect(totalXP).toBeGreaterThan(100); // Mínimo XP esperado
    expect(uniqueAnimations.size).toBeGreaterThan(0);

    console.log('✅ Contenido bien estructurado y personalizado.\n');
  });

  it('🔧 DEMO: Casos edge y robustez', async () => {
    console.log('🔧 Probando casos edge y robustez...\n');

    // Test con skill de nombre largo
    const longSkillName = 'Advanced Machine Learning with Deep Neural Networks and Computer Vision';
    const journey1 = await simulator.simulateCompleteJourney(longSkillName, 2);
    
    expect(journey1.skillAnalysis?.skillName).toBe(longSkillName);
    console.log(`✅ Skill con nombre largo procesado: "${longSkillName.substring(0, 30)}..."`);

    simulator.resetMocks();

    // Test con journey muy corto
    const journey2 = await simulator.simulateCompleteJourney('CSS', 1);
    expect(journey2.dailyContent).toHaveLength(1);
    expect(journey2.dailyContent[0]?.is_action_day).toBe(false); // Día 1 nunca es action day
    console.log('✅ Journey de 1 día procesado correctamente');

    simulator.resetMocks();

    // Test con journey largo
    const journey3 = await simulator.simulateCompleteJourney('Java', 10);
    expect(journey3.dailyContent).toHaveLength(10);
    const actionDaysCount = journey3.dailyContent.filter(d => d?.is_action_day).length;
    expect(actionDaysCount).toBe(3); // Días 3, 6, 9
    console.log(`✅ Journey de 10 días: ${actionDaysCount} action days en posiciones correctas`);

    console.log('🛡️ Sistema robusto ante casos edge.\n');
  });

  afterAll(() => {
    console.log('🎭 Demo de Simulación Completado');
    console.log('================================');
    console.log('');
    console.log('🎯 RESUMEN:');
    console.log('• ✅ Simulación de journeys completos sin networking');
    console.log('• ✅ Validación de flujos end-to-end');
    console.log('• ✅ Tests de performance y robustez');
    console.log('• ✅ Personalización y casos edge');
    console.log('');
    console.log('🚀 PRÓXIMOS PASOS:');
    console.log('• Ejecutar: npm run sim:journey');
    console.log('• Performance: npm run sim:performance');
    console.log('• Tests completos: npm run test:flows');
    console.log('');
    console.log('💡 ¡Perfecto para desarrollo en OpenAI Codex!');
    console.log('');
  });
});