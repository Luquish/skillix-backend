# Prompt para Desarrollo del Frontend de Skillix

## Contexto
Skillix es una plataforma de aprendizaje personalizado que utiliza IA para crear planes de estudio adaptados a las necesidades y preferencias de cada usuario. Tu tarea es desarrollar el frontend que interactuará con el backend existente.

## Especificaciones Técnicas

### 1. Autenticación y Manejo de Usuarios

#### Endpoints de Autenticación
```typescript
// POST /auth/signup
interface UserCreate {
  email: string;
  name: string;
  password: string;
}

// POST /auth/login
interface UserLogin {
  email: string;
  password: string;
}

// GET /auth/me
interface User {
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

#### Flujo de Autenticación
1. Registro (/auth/signup)
2. Login (/auth/login)
3. Verificación de sesión (/auth/me)
4. Redirección a onboarding para nuevos usuarios

### 2. Estructura de Datos Principal

#### Onboarding
```typescript
interface OnboardingData {
  name: string;
  skill: string;
  experience: "Beginner" | "Intermediate" | "Advanced";
  motivation: string;
  time: "5 minutes" | "10 minutes" | "15 minutes" | "20 minutes";
  learning_style: string;
  goal: string;
}
```

#### Contenido del Curso
1. **Días de Contenido** (`is_action_day: false`):
```typescript
interface ContentDay {
  title: string;
  blocks: Array<{
    type: "reading" | "quiz" | "matching" | "scenario";
    content: {
      title?: string;
      text?: string;
      questions?: Array<{
        question: string;
        options: string[];
        correct: number;
      }>;
      terms?: string[];
      definitions?: string[];
    };
    xp: number;
  }>;
}
```

2. **Días de Acción** (`is_action_day: true`):
```typescript
interface ActionDay {
  title: string;
  action_task: {
    intro: string;
    description: string;
    steps: string[];
  };
  xp: number;
}
```

### 3. API Endpoints Principales

```typescript
// Crear Plan de Aprendizaje
POST /api/plan
Body: OnboardingData
Response: {
  course_id: string;
  roadmap: {
    overview: string;
    sections: Array<{
      title: string;
      days: Array<{
        day_number: number;
        title: string;
        is_action_day: boolean;
      }>;
    }>;
  };
  first_day: DayContent;
}

// Progreso Diario
POST /api/day
Body: {
  email: string;
  course_id: string;
  current_day: number;
  completed: boolean;
  score?: number;
  feedback?: string;
}
Response: {
  day_number: number;
  content: DayContent;
  is_last_day: boolean;
}
```

## Requerimientos de UI/UX

### Autenticación
- Formularios de registro y login separados
- Validaciones en tiempo real
- Manejo de errores claro
- Persistencia de sesión

### Onboarding
- Diseño mobile-first
- Máximo 1-2 preguntas por pantalla
- Animaciones suaves entre pasos
- Validaciones inmediatas

### Visualización de Contenido

#### 1. Roadmap
- Vista de progreso general
- Secciones colapsables
- Indicadores de progreso
- Streak y XP visibles

#### 2. Contenido Diario
- Un bloque visible a la vez
- Navegación entre bloques
- Timer según preferencia de tiempo
- Progreso visual del día

#### 3. Tipos de Bloques
- **Lectura**: Párrafos cortos, mobile-friendly
- **Quiz**: Opciones grandes, feedback inmediato
- **Matching**: UI drag-and-drop o tap-to-match
- **Scenario**: Casos en cards, opciones como botones

#### 4. Días de Acción
- Checklist de pasos
- Subida de evidencia
- Timer adaptativo
- Confirmación de completado

### Gamificación
- Streak counter
- XP por bloque completado
- Badges por sección
- Progreso visual
- Mensajes motivacionales personalizados

## Consideraciones Técnicas

### Estado Global
```typescript
interface AppState {
  auth: {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  };
  course: {
    currentDay: DayContent | null;
    progress: {
      streak: number;
      xp: number;
      completedDays: number[];
    };
  };
}
```

### Persistencia
- Almacenamiento local de sesión
- Caché de contenido diario
- Queue de actualizaciones offline
- Sincronización al reconectar

### Performance
- Lazy loading de secciones
- Preload del siguiente día
- Optimización de imágenes
- Animaciones eficientes

## Stack Tecnológico Recomendado
- Framework: Next.js/React Native
- UI: Tailwind/Native Base
- Estado: Zustand/Redux Toolkit
- Animaciones: Framer Motion/React Native Reanimated

## Seguridad
- HTTPS para todas las comunicaciones
- Sanitización de inputs
- Rate limiting en formularios
- Manejo seguro de contraseñas
- Interceptores para autenticación

## Flujos Principales

1. **Registro/Login → Onboarding → Creación de Curso**
2. **Login → Dashboard → Continuar Curso**
3. **Completar Día → Recibir XP → Siguiente Día**
4. **Completar Sección → Desbloquear Badge → Nueva Sección**

## Notas Importantes
- La aplicación debe ser altamente responsiva
- Priorizar la experiencia móvil
- Mantener consistencia en desktop
- Feedback constante al usuario
- Gamificación efectiva para mantener engagement

## Entregables Esperados
1. Código fuente del frontend
2. Documentación de componentes
3. Guía de estilos y UI Kit
4. Tests unitarios y de integración
5. Manual de despliegue 