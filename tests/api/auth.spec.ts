import axios from 'axios';
import { admin as firebaseAdmin } from '../../src/services/firebase.service';
import app from '../../src/app';
import { createTestUserAndGetToken } from '../helpers/auth.helper';
import { deleteUser } from '../../src/services/dataConnect.service';

const API_BASE_URL = `http://localhost:${process.env.PORT || 8080}/api`;

const generateRandomEmail = () => {
  const randomString = Math.random().toString(36).substring(2, 10);
  return `test.user.${randomString}@skillix.com`;
};

let server: any;
let createdUserUid: string | null = null;
let authToken: string | null = null;

describe('Auth API (/api/auth)', () => {

  beforeAll((done) => {
    server = app.listen(0, () => {
      const port = (server.address() as any).port;
      process.env.PORT = String(port); // Make port available to tests
      console.log(`Test server running on http://localhost:${port}`);
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });
  
  // Limpieza después de cada test
  afterEach(async () => {
    if (createdUserUid) {
      try {
        await firebaseAdmin.auth().deleteUser(createdUserUid);
        await deleteUser(createdUserUid);
      } catch (error) {
        console.error(`[Test Cleanup] Error removing user ${createdUserUid}:`, error);
      }
      createdUserUid = null;
      authToken = null;
    }
  });

  describe('POST /sync-profile', () => {
    const email = generateRandomEmail();
    const password = 'password123';

    it('debería crear el perfil del usuario y devolver 201', async () => {
      const { uid, token } = await createTestUserAndGetToken(email, password);
      createdUserUid = uid;
      authToken = token;

      const response = await axios.post(
        `${API_BASE_URL}/auth/sync-profile`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      expect(response.status).toBe(201);
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe(email);
    });

    it('debería devolver los datos del usuario existente en llamadas posteriores', async () => {
      const response = await axios.post(
        `${API_BASE_URL}/auth/sync-profile`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data.message).toBe('User logged in successfully!');
      expect(response.data.user.firebaseUid).toBe(createdUserUid);
    });

    it('debería devolver 401 si no se envía token', async () => {
      try {
        await axios.post(`${API_BASE_URL}/auth/sync-profile`, {});
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.message).toContain('No token provided');
      }
    });
  });
});

