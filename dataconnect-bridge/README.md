# DataConnect Bridge Service

## Descripción

Servicio Node.js que actúa como puente entre los agentes Python y Firebase Data Connect. Necesario porque Data Connect solo tiene SDK para Node.js.

## Estructura de Contenido

### Diseño del Contenido del Día

Cada día de aprendizaje sigue esta estructura:

1. **Contenido Principal** (obligatorio)
   - Puede ser Audio o Lectura (según preferencia del usuario)
   - Incluye un **Fun Fact** al final
   - Vale 20 XP base

2. **Ejercicios** (múltiples, basados en el contenido)
   - Quiz de opción múltiple
   - Tareas de acción
   - Ejercicios interactivos (fill-in-blanks, matching, etc.)
   - Cada uno con su propio valor de XP

### Estructura de Datos

```javascript
// Estructura que recibe del agente Python
{
  objectives: ["objetivo1", "objetivo2"],
  fun_fact: "¡Dato curioso sobre el tema!",
  audio_blocks: [{
    title: "Introducción al tema",
    transcript: "...",
    audio_url: "...",
    duration: 180,
    fun_fact: "¡Sabías que...!"  // Fun fact específico del audio
  }],
  read_blocks: [{
    title: "Lectura principal",
    content: "...",
    estimated_time: 5,
    fun_fact: "¡Dato interesante!",  // Fun fact específico de la lectura
    key_concepts: [
      { term: "concepto", definition: "definición" }
    ]
  }],
  quiz_blocks: [
    // Ejercicios basados en el contenido principal
  ],
  action_tasks: [
    // Tareas prácticas relacionadas
  ],
  exercise_blocks: [
    // Otros ejercicios interactivos
  ]
}
```

### Transformación a Estructura Relacional

El bridge transforma esta estructura JSON a múltiples tablas relacionadas:

1. **MainContent**: Contenido principal del día
   - contentType: AUDIO o READ
   - title: Título del contenido
   - funFact: Dato curioso al final
   - xp: Puntos de experiencia

2. **AudioContent/ReadContent**: Detalles específicos del contenido

3. **ContentBlock**: Cada ejercicio basado en el contenido
   - blockType: QUIZ_MCQ, ACTION_TASK, EXERCISE
   - Relacionados con el contenido del día

## Endpoints Principales

### POST /create-learning-plan
Crea un plan de aprendizaje completo con análisis.

### POST /create-day-content
Crea el contenido de un día específico con:
- Contenido principal (audio o lectura con fun fact)
- Ejercicios basados en ese contenido

## Configuración

```bash
# .env
PORT=3001
NODE_ENV=development
FIREBASE_API_KEY=...
```

## Instalación y Uso

```bash
npm install
npm run dev  # Desarrollo
npm start    # Producción
```

## Notas Importantes

- El primer bloque de audio o lectura se considera el contenido principal
- El fun fact puede venir a nivel del día o de cada bloque
- Los ejercicios siempre hacen referencia al contenido principal
- Todos los datos se guardan en tablas relacionales, no JSON

## Arquitectura

```
Python Agents (ADK) 
    ↓ HTTP/REST
Node.js Bridge Service
    ↓ Firebase SDK
Firebase Data Connect
```

## Seguridad

- Usa autenticación por API Key en el header `Authorization: Bearer YOUR_API_KEY`
- Configura `ALLOWED_ORIGINS` para CORS
- En producción, considera usar HTTPS y rate limiting

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### PM2

```bash
pm2 start server.js --name dataconnect-bridge
pm2 save
pm2 startup
```

## Troubleshooting

1. **Error: Cannot find module '../dataconnect/generated/js/default-connector'**
   - Asegúrate de haber generado el SDK con `firebase dataconnect:sdk:generate`

2. **Error 401: Invalid API key**
   - Verifica que `DATACONNECT_BRIDGE_API_KEY` esté configurado en ambos lados

3. **Connection refused**
   - Verifica que el servicio esté corriendo en el puerto correcto
   - Actualiza `DATACONNECT_BRIDGE_URL` en el .env de Python 