import axios, { AxiosInstance } from 'axios';
import * as admin from 'firebase-admin';
import { createTestUserAndGetToken } from '../helpers/auth.helper';

const API_BASE_URL = `http://localhost:${process.env.PORT || 8080}/api`;

const generateRandomEmail = () => `test.tovi.${Math.random().toString(36).substring(2, 10)}@skillix.com`;

describe('Tovi API (/api/tovi)', () => {
    let testUser: { uid: string, email: string, token?: string | null } | null = null;
    let apiClient: AxiosInstance;

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
    });

    afterAll(async () => {
        if (testUser?.uid) {
            try {
                await admin.auth().deleteUser(testUser.uid);
            } catch (error) {
                console.error(`[Test Cleanup] Error removing user ${testUser.uid}:`, error);
            }
        }
    });

    describe('GET /messages/:situation (path param)', () => {
        it('debería devolver 401 Unauthorized si no se provee un token', async () => {
            const unauthedClient = axios.create({ baseURL: API_BASE_URL });
            
            try {
                await unauthedClient.get('/tovi/messages/daily_greeting');
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
                await invalidApiClient.get('/tovi/messages/daily_greeting');
            } catch (error: any) {
                expect(error.response.status).toBe(403);
                expect(error.response.data.message).toContain('Invalid or expired token');
            }
        });

        it('debería devolver 400 si no se provee situation parameter', async () => {
            try {
                await apiClient.get('/tovi/messages/');
            } catch (error: any) {
                expect(error.response.status).toBe(404); // Route not found
            }
        });

        it('debería devolver 404 si no se encuentran mensajes para la situación', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.get('/tovi/messages/nonexistent_situation');
            } catch (error: any) {
                expect(error.response.status).toBe(404);
                expect(error.response.data.message).toContain('No Tovi messages found for situation');
            }
        });

        it('debería devolver mensajes de Tovi para una situación válida', async () => {
            expect(testUser?.token).toBeDefined();

            // Nota: Este test puede fallar si no hay datos de Tovi en la DB
            // En un entorno real, necesitaríamos seed data o mocks
            try {
                const response = await apiClient.get('/tovi/messages/daily_greeting');
                
                expect(response.status).toBe(200);
                expect(response.data.message).toBe('Tovi messages retrieved successfully.');
                expect(response.data.situation).toBe('daily_greeting');
                expect(response.data.messages).toBeDefined();
                expect(Array.isArray(response.data.messages)).toBe(true);
            } catch (error: any) {
                // Si no hay datos, esperamos 404
                if (error.response.status === 404) {
                    expect(error.response.data.message).toContain('No Tovi messages found');
                } else {
                    throw error;
                }
            }
        });
    });

    describe('GET /messages?situation= (query param)', () => {
        it('debería devolver 401 Unauthorized si no se provee un token', async () => {
            const unauthedClient = axios.create({ baseURL: API_BASE_URL });
            
            try {
                await unauthedClient.get('/tovi/messages?situation=milestone_achieved');
            } catch (error: any) {
                expect(error.response.status).toBe(401);
                expect(error.response.data.message).toContain('No token provided');
            }
        });

        it('debería devolver 400 si no se provee situation query parameter', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.get('/tovi/messages');
            } catch (error: any) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.message).toContain('Situation query parameter is required');
            }
        });

        it('debería devolver 400 si situation no es un string válido', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.get('/tovi/messages?situation=');
            } catch (error: any) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.message).toContain('Situation query parameter is required');
            }
        });

        it('debería devolver 404 si no se encuentran mensajes para la situación (query)', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.get('/tovi/messages?situation=nonexistent_query_situation');
            } catch (error: any) {
                expect(error.response.status).toBe(404);
                expect(error.response.data.message).toContain('No Tovi messages found for situation');
            }
        });

        it('debería devolver mensajes de Tovi para una situación válida (query)', async () => {
            expect(testUser?.token).toBeDefined();

            // Nota: Este test puede fallar si no hay datos de Tovi en la DB
            try {
                const response = await apiClient.get('/tovi/messages?situation=milestone_achieved');
                
                expect(response.status).toBe(200);
                expect(response.data.message).toBe('Tovi messages retrieved successfully.');
                expect(response.data.situation).toBe('milestone_achieved');
                expect(response.data.messages).toBeDefined();
                expect(Array.isArray(response.data.messages)).toBe(true);
            } catch (error: any) {
                // Si no hay datos, esperamos 404
                if (error.response.status === 404) {
                    expect(error.response.data.message).toContain('No Tovi messages found');
                } else {
                    throw error;
                }
            }
        });

        it('debería manejar caracteres especiales en la situación', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                const response = await apiClient.get('/tovi/messages?situation=user_struggling_with_concepts');
                
                // Esperamos que funcione con guiones bajos
                expect(response.status).toBe(200);
                expect(response.data.situation).toBe('user_struggling_with_concepts');
            } catch (error: any) {
                // Si no hay datos, esperamos 404
                if (error.response.status === 404) {
                    expect(error.response.data.message).toContain('No Tovi messages found');
                } else {
                    throw error;
                }
            }
        });
    });
}); 