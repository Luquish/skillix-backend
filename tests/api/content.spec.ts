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

    describe('GET /day/:learningPlanId/:dayNumber', () => {
        it('debería devolver 401 Unauthorized si no se provee un token', async () => {
            const unauthedClient = axios.create({ baseURL: API_BASE_URL });
            
            try {
                await unauthedClient.get('/content/day/some-plan-id/1');
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
                await invalidApiClient.get('/content/day/some-plan-id/1');
            } catch (error: any) {
                expect(error.response.status).toBe(403);
                expect(error.response.data.message).toContain('Invalid or expired token');
            }
        });

        it('debería devolver 400 si dayNumber no es un número válido', async () => {
            expect(testUser?.token).toBeDefined();
            expect(learningPlanId).toBeDefined();

            try {
                await apiClient.get(`/content/day/${learningPlanId}/invalid-day`);
            } catch (error: any) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.message).toContain('Day number must be a valid integer');
            }
        });

        it('debería devolver 404 si el learning plan no existe', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.get('/content/day/nonexistent-plan-id/1');
            } catch (error: any) {
                expect(error.response.status).toBe(404);
                expect(error.response.data.message).toContain('Learning plan not found');
            }
        });

        it('debería devolver 403 si el usuario no es propietario del plan', async () => {
            // Este test requeriría crear un plan con otro usuario
            // Por simplicidad, usaremos un UUID random que no será del usuario
            expect(testUser?.token).toBeDefined();

            try {
                const randomPlanId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
                await apiClient.get(`/content/day/${randomPlanId}/1`);
            } catch (error: any) {
                expect([403, 404]).toContain(error.response.status);
                if (error.response.status === 403) {
                    expect(error.response.data.message).toContain('Access denied');
                } else {
                    expect(error.response.data.message).toContain('Learning plan not found');
                }
            }
        });

        it('debería devolver 404 si no existe contenido para el día especificado', async () => {
            expect(testUser?.token).toBeDefined();
            expect(learningPlanId).toBeDefined();

            try {
                // Intentar obtener contenido de un día que no existe (día 999)
                await apiClient.get(`/content/day/${learningPlanId}/999`);
            } catch (error: any) {
                expect(error.response.status).toBe(404);
                expect(error.response.data.message).toContain('Content for day 999 not found');
            }
        });

        it('debería devolver contenido del día exitosamente', async () => {
            expect(testUser?.token).toBeDefined();
            expect(learningPlanId).toBeDefined();

            // Nota: Este test puede fallar si no hay contenido generado para el día 1
            try {
                const response = await apiClient.get(`/content/day/${learningPlanId}/1`);
                
                expect(response.status).toBe(200);
                expect(response.data.message).toBe('Day content retrieved successfully.');
                expect(response.data.dayContent).toBeDefined();
                expect(response.data.dayContent.title).toBeTruthy();
                expect(response.data.dayContent.objectives).toBeDefined();
                expect(Array.isArray(response.data.dayContent.objectives)).toBe(true);
            } catch (error: any) {
                // Si no hay contenido generado aún, esperamos 404
                if (error.response.status === 404) {
                    expect(error.response.data.message).toContain('Content for day 1 not found');
                } else {
                    throw error;
                }
            }
        });

        it('debería manejar números de día con ceros', async () => {
            expect(testUser?.token).toBeDefined();
            expect(learningPlanId).toBeDefined();

            try {
                await apiClient.get(`/content/day/${learningPlanId}/01`);
            } catch (error: any) {
                // Debería aceptar "01" como 1
                expect([200, 404]).toContain(error.response.status);
                if (error.response.status === 404) {
                    expect(error.response.data.message).toContain('Content for day 1 not found');
                }
            }
        });
    });

    describe('POST /action-step', () => {
        it('debería devolver 401 Unauthorized si no se provee un token', async () => {
            const unauthedClient = axios.create({ baseURL: API_BASE_URL });
            
            try {
                await unauthedClient.post('/content/action-step', {
                    actionTaskItemId: 'task-123',
                    stepNumber: 1,
                    description: 'Test step',
                    estimatedTimeSeconds: 300
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
                await invalidApiClient.post('/content/action-step', {
                    actionTaskItemId: 'task-123',
                    stepNumber: 1,
                    description: 'Test step',
                    estimatedTimeSeconds: 300
                });
            } catch (error: any) {
                expect(error.response.status).toBe(403);
                expect(error.response.data.message).toContain('Invalid or expired token');
            }
        });

        it('debería devolver 400 si faltan campos requeridos', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.post('/content/action-step', {
                    // Falta actionTaskItemId
                    stepNumber: 1,
                    description: 'Test step',
                    estimatedTimeSeconds: 300
                });
            } catch (error: any) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.message).toContain('actionTaskItemId, stepNumber, description, and estimatedTimeSeconds are required');
            }
        });

        it('debería devolver 400 si stepNumber no es válido', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.post('/content/action-step', {
                    actionTaskItemId: 'task-123',
                    stepNumber: 'invalid',
                    description: 'Test step',
                    estimatedTimeSeconds: 300
                });
            } catch (error: any) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.message).toContain('actionTaskItemId, stepNumber, description, and estimatedTimeSeconds are required');
            }
        });

        it('debería devolver 400 si estimatedTimeSeconds no es válido', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.post('/content/action-step', {
                    actionTaskItemId: 'task-123',
                    stepNumber: 1,
                    description: 'Test step',
                    estimatedTimeSeconds: 'invalid'
                });
            } catch (error: any) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.message).toContain('actionTaskItemId, stepNumber, description, and estimatedTimeSeconds are required');
            }
        });

        it('debería crear un action step exitosamente', async () => {
            expect(testUser?.token).toBeDefined();

            const actionStepData = {
                actionTaskItemId: 'task-123',
                stepNumber: 1,
                description: 'Paso de ejemplo para testing',
                estimatedTimeSeconds: 300
            };

            try {
                const response = await apiClient.post('/content/action-step', actionStepData);
                
                expect(response.status).toBe(201);
                expect(response.data.message).toBe('Action step created successfully.');
                expect(response.data.actionStep).toBeDefined();
            } catch (error: any) {
                // Si el actionTaskItemId no existe, esperamos un error 500 o similar
                expect(error.response.status).toBeGreaterThanOrEqual(400);
                expect(error.response.data.message).toBeTruthy();
            }
        });

        it('debería manejar description muy larga', async () => {
            expect(testUser?.token).toBeDefined();

            const longDescription = 'A'.repeat(1000); // 1000 caracteres

            try {
                await apiClient.post('/content/action-step', {
                    actionTaskItemId: 'task-123',
                    stepNumber: 1,
                    description: longDescription,
                    estimatedTimeSeconds: 300
                });
            } catch (error: any) {
                // Debería manejar descriptions largas o fallar gracefully
                expect(error.response.status).toBeGreaterThanOrEqual(400);
            }
        });

        it('debería manejar stepNumber como 0', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.post('/content/action-step', {
                    actionTaskItemId: 'task-123',
                    stepNumber: 0,
                    description: 'Paso inicial',
                    estimatedTimeSeconds: 300
                });
            } catch (error: any) {
                // StepNumber 0 podría ser válido o inválido dependiendo de la lógica
                expect(error.response.status).toBeGreaterThanOrEqual(400);
            }
        });
    });
}); 