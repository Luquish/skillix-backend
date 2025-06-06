import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import * as DataConnectService from '../../src/services/dataConnect.service';
import { generateAndSaveContentForDay } from '../../src/services/contentOrchestrator.service';
import { OnboardingDataForPlanner, generateLearningPlanWithOpenAI } from '../../src/services/llm/learningPlanner.service';
import { SkillAnalysis } from '../../src/services/llm/schemas';
import { analyzeSkillWithOpenAI, UserSkillContext } from '../../src/services/llm/skillAnalyzer.service';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

// Mock de la base de datos en memoria para la simulación
const inMemoryDB = {
  users: new Map<string, any>(),
  learningPlans: new Map<string, any>(),
  days: new Map<string, any>()
};

// Mock de los servicios de DataConnect para no llamar a la base de datos real
// Reemplazamos las funciones directamente en el módulo importado.
(DataConnectService as any).getUserById = async (userId: string) => inMemoryDB.users.get(userId);
(DataConnectService as any).getLearningPlanStructureFromDB = async (planId: string) => inMemoryDB.learningPlans.get(planId);
(DataConnectService as any).saveDailyContentDetailsInDB = async (dayId: string, content: any) => {
    const day = inMemoryDB.days.get(dayId);
    if (day) {
      const updatedDay = { ...day, ...content };
      inMemoryDB.days.set(dayId, updatedDay);
      console.log(`\n[DB MOCK] Contenido del día ${day.dayNumber} guardado.`);
      return true;
    }
    return false;
};
(DataConnectService as any).updateUserEnrollmentProgress = async (userId: string, planId: string, dayNumber: number) => {
    console.log(`\n[DB MOCK] Progreso actualizado para el usuario ${userId}, día ${dayNumber}.`);
    return;
};

async function simulateOnboarding() {
  console.log('--- Iniciando Simulación de Onboarding ---');

  const useAutocomplete = await askQuestion("¿Usar autocompletado para 'Marketing Digital' (s/n)?: ");

  let skill: string;
  let experienceLevel: UserSkillContext['experience'];
  let motivation: string;
  let availableTimeMinutes: number;
  let learningStyle: any;
  let goal: string;

  if (useAutocomplete.toLowerCase() === 's') {
    console.log("Usando datos de autocompletado...");
    skill = 'Marketing Digital';
    experienceLevel = 'BEGINNER';
    motivation = 'Crecer profesionalmente y adquirir nuevas habilidades.';
    availableTimeMinutes = 10;
    learningStyle = 'VISUAL';
    goal = 'Obtener un conocimiento fundamental del marketing digital para aplicarlo en proyectos personales o futuros trabajos.';
  } else {
    skill = await askQuestion('¿Qué habilidad quieres aprender? (ej: "Aprender a programar en TypeScript"): ');
    experienceLevel = await askQuestion('¿Cuál es tu nivel de experiencia? (BEGINNER, INTERMEDIATE, ADVANCED): ') as UserSkillContext['experience'];
    motivation = await askQuestion('¿Cuál es tu motivación para aprender esto?: ');
    availableTimeMinutes = parseInt(await askQuestion('¿Cuántos minutos al día puedes dedicar? (ej: 30): '), 10);
    learningStyle = await askQuestion('¿Cuál es tu estilo de aprendizaje preferido? (VISUAL, AUDITORY, KINESTHETIC, READING_WRITING, MIXED): ') as any;
    goal = await askQuestion('¿Cuál es tu objetivo final?: ');
  }

  const userContext: UserSkillContext = {
    experience: experienceLevel,
    time: `${availableTimeMinutes} minutes`,
    goal,
    learning_style: learningStyle
  };
  
  console.log('\n--- Analizando Habilidad ---');
  const skillAnalysis: SkillAnalysis | null = await analyzeSkillWithOpenAI(skill, userContext);

  if (!skillAnalysis || !skillAnalysis.isSkillValid) {
    console.log('❌ Análisis de habilidad fallido o la habilidad no es viable.');
    return null;
  }
   console.log('✅ Análisis de Habilidad Completado.');

  console.log('\n--- Generando Plan de Aprendizaje ---');
  
  const onboardingData: OnboardingDataForPlanner = {
      skill,
      ...userContext,
      name: "Usuario Simulado",
  };

  const learningPlan = await generateLearningPlanWithOpenAI({
    onboardingData: onboardingData,
    skillAnalysis: skillAnalysis,
  });
  
  if (learningPlan) {
    console.log('\n✅ Plan de Aprendizaje Generado Exitosamente:');
    console.log(`   - Skill: ${learningPlan.skillName}`);
    console.log(`   - Duración: ${learningPlan.totalDurationWeeks} semanas`);
    console.log(`   - Secciones: ${learningPlan.sections.length}`);
    
    // Guardar en la DB mock
    const userId = 'user_simulated_1';
    const planId = 'plan_simulated_1';
    const userMock = { id: userId, name: 'Usuario Simulado', preferences: { skill, experienceLevel, motivation, availableTimeMinutes, learningStyle, goal } };
    inMemoryDB.users.set(userId, userMock);
    
    const dbPlan = { 
        ...learningPlan, 
        id: planId, 
        userId,
        sections: learningPlan.sections.map((section, sIdx) => ({
            ...section,
            id: `section_${sIdx}`,
            days: section.days.map((day, dIdx) => ({ ...day, id: `day_${sIdx}_${dIdx}`}))
        }))
    };
    inMemoryDB.learningPlans.set(planId, dbPlan);
    dbPlan.sections.forEach(s => s.days.forEach(d => inMemoryDB.days.set(d.id, d)));

    // Guardar los mocks en archivos para otras pruebas
    const fixturesDir = path.join(__dirname, '../fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    fs.writeFileSync(path.join(fixturesDir, 'simulated-plan.json'), JSON.stringify(dbPlan, null, 2));
    fs.writeFileSync(path.join(fixturesDir, 'simulated-user.json'), JSON.stringify(userMock, null, 2));
    console.log(`\n[INFO] Plan y usuario de simulación guardados en ${fixturesDir}`);
    
    return { userId, planId };
  } else {
    console.log('\n❌ Fallo al generar el plan de aprendizaje.');
    return null;
  }
}

async function simulateContentGeneration(userId: string, planId: string, dayNumber: number) {
  console.log(`\n--- Iniciando Simulación de Generación de Contenido para el día ${dayNumber} ---`);
  
  const result = await generateAndSaveContentForDay({
    userId,
    learningPlanId: planId,
    dayNumber,
  });

  if (result.success) {
    console.log(`\n✅ ${result.message}`);
    console.log('Contenido generado:');
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    console.log(`\n❌ Error en la generación de contenido: ${result.message}`);
  }
}

async function main() {
  const onboardingResult = await simulateOnboarding();
  
  if (onboardingResult) {
    const { userId, planId } = onboardingResult;
    const continueWithContent = await askQuestion('\n¿Deseas generar el contenido para el Día 1? (s/n): ');
    
    if (continueWithContent.toLowerCase() === 's') {
      await simulateContentGeneration(userId, planId, 1);
    }
  }
  
  rl.close();
}

main(); 