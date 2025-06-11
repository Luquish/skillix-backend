import { getConfig } from '../../src/config';
import axios from 'axios';


const config = getConfig();
// Clave de API web de Firebase. Para el emulador, puede ser cualquier string no vacío.
// En un entorno real, la obtendrías de la configuración de tu proyecto de Firebase.
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'test-api-key';

// La URL de la API REST del emulador de Auth
const AUTH_EMULATOR_URL = `http://${config.firebaseAuthEmulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword`;

/**
 * Inicia sesión como un usuario de prueba en el emulador de Auth y devuelve su ID Token.
 * @param email - El email del usuario de prueba.
 * @param password - La contraseña del usuario de prueba.
 * @returns El ID Token del usuario o null si falla el inicio de sesión.
 */
export const getTestUserAuthToken = async (email: string, password = 'password123'): Promise<string | null> => {
    try {
        const response = await axios.post(AUTH_EMULATOR_URL, {
            email,
            password,
            returnSecureToken: true,
        }, {
            params: {
                key: config.firebaseWebApiKey,
            },
        });
        return response.data.idToken;
    } catch (error: any) {
        console.error('Error al obtener el token de autenticación de prueba:', error.response?.data?.error?.message || error.message);
        return null;
    }
}; 