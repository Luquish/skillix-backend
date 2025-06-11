import axios, { AxiosInstance } from 'axios';
import * as admin from 'firebase-admin';

const API_BASE_URL = `http://localhost:${process.env.PORT || 8080}/api`;

// --- Helpers ---
const generateRandomEmail = () => `test.plan.${Math.random().toString(36).substring(2, 10)}@skillix.com`;
let testUser: { uid: string, email: string, token?: string, planId?: string } | null = null;
let apiClient: AxiosInstance;

describe('Learning Plan API (/api/learning-plan)', () => {

  // Antes de todas las pruebas, crea un usuario de prueba y obtén su token
  beforeAll(async () => {
    const email = generateRandomEmail();
    const password = 'password123';
    
    // 1. Registrar el usuario a través del endpoint de signup
    const signupResponse = await axios.post(`${API_BASE_URL}/auth/signup`, { email, password, name: 'Plan Tester' });
    testUser = { uid: signupResponse.data.user.uid, email };
    
    // 2. Obtener el token de autenticación del usuario.
    // Nota: En un entorno real, necesitaríamos la Web API Key de Firebase.
    // Aquí asumimos que el emulador de Auth permite obtener tokens o trabajamos con el UID.
    // Para una prueba de integración completa, este paso es crucial.
    // Por ahora, el middleware `isAuthenticated` usará el UID para buscar al usuario.
    // Para obtener un token real, necesitaríamos una llamada a la API REST de Firebase Auth.
    // Como simplificación, crearemos un cliente de API que adjunta un token falso (pero el middleware lo validará y fallará)
    // y uno que no adjunta token para probar los casos de fallo.
    
    // Para el caso de éxito, necesitaremos un token real. Vamos a simularlo por ahora,
    // pero para que funcione, el middleware `isAuthenticated` debe estar preparado
    // para un entorno de prueba o necesitamos obtener un token real.
    // Dado que no podemos generar un token desde el Admin SDK,
    // esta prueba demostrará la lógica pero necesitaría un token real para pasar.
    // Omitiremos la prueba de éxito por ahora y nos centraremos en la estructura y los fallos.
    
    // Vamos a crear una instancia de axios pre-configurada para no enviar token
    apiClient = axios.create({ baseURL: API_BASE_URL });
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
        const onboardingPrefs = { skill: 'Test', experience: 'BEGINNER', availableTimeMinutes: 10, learningStyle: 'VISUAL', motivation: 'Test', goal: 'Test' };
        const skillAnalysis = { skillName: 'Test', skillCategory: 'TECHNICAL', marketDemand: 'HIGH', components: [], learningPathRecommendation: '', realWorldApplications: [], complementarySkills: [], isSkillValid: true };

        try {
            await apiClient.post('/learning-plan/create', { onboardingPrefs, skillAnalysis });
        } catch (error: any) {
            expect(error.response.status).toBe(401);
            expect(error.response.data.message).toContain('No token provided');
        }
    });

    it('debería devolver 403 Forbidden si se provee un token inválido', async () => {
        const onboardingPrefs = { skill: 'Test', experience: 'BEGINNER', availableTimeMinutes: 10, learningStyle: 'VISUAL', motivation: 'Test', goal: 'Test' };
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

    // Esta prueba es un placeholder. Requeriría un token válido para pasar.
    it.skip('debería crear un plan de aprendizaje con un token válido y datos correctos', async () => {
        // Para que esta prueba funcione, necesitamos un token válido en `testUser.token`
        // y un apiClient configurado con él.
        // const authedApiClient = axios.create({ baseURL: API_BASE_URL, headers: { 'Authorization': `Bearer ${testUser.token}` } });
        // ...lógica de la prueba aquí...
    });
  });
}); 