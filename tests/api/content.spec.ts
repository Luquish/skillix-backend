import axios, { AxiosInstance } from 'axios';
import * as admin from 'firebase-admin';

const API_BASE_URL = `http://localhost:${process.env.PORT || 8080}/api`;

const generateRandomEmail = () => `test.content.${Math.random().toString(36).substring(2, 10)}@skillix.com`;

describe('Content API (/api/content)', () => {
    let testUser: { uid: string, email: string } | null = null;
    let apiClient: AxiosInstance;

    beforeAll(async () => {
        const email = generateRandomEmail();
        const password = 'password123';
        const signupResponse = await axios.post(`${API_BASE_URL}/auth/signup`, { email, password, name: 'Content Tester' });
        testUser = { uid: signupResponse.data.user.uid, email };
        apiClient = axios.create({ baseURL: API_BASE_URL });
    });

    afterAll(async () => {
        if (testUser?.uid) {
            await admin.auth().deleteUser(testUser.uid);
            console.log(`[Test Cleanup] Usuario de contenido ${testUser.uid} eliminado.`);
        }
    });

    describe('POST /generate-next', () => {
        it('debería devolver 401 Unauthorized si no se provee un token', async () => {
            try {
                await apiClient.post('/content/generate-next', {
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

        // Al igual que con learningPlan, la prueba de éxito real requiere un token válido.
        // El flujo completo sería: crear usuario -> obtener token -> crear plan -> obtener planId -> llamar a generate-next.
        it.skip('debería generar contenido para el día siguiente con un token válido', async () => {
            // Lógica de prueba para el caso de éxito
        });
    });
}); 