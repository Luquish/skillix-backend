import axios from 'axios';
import * as admin from 'firebase-admin';
import { deleteUserByFirebaseUid } from '../../src/services/dataConnect.service';

const API_BASE_URL = `http://localhost:${process.env.PORT || 8080}/api`;

// Helper para generar un email aleatorio para cada ejecución de prueba
const generateRandomEmail = () => {
    const randomString = Math.random().toString(36).substring(2, 10);
    return `test.user.${randomString}@skillix.com`;
};

// Variable para guardar el UID del usuario creado y limpiarlo después
let createdUserUid: string | null = null;

describe('Auth API (/api/auth)', () => {
  // Después de todas las pruebas en este archivo, limpia el usuario creado en los Emuladores
  afterAll(async () => {
    if (createdUserUid) {
      try {
        // Limpieza del Emulador de Auth
        await admin.auth().deleteUser(createdUserUid);
        console.log(`[Test Cleanup] Usuario de Auth ${createdUserUid} eliminado.`);
        
        // Limpieza de la base de datos de Data Connect
        await deleteUserByFirebaseUid(createdUserUid);
        console.log(`[Test Cleanup] Usuario de DB para ${createdUserUid} eliminado.`);

      } catch (error) {
        console.error(`[Test Cleanup] Fallo al eliminar el usuario de prueba ${createdUserUid}:`, error);
      }
    }
  });

  describe('POST /signup', () => {
    const testUserEmail = generateRandomEmail();
    const testUserPassword = 'password123';

    it('debería crear un nuevo usuario correctamente y devolver un 201', async () => {
      // Arrange
      const signupData = {
        email: testUserEmail,
        password: testUserPassword,
        name: 'Test User',
      };

      // Act
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, signupData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.data.message).toBe('User created successfully!');
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe(testUserEmail);

      // Guardar el UID para la limpieza
      createdUserUid = response.data.user.uid;
      expect(createdUserUid).toBeDefined();
    });

    it('debería devolver un 409 (Conflict) si el email ya existe', async () => {
      // Arrange: Mismos datos que la prueba anterior
      const signupData = {
        email: testUserEmail,
        password: 'anotherpassword',
        name: 'Another Test User',
      };

      try {
        // Act
        await axios.post(`${API_BASE_URL}/auth/signup`, signupData);
      } catch (error: any) {
        // Assert
        expect(error.response.status).toBe(409);
        expect(error.response.data.message).toContain('email address is already in use');
      }
    });

    it('debería devolver un 400 si la contraseña es demasiado corta', async () => {
        // Arrange
        const signupData = {
          email: generateRandomEmail(),
          password: '123', // Contraseña inválida
          name: 'Short Password User',
        };
  
        try {
          // Act
          await axios.post(`${API_BASE_URL}/auth/signup`, signupData);
        } catch (error: any) {
          // Assert
          expect(error.response.status).toBe(400);
          expect(error.response.data.message).toContain('Password must be at least 6 characters long.');
        }
      });
  });
}); 