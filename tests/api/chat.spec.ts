import axios, { AxiosInstance } from 'axios';
import * as admin from 'firebase-admin';
import { createTestUserAndGetToken } from '../helpers/auth.helper';

const API_BASE_URL = `http://localhost:${process.env.PORT || 8080}/api`;

const generateRandomEmail = () => `test.chat.${Math.random().toString(36).substring(2, 10)}@skillix.com`;

describe('Chat API (/api/chat)', () => {
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

    describe('POST /start', () => {
        it('debería devolver 401 Unauthorized si no se provee un token', async () => {
            const unauthedClient = axios.create({ baseURL: API_BASE_URL });
            
            try {
                await unauthedClient.post('/chat/start', {});
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
                await invalidApiClient.post('/chat/start', {});
            } catch (error: any) {
                expect(error.response.status).toBe(403);
                expect(error.response.data.message).toContain('Invalid or expired token');
            }
        });

        it('debería devolver 501 Not Implemented (placeholder)', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.post('/chat/start', {});
            } catch (error: any) {
                expect(error.response.status).toBe(501);
                expect(error.response.data.message).toContain('Chat functionality not implemented yet');
                expect(error.response.data.status).toBe('placeholder');
            }
        });

        it('debería manejar requests vacíos correctamente', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.post('/chat/start');
            } catch (error: any) {
                expect(error.response.status).toBe(501);
                expect(error.response.data.message).toContain('Chat functionality not implemented yet');
            }
        });
    });

    describe('POST /message', () => {
        it('debería devolver 401 Unauthorized si no se provee un token', async () => {
            const unauthedClient = axios.create({ baseURL: API_BASE_URL });
            
            try {
                await unauthedClient.post('/chat/message', { message: 'Hello' });
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
                await invalidApiClient.post('/chat/message', { message: 'Hello' });
            } catch (error: any) {
                expect(error.response.status).toBe(403);
                expect(error.response.data.message).toContain('Invalid or expired token');
            }
        });

        it('debería devolver 400 si no se provee message content', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.post('/chat/message', {});
            } catch (error: any) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.message).toContain('Message content is required');
            }
        });

        it('debería devolver 400 si message está vacío', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.post('/chat/message', { message: '' });
            } catch (error: any) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.message).toContain('Message content is required');
            }
        });

        it('debería devolver 501 Not Implemented con message válido (placeholder)', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.post('/chat/message', { message: 'Hello, how are you?' });
            } catch (error: any) {
                expect(error.response.status).toBe(501);
                expect(error.response.data.message).toContain('Send message functionality not implemented yet');
                expect(error.response.data.status).toBe('placeholder');
                expect(error.response.data.receivedMessage).toBe('Hello, how are you?');
            }
        });

        it('debería manejar mensajes largos correctamente', async () => {
            expect(testUser?.token).toBeDefined();

            const longMessage = 'A'.repeat(1000); // Mensaje de 1000 caracteres

            try {
                await apiClient.post('/chat/message', { message: longMessage });
            } catch (error: any) {
                expect(error.response.status).toBe(501);
                expect(error.response.data.receivedMessage).toBe(longMessage);
            }
        });

        it('debería manejar caracteres especiales en el mensaje', async () => {
            expect(testUser?.token).toBeDefined();

            const specialMessage = '¡Hola! ¿Cómo estás? 😊 Testing special chars: áéíóú ñ @#$%';

            try {
                await apiClient.post('/chat/message', { message: specialMessage });
            } catch (error: any) {
                expect(error.response.status).toBe(501);
                expect(error.response.data.receivedMessage).toBe(specialMessage);
            }
        });

        it('debería ignorar campos adicionales en el body', async () => {
            expect(testUser?.token).toBeDefined();

            try {
                await apiClient.post('/chat/message', { 
                    message: 'Hello',
                    extraField: 'should be ignored',
                    anotherField: 123
                });
            } catch (error: any) {
                expect(error.response.status).toBe(501);
                expect(error.response.data.receivedMessage).toBe('Hello');
                // Los campos adicionales deben ser ignorados
                expect(error.response.data.extraField).toBeUndefined();
                expect(error.response.data.anotherField).toBeUndefined();
            }
        });
    });
}); 