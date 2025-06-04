# 🗂️ Estructura del Proyecto

A continuación se detalla la estructura propuesta para el backend, siguiendo buenas prácticas de organización y escalabilidad:

---

## src/
Directorio principal del código fuente.

### api/
- **index.js**: Importa y registra todos los archivos de rutas en el router principal de la API.
- **`*.routes.js`**: Cada archivo define endpoints para una funcionalidad específica (ejemplo: `POST /onboarding/pre-analyze-skill`). Importan y usan funciones de los controladores.

### controllers/
Actúan como la capa de orquestación para cada solicitud de API. Reciben la solicitud, llaman a los servicios necesarios para ejecutar la lógica de negocio y el workflow, y luego formulan la respuesta HTTP.

> **Ejemplo:**
> `onboarding.controller.js` tendría una función `handlePreAnalyzeSkill` que:
> - Valida la entrada.
> - Llama a `skillAnalyzer.service.js` (que a su vez usa `openai.service.js`).
> - (Opcional) Guarda algún resultado preliminar o log en `dataConnect.service.js`.
> - Devuelve la respuesta al cliente.

### services/
Contiene la lógica de negocio principal.
- **firebaseAdmin.service.js**: Inicializa el Firebase Admin SDK para Node.js. Provee funciones para verificar los ID Tokens de Firebase.
- **dataConnect.service.js**: Componente **crucial**. Reemplaza tu antiguo bridge Python y la lógica de tu proyecto `dataconnect-bridge`. Utiliza el SDK de Firebase Data Connect para Node.js (o la API GraphQL directamente si es necesario) para todas las interacciones con la base de datos. Expone métodos como:
  - `getUserByFirebaseUid`
  - `createFullLearningPlanInDB` (crea LearningPlan, SkillAnalysis, PedagogicalAnalysis, PlanSection, DayContent iniciales, etc.)
  - `saveDailyContentInDB`
  - `getLearningPlanProgress`

### llm/
Subdirectorio para toda la lógica relacionada con LLMs (OpenAI).
- **openai.service.js**: Configura el cliente de API de OpenAI y provee una función genérica para hacer llamadas al API, manejar reintentos, etc.
- **prompts.js** (opcional): Centraliza prompts largos o numerosos.
- **skillAnalyzer.service.js, learningPlanner.service.js, etc.**: Reemplazan la lógica de los antiguos agentes Python. Incluyen:
  - Prompt del sistema específico para la tarea.
  - Funciones para formatear la entrada al LLM.
  - Llamadas a `openai.service.js`.
  - Parseo y validación de la respuesta (puedes usar [Zod](https://zod.dev/) o validación manual).
- **chatOrchestrator.service.js**: El "cerebro" LLM del chatbot. Orquesta mensajes, historial, llamadas a servicios y genera la respuesta.
- **session.service.js** (opcional pero recomendado): Maneja el estado de conversación complejo (variables de contexto, resultados intermedios, etc.) usando Redis, Memorystore o una tabla en Data Connect.

### middleware/
- **auth.middleware.js**: Middleware de Express para verificar el token de Firebase ID en rutas protegidas, usando `firebaseAdmin.service.js`.

### utils/
Funciones de utilidad (logger, manejo de errores global para Express).

### config/
Carga y exporta variables de entorno y otras configuraciones.

### app.js
Punto de entrada de la aplicación Express. Configura la app, aplica middlewares globales (CORS, body-parser, logger, errorHandler) y registra los routers de API definidos en `src/api/index.js`.

### tests/
Es fundamental tener pruebas para esta nueva estructura.

---

## Archivos Raíz

- `package.json`
- `.env`
- `.gitignore`
- `Dockerfile`
- `README.md`

---

> **¡Esta estructura te permitirá escalar, mantener y testear tu backend de manera eficiente!**
