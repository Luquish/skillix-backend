import axios from 'axios';

// La URL base de tu API local. Asegúrate de que el puerto coincida con el de tu archivo .env
const API_BASE_URL = `http://localhost:${process.env.PORT || 8080}/api`;

describe('Onboarding API (/api/onboarding)', () => {

  // Test para el endpoint POST /analyze-skill con datos válidos
  describe('POST /analyze-skill', () => {
    it('debería analizar una habilidad válida y devolver un estado 200 con datos', async () => {
      // Arrange: Datos de entrada válidos
      const validSkillInput = {
        skill: 'Aprender a tocar la guitarra',
        experience: 'Beginner',
        time: '30 minutes daily',
        motivation: 'Tocar mis canciones favoritas',
        goal: 'Poder tocar y cantar una canción completa en 3 meses',
      };

      // Act: Realizar la petición a la API
      const response = await axios.post(`${API_BASE_URL}/onboarding/analyze-skill`, validSkillInput);

      // Assert: Verificar la respuesta
      expect(response.status).toBe(200);
      expect(response.data.message).toBe('Skill analysis successful.');
      expect(response.data.data).toBeDefined();
      expect(response.data.data.isSkillValid).toBe(true);
      expect(response.data.data.skillName).toBe(validSkillInput.skill);
      expect(response.data.data.components).toBeInstanceOf(Array);
      expect(response.data.data.components.length).toBeGreaterThan(0);
    });

    it('debería rechazar una habilidad inválida y devolver un estado 400', async () => {
        // Arrange: Datos de entrada con una habilidad no viable
        const invalidSkillInput = {
            skill: 'Aprender a viajar en el tiempo', // Habilidad no viable
            experience: 'Beginner',
            time: '1 hour daily',
            motivation: 'Corregir errores del pasado',
            goal: 'Visitar a los dinosaurios',
        };

        try {
            // Act: Realizar la petición a la API
            await axios.post(`${API_BASE_URL}/onboarding/analyze-skill`, invalidSkillInput);
        } catch (error: any) {
            // Assert: Verificar que la API devolvió un error 400
            expect(error.response.status).toBe(400);
            expect(error.response.data.data).toBeDefined();
            expect(error.response.data.data.isSkillValid).toBe(false);
            expect(typeof error.response.data.message).toBe('string');
            expect(error.response.data.message.length).toBeGreaterThan(0);
        }
    });

    it('debería devolver un estado 400 si faltan campos requeridos', async () => {
        // Arrange: Datos de entrada incompletos
        const incompleteInput = {
            skill: 'Aprender a cocinar',
            // Falta 'experience', 'time', y 'motivation'
        };

        try {
            // Act: Realizar la petición a la API
            await axios.post(`${API_BASE_URL}/onboarding/analyze-skill`, incompleteInput);
        } catch (error: any) {
            // Assert: Verificar que la API devolvió un error 400
            expect(error.response.status).toBe(400);
            expect(error.response.data.message).toBe('Invalid input data.');
            expect(error.response.data.errors).toBeInstanceOf(Array);
        }
    });
  });

}); 