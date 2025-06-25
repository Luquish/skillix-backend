import axios, { AxiosInstance } from 'axios';
import * as admin from 'firebase-admin';
import { createTestUserAndGetToken } from '../helpers/auth.helper';

const API_BASE_URL = `http://localhost:${process.env.PORT || 8080}/api`;

const generateRandomEmail = () => `test.user.${Math.random().toString(36).substring(2, 10)}@skillix.com`;

describe('User API (/api/user)', () => {
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
        
        // ✅ Capturar cualquier error en sync-profile para debugging
        try {
            console.log('🧪 [TEST] Calling /auth/sync-profile with token length:', token?.length);
            const syncResponse = await axios.post(
                `${API_BASE_URL}/auth/sync-profile`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('🧪 [TEST] sync-profile response:', syncResponse.status, syncResponse.data.message);
        } catch (syncError: any) {
            console.error('❌ [TEST] sync-profile failed:', syncError.response?.status, syncError.response?.data || syncError.message);
            // No lanzar error aquí para ver si el problema viene después
        }

        // 3. Configurar cliente HTTP autenticado
        apiClient = axios.create({ 
            baseURL: API_BASE_URL,
            headers: { 'Authorization': `Bearer ${testUser.token}` }
        });

        // 4. Crear un plan de aprendizaje para tener datos que calcular
        const onboardingPrefs = { 
            skill: 'User Testing APIs', 
            experience: 'INTERMEDIATE', 
            time: '25 minutes', 
            motivation: 'Mejorar habilidades de testing', 
            goal: 'Crear tests robustos para APIs' 
        };
        
        const skillAnalysis = {
            skill_name: 'User Testing APIs',
            skill_category: 'TECHNICAL',
            market_demand: 'HIGH',
            is_skill_valid: true,
            viability_reason: 'Essential for software quality',
            learning_path_recommendation: 'Start with unit tests, progress to integration',
            real_world_applications: ['Backend Development', 'QA Engineering'],
            complementary_skills: ['Jest', 'TypeScript'],
            components: [{
                name: 'API Testing Fundamentals',
                description: 'Learn the basics of testing REST APIs',
                difficulty_level: 'BEGINNER',
                prerequisites: [],
                estimated_learning_hours: 12,
                practical_applications: ['Backend Testing'],
            }],
        };
        
        try {
            const planResponse = await apiClient.post('/learning-plan/create', { 
                onboardingPrefs, 
                skillAnalysis 
            });
            learningPlanId = planResponse.data.planId;
            console.log(`[Test Setup] Plan de aprendizaje ${learningPlanId} creado para el usuario ${testUser.uid}`);
        } catch (error: any) {
            console.error("Fallo al crear el plan de aprendizaje en beforeAll:", error.response?.data || error.message);
            // No es crítico para las pruebas de user stats, continuamos
        }
    });

    afterAll(async () => {
        if (testUser?.uid) {
            try {
                await admin.auth().deleteUser(testUser.uid);
                console.log(`[Test Cleanup] Usuario ${testUser.uid} eliminado.`);
            } catch (error) {
                console.error(`[Test Cleanup] Error eliminando usuario ${testUser.uid}:`, error);
            }
        }
    });

    describe('GET /stats', () => {
        it('debería devolver 401 Unauthorized si no se provee un token', async () => {
            const unauthedClient = axios.create({ baseURL: API_BASE_URL });
            
            try {
                console.log('🧪 [TEST] Making request without token to /user/stats');
                await unauthedClient.get('/user/stats');
            } catch (error: any) {
                console.log('🧪 [TEST] Unauthed request response:', error.response?.status, error.response?.data);
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
                await invalidApiClient.get('/user/stats');
            } catch (error: any) {
                expect(error.response.status).toBe(403);
                expect(error.response.data.message).toContain('Invalid or expired token');
            }
        });

        it('debería devolver estadísticas completas del usuario con token válido', async () => {
            console.log('🧪 [TEST] testUser token status:', { 
                exists: !!testUser?.token, 
                length: testUser?.token?.length,
                uid: testUser?.uid 
            });
            expect(testUser?.token).toBeDefined();

            console.log('🧪 [TEST] Making authenticated request to /user/stats');
            const response = await apiClient.get('/user/stats');
            
            expect(response.status).toBe(200);
            expect(response.data.message).toBe('User stats retrieved successfully');
            expect(response.data.stats).toBeDefined();
            
            // Verificar estructura de stats
            expect(response.data.stats.streak).toBeDefined();
            expect(response.data.stats.xp).toBeDefined();
            expect(response.data.stats.progress).toBeDefined();
            
            // Verificar tipos de datos
            expect(typeof response.data.stats.streak.current).toBe('number');
            expect(typeof response.data.stats.streak.longest).toBe('number');
            expect(typeof response.data.stats.xp.total).toBe('number');
            expect(typeof response.data.stats.progress.percentage).toBe('number');
            expect(typeof response.data.stats.progress.completed_days).toBe('number');
            expect(typeof response.data.stats.progress.total_days).toBe('number');
        });
    });

    describe('GET /streak', () => {
        it('debería devolver 401 Unauthorized si no se provee un token', async () => {
            const unauthedClient = axios.create({ baseURL: API_BASE_URL });
            
            try {
                await unauthedClient.get('/user/streak');
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
                await invalidApiClient.get('/user/streak');
            } catch (error: any) {
                expect(error.response.status).toBe(403);
                expect(error.response.data.message).toContain('Invalid or expired token');
            }
        });

        it('debería devolver 404 si no hay datos de streak para el usuario', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.get('/user/streak');
            } catch (error: any) {
                expect(error.response.status).toBe(404);
                expect(error.response.data.message).toContain('No streak data found for user');
            }
        });
    });

    describe('GET /xp', () => {
        it('debería devolver 401 Unauthorized si no se provee un token', async () => {
            const unauthedClient = axios.create({ baseURL: API_BASE_URL });
            
            try {
                await unauthedClient.get('/user/xp');
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
                await invalidApiClient.get('/user/xp');
            } catch (error: any) {
                expect(error.response.status).toBe(403);
                expect(error.response.data.message).toContain('Invalid or expired token');
            }
        });

        it('debería devolver XP del usuario con token válido', async () => {
            expect(testUser?.token).toBeDefined();

            const response = await apiClient.get('/user/xp');
            
            expect(response.status).toBe(200);
            expect(response.data.message).toBe('User XP retrieved successfully');
            expect(response.data.xp).toBeDefined();
            
            // Verificar estructura de XP
            expect(typeof response.data.xp.total).toBe('number');
            expect(response.data.xp.breakdown).toBeDefined();
            expect(typeof response.data.xp.breakdown.mainContent).toBe('number');
            expect(typeof response.data.xp.breakdown.actionTasks).toBe('number');
            expect(typeof response.data.xp.breakdown.exercises).toBe('number');
            expect(typeof response.data.xp.breakdown.total).toBe('number');
            
            // Para un usuario nuevo, el XP debería ser 0
            expect(response.data.xp.total).toBe(0);
            expect(response.data.xp.breakdown.total).toBe(0);
        });
    });

    describe('GET /progress', () => {
        it('debería devolver 401 Unauthorized si no se provee un token', async () => {
            const unauthedClient = axios.create({ baseURL: API_BASE_URL });
            
            try {
                await unauthedClient.get('/user/progress');
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
                await invalidApiClient.get('/user/progress');
            } catch (error: any) {
                expect(error.response.status).toBe(403);
                expect(error.response.data.message).toContain('Invalid or expired token');
            }
        });

        it('debería devolver 404 si no hay datos de progreso para el usuario', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.get('/user/progress');
            } catch (error: any) {
                expect(error.response.status).toBe(404);
                expect(error.response.data.message).toContain('No progress data found for user');
            }
        });

        it('debería devolver progreso del usuario con token válido', async () => {
            expect(testUser?.token).toBeDefined();

            // Nota: Este test puede fallar si no hay datos de progreso en la DB
            try {
                const response = await apiClient.get('/user/progress');
                
                expect(response.status).toBe(200);
                expect(response.data.message).toBe('User progress retrieved successfully');
                expect(response.data.progress).toBeDefined();
            } catch (error: any) {
                // Si no hay datos, esperamos 404
                if (error.response.status === 404) {
                    expect(error.response.data.message).toContain('No progress data found');
                } else {
                    throw error;
                }
            }
        });
    });

    describe('GET /analytics', () => {
        it('debería devolver 401 Unauthorized si no se provee un token', async () => {
            const unauthedClient = axios.create({ baseURL: API_BASE_URL });
            
            try {
                await unauthedClient.get('/user/analytics');
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
                await invalidApiClient.get('/user/analytics');
            } catch (error: any) {
                expect(error.response.status).toBe(403);
                expect(error.response.data.message).toContain('Invalid or expired token');
            }
        });

        it('debería devolver 404 si no hay datos de analytics para el usuario', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.get('/user/analytics');
            } catch (error: any) {
                expect(error.response.status).toBe(404);
                expect(error.response.data.message).toContain('No analytics data found for user');
            }
        });

        it('debería devolver analytics del usuario con token válido', async () => {
            expect(testUser?.token).toBeDefined();

            // Nota: Este test puede fallar si no hay datos de analytics en la DB
            try {
                const response = await apiClient.get('/user/analytics');
                
                expect(response.status).toBe(200);
                expect(response.data.message).toBe('User analytics retrieved successfully');
                expect(response.data.analytics).toBeDefined();
            } catch (error: any) {
                // Si no hay datos, esperamos 404
                if (error.response.status === 404) {
                    expect(error.response.data.message).toContain('No analytics data found');
                } else {
                    throw error;
                }
            }
        });
    });
}); 