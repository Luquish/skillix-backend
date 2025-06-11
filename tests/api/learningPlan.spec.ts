import axios, { AxiosInstance } from 'axios';
import * as admin from 'firebase-admin';
import { getTestUserAuthToken } from '../helpers/auth.helper';

const API_BASE_URL = `http://localhost:${process.env.PORT || 8080}/api`;

// --- Helpers ---
const generateRandomEmail = () => `test.plan.${Math.random().toString(36).substring(2, 10)}@skillix.com`;
let testUser: { uid: string, email: string, token?: string | null, planId?: string } | null = null;
let apiClient: AxiosInstance;

describe('Learning Plan API (/api/learning-plan)', () => {

  // Antes de todas las pruebas, crea un usuario de prueba y obtén su token
  beforeAll(async () => {
    // Asegurarse de que la app de admin está inicializada para el cleanup
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }

    const email = generateRandomEmail();
    const password = 'password123';
    
    // 1. Registrar el usuario a través del endpoint de signup
    const signupResponse = await axios.post(`${API_BASE_URL}/auth/signup`, { email, password, name: 'Plan Tester' });
    testUser = { uid: signupResponse.data.user.uid, email };
    
    // 2. Obtener el token de autenticación del usuario usando el helper.
    testUser.token = await getTestUserAuthToken(email, password);
    
    // Crear una instancia de axios pre-configurada
    apiClient = axios.create({ 
        baseURL: API_BASE_URL,
        headers: {
            'Authorization': `Bearer ${testUser.token}`
        }
     });
  });

  // Después de todo, limpiar el usuario
  afterAll(async () => {
    if (testUser?.uid) {
      await admin.auth().deleteUser(testUser.uid);
      console.log(`[Test Cleanup] Usuario de plan ${testUser.uid} eliminado.`);
    }
  });

  describe('POST /create', () => {
    it('debería devolver 401 Unauthorized si no se provee un token', async () => {
        const onboardingPrefs = { skill: 'Test', experienceLevel: 'BEGINNER', availableTimeMinutes: 10, learningStyle: 'VISUAL', motivation: 'Test', goal: 'Test' };
        const skillAnalysis = { skillName: 'Test', skillCategory: 'TECHNICAL', marketDemand: 'HIGH', components: [], learningPathRecommendation: '', realWorldApplications: [], complementarySkills: [], isSkillValid: true };
        
        const unauthedClient = axios.create({ baseURL: API_BASE_URL });
        try {
            await unauthedClient.post('/learning-plan/create', { onboardingPrefs, skillAnalysis });
        } catch (error: any) {
            expect(error.response.status).toBe(401);
            expect(error.response.data.message).toContain('No token provided');
        }
    });

    it('debería devolver 403 Forbidden si se provee un token inválido', async () => {
        const onboardingPrefs = { skill: 'Test', experienceLevel: 'BEGINNER', availableTimeMinutes: 10, learningStyle: 'VISUAL', motivation: 'Test', goal: 'Test' };
        const skillAnalysis = { skillName: 'Test', skillCategory: 'TECHNICAL', marketDemand: 'HIGH', components: [], learningPathRecommendation: '', realWorldApplications: [], complementarySkills: [], isSkillValid: true };
        
        const invalidApiClient = axios.create({ 
            baseURL: API_BASE_URL,
            headers: { 'Authorization': 'Bearer invalid-token-123' }
        });

        try {
            await invalidApiClient.post('/learning-plan/create', { onboardingPrefs, skillAnalysis });
        } catch (error: any) {
            expect(error.response.status).toBe(403);
            expect(error.response.data.message).toContain('Invalid or expired token');
        }
    });

    it('debería crear un plan de aprendizaje con un token válido y datos correctos', async () => {
        expect(testUser?.token).toBeDefined();

        const onboardingPrefs = { skill: 'TypeScript', experience: 'BEGINNER', availableTimeMinutes: 30, learningStyle: 'KINESTHETIC', motivation: 'Career Change', goal: 'Build a web app' };
        const skillAnalysis = { skillName: 'TypeScript', skillCategory: 'TECHNICAL', marketDemand: 'HIGH', components: [{ name: 'Basics', description: '...', difficultyLevel: 'BEGINNER', prerequisites: [], estimatedLearningHours: 10, practical_applications: [] }], learningPathRecommendation: 'Start with basics', realWorldApplications: ['Web Dev'], complementarySkills: ['JavaScript'], isSkillValid: true, viability_reason: 'Highly popular and in-demand language' };
        
        const response = await apiClient.post('/learning-plan/create', { onboardingPrefs, skillAnalysis });
        
        expect(response.status).toBe(201);
        expect(response.data.message).toBe('Learning plan created successfully!');
        expect(response.data.planId).toBeDefined();
    }, 30000); // Aumentar el timeout para esta prueba por si la llamada al LLM tarda
  });
}); 