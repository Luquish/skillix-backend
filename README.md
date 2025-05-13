# skillix-backend

Estructura del proyecto para FastAPI desplegado en Cloud Run.

## Características Principales

1. **Sistema de Identificación**:
   - Uso de email como identificador principal de usuario
   - Sanitización de emails para nombres de directorio (ejemplo: user@example.com → user_at_example_dot_com)
   - Todos los endpoints utilizan email en lugar de uid

2. **Sistema de Detección de Cursos Similares**:
   - Implementación basada en embeddings usando OpenAI text-embedding-3-small
   - Detección de similitud considerando:
     - Nombre del skill
     - Nivel de experiencia
     - Tiempo disponible (máximo 20 minutos por día)
   - Optimización de llamadas a la API guardando embeddings calculados

3. **Almacenamiento de Embeddings**:
   - Estructura: `storage/embeddings/skills.json`
   - Cada entrada contiene:
     - Texto del skill con contexto
     - Vector de embedding
     - Hash ID
     - Timestamp de creación

4. **Sistema de Tiempo**:
   - Opciones de tiempo diario: 5, 10, 15 o 20 minutos
   - Contenido adaptado al tiempo disponible
   - Escalado automático de contenido según tiempo

## Estructura de carpetas

- `Dockerfile`: Imagen para despliegue
- `cloudbuild.yaml`: Configuración de Cloud Build
- `src/`: Código fuente principal
  - `main.py`: Punto de entrada FastAPI
  - `agents/`: Lógica de agentes
    - `orchestrator.py`: Coordina la creación de cursos y generación de contenido
    - `planner.py`: Genera planes de aprendizaje personalizados
    - `content_generator.py`: Genera contenido diario adaptativo
  - `tools/`: Herramientas auxiliares
  - `schemas/`: Esquemas Pydantic
  - `services/`: Servicios externos
    - `storage_service.py`: Manejo de almacenamiento local de datos
  - `utils/`: Utilidades y helpers
  - `api/`: Endpoints de la API
    - `plan.py`: Endpoint para crear planes de aprendizaje
    - `day.py`: Endpoint para gestionar contenido diario
- `tests/`: Pruebas unitarias e integración
- `storage/`: Almacenamiento local de datos
  - `users/`: Datos de usuarios
    - `<email>/`
      - `preferences.json`: Preferencias del usuario
      - `roadmaps/`
        - `<course_id>/`
          - `roadmap.json`: Datos del plan de aprendizaje
          - `days/`: Contenido diario
  - `courses/`: Roadmaps compartidos
    - `<roadmap_id>/`: ID generado a partir de preferencias clave
      - `roadmap.json`: Plan de aprendizaje compartido
      - `metadata.json`: Metadatos del roadmap
  - `embeddings/`: Almacenamiento de embeddings
    - `skills.json`: Vectores de embedding y metadata

## Funcionalidades Implementadas

### Sistema de Almacenamiento

El sistema utiliza un almacenamiento local basado en archivos JSON con la siguiente estructura:

- **Preferencias de Usuario** (`preferences.json`):
  - Nombre, experiencia, motivación
  - Tiempo disponible
  - Estilo de aprendizaje
  - Objetivos

- **Plan de Aprendizaje** (`roadmap.json`):
  - Plan de aprendizaje completo
  - Progreso actual
  - Estadísticas (streak, XP)
  - Historial de días completados

- **Roadmaps Compartidos** (`courses/<roadmap_id>/`):
  - Planes de aprendizaje reutilizables
  - Metadatos de versión y uso
  - Historial de usuarios
  - Actualizaciones automáticas

- **Contenido Diario** (`days/<number>`):
  - Título y tipo de día
  - Bloques de contenido
  - Estado de completitud
  - Puntuación y feedback

### Sistema de Roadmaps Compartidos

El sistema implementa un mecanismo inteligente para compartir y mejorar planes de aprendizaje:

1. **Identificación Única**:
   - Genera IDs basados en preferencias clave
   - Permite encontrar planes similares
   - Facilita la reutilización de contenido

2. **Versionado y Mejora**:
   - Mantiene registro de versiones
   - Actualiza planes existentes
   - Trackea uso por usuarios

3. **Optimización de Recursos**:
   - Reutiliza planes exitosos
   - Mejora continua del contenido
   - Aprovecha experiencias previas

### API Endpoints

#### POST /plan
Crea un nuevo plan de aprendizaje personalizado:
- Genera roadmap completo
- Crea primer día de contenido
- Guarda preferencias del usuario
- Inicializa inscripción

#### POST /day
Gestiona el progreso diario:
- Marca días como completados
- Registra puntuación y feedback
- Genera contenido del siguiente día
- Adapta contenido según preferencias guardadas

### Características del Sistema

1. **Personalización**:
   - Contenido adaptado al nivel del usuario
   - Respeta preferencias de tiempo y estilo
   - Ajusta dificultad según progreso

2. **Almacenamiento Estructurado**:
   - JSON indentado para mejor legibilidad
   - Organización jerárquica de datos
   - Separación clara de responsabilidades

3. **Generación de Contenido**:
   - Bloques de lectura interactivos
   - Cuestionarios variados (MCQ, T/F, matching)
   - Días de acción para práctica

4. **Seguimiento de Progreso**:
   - Registro de completitud
   - Sistema de puntuación
   - Feedback personalizado

## Uso

Para ejecutar el servidor:

```bash
uvicorn src.main:app --reload
```

Ejemplos de uso de la API:

1. Crear nuevo plan de aprendizaje:
```bash
curl -X POST http://localhost:8000/plan \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "skill": "Python Programming",
    "experience": "Beginner",
    "motivation": "Career growth",
    "time": "20 minutes",
    "learning_style": "Reading and practicing",
    "goal": "Build web applications"
  }'
```

2. Marcar día como completado y obtener siguiente:
```bash
curl -X POST http://localhost:8000/day \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "course_id": "python-programming",
    "current_day": 1,
    "completed": true,
    "score": 0.95,
    "feedback": "¡Excelente lección!"
  }'
``` 