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