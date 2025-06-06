import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { generateAndSaveContentForDay } from '../../src/services/contentOrchestrator.service';
import * as DataConnectService from '../../src/services/dataConnect.service';

dotenv.config();

// --- Mock de la base de datos en memoria ---
const inMemoryDB = {
  users: new Map<string, any>(),
  learningPlans: new Map<string, any>(),
  days: new Map<string, any>()
};

// --- Mock de los servicios de DataConnect ---
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
};

async function testGenerateNextDay() {
  console.log('--- Iniciando Prueba: Generación de Contenido del Día Siguiente ---');

  // 1. Cargar datos de prueba desde los fixtures
  const fixturesDir = path.join(__dirname, '../fixtures');
  let planData, userData;
  try {
    planData = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'simulated-plan.json'), 'utf-8'));
    userData = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'simulated-user.json'), 'utf-8'));
  } catch (error) {
    console.error(`❌ Error: No se pudieron cargar los archivos de fixture.`);
    console.error('Asegúrate de ejecutar la simulación de onboarding (`pnpm simulate`) primero para generar los archivos `simulated-plan.json` y `simulated-user.json`.');
    return;
  }
  
  // 2. Poblar la base de datos en memoria
  inMemoryDB.users.set(userData.id, userData);
  inMemoryDB.learningPlans.set(planData.id, planData);
  planData.sections.forEach((s: any) => s.days.forEach((d: any) => inMemoryDB.days.set(d.id, d)));
  console.log(`[INFO] Datos de prueba cargados en la base de datos en memoria.`);

  // 3. Definir el día a generar (el día siguiente al primero)
  const dayToGenerate = 2;
  console.log(`[INFO] Intentando generar contenido para el Día ${dayToGenerate}...`);

  // 4. Ejecutar el orquestador de contenido
  const result = await generateAndSaveContentForDay({
    userId: userData.id,
    learningPlanId: planData.id,
    dayNumber: dayToGenerate,
  });

  // 5. Mostrar resultado
  if (result.success) {
    console.log(`\n✅ PRUEBA EXITOSA: ${result.message}`);
    console.log('Contenido generado para el Día 2:');
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    console.log(`\n❌ PRUEBA FALLIDA: ${result.message}`);
  }
}

testGenerateNextDay(); 