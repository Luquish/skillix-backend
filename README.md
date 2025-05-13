# skillix-backend

Estructura del proyecto para FastAPI desplegado en Cloud Run.

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
- `storage/`: Almacenamiento local de datos (solo estructura en git)
  - `users/`: Datos de usuarios
    - `<user_id>/`
      - `preferences.json`: Preferencias del usuario
      - `enrollments/`
        - `<course_id>/`
          - `enrollment.json`: Datos de inscripción
          - `days/`: Contenido diario
  - `courses/`: Datos de cursos

> **Nota sobre almacenamiento**: La carpeta `storage/` mantiene solo su estructura en el repositorio git mediante archivos `.gitkeep`. Los archivos de datos (*.json) son ignorados para mantener la privacidad y evitar conflictos. Al clonar el repositorio, la estructura se creará automáticamente pero los datos deberán generarse mediante el uso de la API.

## Funcionalidades Implementadas

### Sistema de Almacenamiento

El sistema utiliza un almacenamiento local basado en archivos JSON con la siguiente estructura:

- **Preferencias de Usuario** (`preferences.json`):
  - Nombre, experiencia, motivación
  - Tiempo disponible
  - Estilo de aprendizaje
  - Objetivos

- **Inscripción a Curso** (`enrollment.json`):
  - Plan de aprendizaje completo
  - Progreso actual
  - Estadísticas (streak, XP)
  - Historial de días completados

- **Contenido Diario** (`days/<number>`):
  - Título y tipo de día
  - Bloques de contenido
  - Estado de completitud
  - Puntuación y feedback

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
    "uid": "user_001",
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
    "uid": "user_001",
    "course_id": "python-programming",
    "current_day": 1,
    "completed": true,
    "score": 0.95,
    "feedback": "¡Excelente lección!"
  }'
``` 