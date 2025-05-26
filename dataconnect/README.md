# Skillix Data Connect

Sistema de persistencia y SDK para la plataforma Skillix basado en Firebase Data Connect.

## Estructura

```
dataconnect/
├── schema/                    # Modelos de datos
│   ├── enums.gql             # Enumeraciones del sistema
│   ├── user.gql              # Esquema de usuarios
│   ├── learning.gql          # Esquema de aprendizaje
│   ├── schema.gql            # Esquema principal
│   ├── user.yaml             # Configuración de usuarios
│   ├── learning_plans.yaml   # Configuración de planes
│   └── daily_content.yaml    # Configuración de contenido
├── connector/                # Operaciones de datos
│   ├── queries.gql           # Consultas GraphQL
│   ├── mutations.gql         # Mutaciones GraphQL
│   └── connector.yaml        # Configuración del SDK
└── dataconnect.yaml          # Configuración principal
```

## Configuración

### 1. Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2. Data Connect
```bash
firebase init dataconnect
```

### 3. Configuración del Conector (connector.yaml)
```yaml
connectorId: "skillix-connector"
authMode: "FIREBASE_AUTH"

# Configuración de generación de SDK
generate:
  javascriptSdk:
    outputDir: "path_al_front/src/services/dataconnect"
    package: "@skillix/dataconnect"
    framework: "react-native"
    options:
      tanstack: true      # Integración con TanStack Query
      typescript: true    # Soporte TypeScript
      reactNative: true   # Optimizaciones para React Native
      emulator:
        host: "localhost"
        port: 9399

# Configuración de desarrollo
development:
  watch: true            # Auto-regenerar SDK
  emulator:
    enabled: true
    port: 9399
    host: "localhost"

# Mapeo de tipos personalizados
typeMapping:
  Timestamp: "string"
  UUID: "string"
  JSON: "any"
```

### 4. Configuración de Esquemas

#### User (user.yaml)
```yaml
collections:
  users:
    schema: User
    indexes:
      - fields: ["email"]
        unique: true
    rules:
      read: "auth != null"
      write: "auth != null && auth.uid == resource.data.id"
```

#### Learning Plans (learning_plans.yaml)
```yaml
collections:
  learning_plans:
    schema: LearningPlan
    indexes:
      - fields: ["userId", "skill"]
    rules:
      read: "auth != null && auth.uid == resource.data.userId"
      write: "auth != null && auth.uid == resource.data.userId"
```

#### Daily Content (daily_content.yaml)
```yaml
collections:
  daily_content:
    schema: DayContent
    indexes:
      - fields: ["planId", "dayNumber"]
    rules:
      read: "auth != null"
      write: "false"  # Solo escritura vía API
```

## Desarrollo

### Generar SDK

1. **Modo único**:
```bash
firebase dataconnect:sdk:generate
```

2. **Modo watch**:
```bash
firebase dataconnect:sdk:generate --watch
```

### Emulador Local

```bash
firebase emulators:start
```

## Esquemas GraphQL

### User Schema
```graphql
type User {
  id: ID!
  email: String!
  name: String!
  preferences: UserPreferences
  enrollments: [Enrollment!]
}

type UserPreferences {
  skill: String!
  experienceLevel: ExperienceLevel!
  motivation: String!
  availableTimeMinutes: Int!
  learningStyle: LearningStyle!
  goal: String!
}
```

### Learning Schema
```graphql
type LearningPlan {
  id: ID!
  userId: ID!
  skill: String!
  sections: [Section!]!
  currentDay: Int!
  totalDays: Int!
}

type Section {
  id: ID!
  title: String!
  description: String!
  days: [Day!]!
}
```

## Operaciones

### Queries
```graphql
# User
query GetUserProfile($userId: ID!) {
  user(id: $userId) {
    id
    name
    preferences
  }
}

# Learning
query GetUserLearningPlan($userId: ID!) {
  learningPlan(userId: $userId) {
    sections {
      title
      days {
        content
      }
    }
  }
}
```

### Mutations
```graphql
# Preferences
mutation UpdateUserPreferences($userId: ID!, $preferences: UserPreferencesInput!) {
  updateUserPreferences(userId: $userId, preferences: $preferences) {
    id
    preferences
  }
}

# Progress
mutation UpdateDayProgress($userId: ID!, $dayId: ID!, $progress: ProgressInput!) {
  updateDayProgress(userId: $userId, dayId: $dayId, progress: $progress) {
    completed
    score
  }
}
```

## SDK React Native

### Configuración
```typescript
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        {/* ... */}
      </NavigationContainer>
    </QueryClientProvider>
  );
}
```

### Uso
```typescript
// Hooks generados
import { 
  useGetUserProfile,
  useUpdateUserPreferences,
  useGetUserLearningPlan
} from '@skillix/data-connect';

// Ejemplo de uso
function ProfileScreen() {
  const { data, isLoading } = useGetUserProfile(userId);
  const { mutate } = useUpdateUserPreferences();

  const updatePreferences = () => {
    mutate({
      userId,
      preferences: {
        skill: 'programming',
        experienceLevel: 'BEGINNER',
        // ...
      }
    });
  };

  return (/* ... */);
}
```

## Características

- ✅ Tipado completo (TypeScript)
- ✅ Integración con TanStack Query
- ✅ Auth automática con Firebase
- ✅ Soporte offline
- ✅ Hot reload de esquemas
- ✅ Emulador local para desarrollo 

# Firebase Data Connect - Estructura Relacional

## Descripción General

Este directorio contiene la configuración completa de Firebase Data Connect con una estructura completamente relacional (sin campos JSON).

## Estructura de la Base de Datos

### Tablas Principales

#### 1. **User** - Información del usuario
- Datos básicos: email, nombre, Firebase UID
- Información de autenticación OAuth (Google, Apple)
- Relaciones: preferences, learningPlan, enrollments, progress, analytics

#### 2. **LearningPlan** - Plan de aprendizaje del usuario
- Plan generado por IA para cada usuario
- Relaciones: skillAnalysis, pedagogicalAnalysis, sections

#### 3. **SkillAnalysis** - Análisis de la habilidad
- Información sobre la habilidad que el usuario quiere aprender
- Categoría, demanda del mercado
- Relaciones: components, prerequisites, careerPaths

#### 4. **PedagogicalAnalysis** - Análisis pedagógico
- Estrategias de enseñanza personalizadas
- Evaluación de carga cognitiva
- Relaciones: objectives, bloomsLevels, engagementTechniques, assessmentMethods

#### 5. **PlanSection** - Secciones del plan
- División del plan en secciones temáticas
- Relaciones: days

#### 6. **DayContent** - Contenido diario
- Contenido específico para cada día de aprendizaje
- Relaciones: blocks, objectives, progress

#### 7. **ContentBlock** - Bloques de contenido
- Unidades atómicas de contenido (audio, lectura, quiz, tareas)
- Relaciones: audioContent, readContent, quizContent, actionTask

### Tipos de Bloques de Contenido

#### **AudioContent**
- URL del audio, transcripción, duración
- Tipo de voz para TTS

#### **ReadContent**
- Contenido de texto para leer
- Conceptos clave con definiciones

#### **QuizContent**
- Preguntas de opción múltiple
- Respuestas correctas y explicaciones

#### **ActionTask**
- Tareas prácticas para aplicar lo aprendido
- Pasos a seguir y entregables esperados

### Tablas de Progreso

#### **Enrollment**
- Inscripción del usuario en un plan de aprendizaje
- Estado, progreso actual, XP total

#### **ContentProgress**
- Progreso detallado por bloque de contenido
- Tiempo invertido, intentos, puntuación

#### **QuizResponse**
- Respuestas específicas a preguntas de quiz
- Tracking de respuestas correctas/incorrectas

### Tablas de Analytics

#### **UserAnalytics**
- Métricas diarias del usuario
- Racha de días, tiempo promedio de sesión
- Puntuación de engagement, riesgo de abandono

### Tablas ADK (Assistant Development Kit)

#### **AdkSession**
- Sesiones de conversación con asistentes IA
- Estado de la conversación

#### **AdkMessage**
- Mensajes individuales en las conversaciones

## Flujo de Datos

1. **Creación de Usuario**
   - Se crea el usuario con autenticación OAuth
   - Se guardan las preferencias de aprendizaje

2. **Generación del Plan**
   - Los agentes de IA analizan las preferencias
   - Se crea LearningPlan con SkillAnalysis y PedagogicalAnalysis
   - Se generan las secciones y días del plan

3. **Generación de Contenido Diario**
   - Para cada día se generan bloques de contenido
   - Audio, lectura, quizzes y tareas prácticas

4. **Tracking de Progreso**
   - Se registra el progreso en cada bloque
   - Se actualizan las analytics diarias

## Enums Utilizados

- **AuthProvider**: EMAIL, GOOGLE, APPLE
- **Platform**: IOS, ANDROID, WEB
- **UserExperienceLevel**: BEGINNER, INTERMEDIATE, ADVANCED
- **LearningStyle**: VISUAL, AUDITORY, KINESTHETIC, MIXED
- **ContentBlockType**: AUDIO, READ, QUIZ_MCQ, ACTION_TASK, VIDEO, EXERCISE
- **CompletionStatus**: PENDING, IN_PROGRESS, COMPLETED
- **SkillCategory**: TECHNICAL, CREATIVE, BUSINESS, PERSONAL_DEVELOPMENT, LANGUAGE, OTHER
- **MarketDemand**: HIGH, MEDIUM, LOW
- **ChurnRisk**: LOW, MEDIUM, HIGH

## Archivos de Configuración

- `dataconnect.yaml`: Configuración principal del servicio
- `schema/schema.gql`: Definición completa del esquema
- `schema/enums.gql`: Definición de todos los enums
- `connector/queries.gql`: Todas las queries disponibles
- `connector/mutations.gql`: Todas las mutations disponibles

## Integración con Python

Los agentes de Python se comunican con Data Connect a través del bridge Node.js:

```python
from skillix_agents import get_dataconnect_bridge

bridge = get_dataconnect_bridge()

# Crear un plan de aprendizaje
result = bridge.create_learning_plan(user_id, {
    'skill_analysis': {...},
    'learning_plan': {...},
    'pedagogical_analysis': {...}
})

# Obtener contenido del día
content = bridge.get_day_content(day_content_id)
```

## Ventajas de la Estructura Relacional

1. **Queries más eficientes**: No necesitas parsear JSON
2. **Integridad referencial**: Las relaciones están garantizadas
3. **Mejor análisis**: Puedes hacer queries complejas fácilmente
4. **Type safety**: Cada campo tiene un tipo definido
5. **Escalabilidad**: Mejor performance con grandes volúmenes de datos 