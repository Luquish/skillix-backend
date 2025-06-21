import axios, { AxiosInstance } from 'axios';
import * as admin from 'firebase-admin';
import { createTestUserAndGetToken } from '../helpers/auth.helper';
import * as crypto from 'crypto';

const API_BASE_URL = `http://localhost:${process.env.PORT || 8080}/api`;

const generateRandomEmail = () => `test.content.${Math.random().toString(36).substring(2, 10)}@skillix.com`;

describe('Content API (/api/content)', () => {
    let testUser: { uid: string, email: string, token?: string | null } | null = null;
    let apiClient: AxiosInstance;
    let learningPlanId: string | null = null;

    beforeAll(async () => {
        if (admin.apps.length === 0) {
            admin.initializeApp();
        }

        const email = generateRandomEmail();
        const password = 'password123';
        const { uid, token } = await createTestUserAndGetToken(email, password);
        testUser = { uid, email, token };
        await axios.post(
            `${API_BASE_URL}/auth/sync-profile`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );

        apiClient = axios.create({ 
            baseURL: API_BASE_URL,
            headers: { 'Authorization': `Bearer ${testUser.token}` }
        });

        // Crear un plan de aprendizaje para usarlo en las pruebas de contenido
        const onboardingPrefs = { skill: 'Testing en NodeJS', experience: 'BEGINNER', time: '15 minutes', motivation: 'Escribir pruebas robustas', goal: 'Testear mi API' };
        const skillAnalysis = {
            skill_name: 'Testing en Node.js',
            skill_category: 'TECHNICAL',
            market_demand: 'HIGH',
            is_skill_valid: true,
            viability_reason: 'Crucial for robust software',
            learning_path_recommendation: 'Start with Jest',
            real_world_applications: ['Backend Dev'],
            complementary_skills: ['TypeScript'],
            components: [{
                name: 'Basics',
                description: '...',
                difficulty_level: 'BEGINNER',
                prerequisites: [],
                estimated_learning_hours: 8,
                practical_applications: [],
            }],
        };
        
        try {
            const planResponse = await apiClient.post('/learning-plan/create', { onboardingPrefs, skillAnalysis });
            learningPlanId = planResponse.data.planId;

        } catch (error: any) {

            throw new Error("La creación del plan de aprendizaje falló en beforeAll, las pruebas no pueden continuar.");
        }
    });

    afterAll(async () => {
        if (testUser?.uid) {
            // Aquí también deberíamos limpiar el plan de aprendizaje, pero por ahora solo el usuario.
            await admin.auth().deleteUser(testUser.uid);

        }
    });

    describe('POST /generate-next', () => {
        it('debería devolver 401 Unauthorized si no se provee un token', async () => {
            const unauthedClient = axios.create({ baseURL: API_BASE_URL });
            try {
                await unauthedClient.post('/content/generate-next', {
                    learningPlanId: 'some-plan-id',
                    completedDayNumber: 1
                });
            } catch (error: any) {
                expect(error.response.status).toBe(401);
                expect(error.response.data.message).toContain('No token provided');
            }
        });

        it('debería devolver 403 Forbidden si se provee un token inválido', async () => {
            const invalidApiClient = axios.create({
                baseURL: API_BASE_URL,
                headers: { 'Authorization': 'Bearer invalid-token-123' }
            });

            try {
                await invalidApiClient.post('/content/generate-next', {
                    learningPlanId: 'some-plan-id',
                    completedDayNumber: 1
                });
            } catch (error: any) {
                expect(error.response.status).toBe(403);
                expect(error.response.data.message).toContain('Invalid or expired token');
            }
        });

        it('debería devolver 404 Not Found si el plan de aprendizaje no existe', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.post('/content/generate-next', {
                    learningPlanId: crypto.randomUUID(),
                    completedDayNumber: 1
                });
            } catch (error: any) {
                expect(error.response.status).toBe(404);
                expect(error.response.data.message).toContain('Learning plan not found');
            }
        });

        it('debería generar contenido para el día siguiente exitosamente', async () => {
            expect(learningPlanId).toBeDefined();
            expect(learningPlanId).not.toBeNull();

            const response = await apiClient.post('/content/generate-next', {
                learningPlanId: learningPlanId,
                completedDayNumber: 1, // Queremos contenido para el día 2
            });

            expect(response.status).toBe(201);
            expect(response.data.success).toBe(true);
            expect(response.data.message).toContain('Content for day 2 generated and saved successfully.');
            expect(response.data.data).toBeDefined();
            expect(response.data.data.title).toBeDefined();
            expect(response.data.data.objectives).toBeInstanceOf(Array);
        });
    });
}); 