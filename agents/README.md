# Skillix Agents - Sistema Multi-Agente de Aprendizaje Personalizado

Sistema de agentes inteligentes construido con Google ADK (Agent Development Kit) que crea experiencias de aprendizaje personalizadas usando múltiples modelos de IA.

## 🏗️ Arquitectura

El sistema implementa un patrón de delegación multi-agente inspirado en las mejores prácticas de ADK:

```
┌─────────────────────────────────────────────────────────────┐
│                    Team Coordinator                           │
│                  (Delegación Automática)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                      │
        ▼                                      ▼
┌───────────────┐                     ┌───────────────┐
│   Greeting    │                     │   Progress    │
│    Agent      │                     │   Checker     │
└───────────────┘                     └───────────────┘
        │                                      │
        └──────────────┬───────────────────────┘
                       │
                       ▼
              ┌───────────────┐
              │ Orchestrator  │
              │    Agent      │
              └───────┬───────┘
                      │
     ┌────────────────┼────────────────┐
     │                │                │
     ▼                ▼                ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│  Skill   │   │Pedagogical│  │ Learning │
│ Analyzer │   │  Expert   │  │ Planner  │
└──────────┘   └──────────┘   └──────────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │   Content    │
                              │  Generator   │
                              └──────────────┘
```

## 🤖 Agentes Especializados

### 1. **Team Coordinator** (`team_coordinator_agent`)
- **Rol**: Punto de entrada principal que delega automáticamente a agentes especializados
- **Capacidades**: 
  - Interpreta solicitudes del usuario
  - Delega tareas al agente apropiado
  - Mantiene contexto de conversación

### 2. **Skill Analyzer** (`skill_analyzer_agent`)
- **Rol**: Analiza y descompone habilidades complejas
- **Capacidades**:
  - Identifica componentes de habilidades
  - Determina prerequisitos
  - Estima tiempos de aprendizaje
  - Evalúa demanda del mercado

### 3. **Pedagogical Expert** (`pedagogical_expert_agent`)
- **Rol**: Valida y optimiza planes desde perspectiva educativa
- **Capacidades**:
  - Aplica taxonomía de Bloom
  - Evalúa carga cognitiva
  - Diseña estrategias de scaffolding
  - Recomienda técnicas de engagement

### 4. **Learning Planner** (`learning_planner_agent`)
- **Rol**: Crea roadmaps de aprendizaje estructurados
- **Capacidades**:
  - Genera planes por secciones y días
  - Adapta a nivel de experiencia
  - Considera tiempo disponible
  - Incluye días de acción práctica

### 5. **Content Generator** (`content_generator_agent`)
- **Rol**: Genera contenido educativo diario
- **Capacidades**:
  - Crea bloques de audio, lectura y quiz
  - Adapta a estilo de aprendizaje
  - Diseña tareas prácticas
  - Mantiene coherencia narrativa

### 6. **Orchestrator** (`orchestrator_agent`)
- **Rol**: Coordina pipeline completo de creación de cursos
- **Capacidades**:
  - Ejecuta análisis → plan → validación → contenido
  - Mantiene estado de sesión
  - Implementa callbacks de seguridad
  - Gestiona contenido adaptativo

## 🔧 Características Clave

### Session State Management
- Persistencia de contexto entre interacciones
- Memoria de preferencias del usuario
- Tracking de progreso y estado

### Safety Callbacks
- `before_model_callback`: Filtra contenido inapropiado
- `before_tool_callback`: Valida argumentos de herramientas
- Bloqueo de habilidades no permitidas

### Multi-Model Support
- GPT-4 como modelo principal (configurable)
- Soporte para Gemini, Claude y otros vía LiteLLM
- Fácil cambio entre modelos

### Data Connect Integration
- Modelos mapeados al esquema de Firebase
- Cliente preparado para persistencia
- Soporte para enrollments y progreso

## 📦 Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd skillix-backend/agents

# Instalar dependencias
pip install -e .
```

## 🚀 Uso Básico

### Ejemplo 1: Usar el Team Coordinator

```python
from skillix_agents import SkillixTeamRunner, session_service
import asyncio

async def main():
    # Crear runner del equipo
    runner = SkillixTeamRunner(session_service)
    
    # Procesar solicitud del usuario
    result = await runner.process_user_request(
        user_message="Quiero aprender Python desde cero",
        firebase_uid="user123",
        context={
            "user_data": {
                "name": "Juan",
                "experience": "beginner",
                "time": "30 minutos diarios",
                "learning_style": "visual"
            }
        }
    )
    
    print(result["response"])
    print(f"Delegado a: {result['delegated_to']}")

asyncio.run(main())
```

### Ejemplo 2: Crear Curso Completo

```python
from skillix_agents import SkillixOrchestrator
import asyncio

async def create_course():
    orchestrator = SkillixOrchestrator()
    
    user_data = {
        "name": "María",
        "skill": "Machine Learning",
        "experience": "intermediate",
        "motivation": "Cambiar de carrera a Data Science",
        "time": "45 minutos",
        "learning_style": "hands-on",
        "goal": "Conseguir trabajo como ML Engineer"
    }
    
    result = await orchestrator.analyze_and_plan_course(
        user_data=user_data,
        firebase_uid="user456"
    )
    
    if result["success"]:
        print(f"Plan creado: {result['learning_plan']['overview']}")
        print(f"Análisis pedagógico: {result['pedagogical_validation']}")
        print(f"Primer día: {result['first_day_content']['title']}")

asyncio.run(create_course())
```

## 🔐 Variables de Entorno

```bash
# Requerido
OPENAI_API_KEY=your-openai-api-key

# Opcional (para multi-modelo)
GOOGLE_API_KEY=your-google-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Firebase (cuando esté configurado)
FIREBASE_PROJECT_ID=your-project-id
```

## 📊 Esquema de Datos

El sistema está diseñado para integrarse con Firebase Data Connect con las siguientes entidades principales:

- **User**: Información del usuario y preferencias
- **LearningPlan**: Roadmap completo del curso
- **PlanSection**: Secciones/capítulos del plan
- **DayContent**: Contenido diario generado
- **Enrollment**: Inscripciones activas
- **UserProgress**: Progreso y métricas

## 🧪 Testing

```bash
# Ejecutar tests
pytest tests/

# Con coverage
pytest --cov=skillix_agents tests/
```

## 🛣️ Roadmap

- [ ] Integración completa con Firebase Data Connect
- [ ] Soporte para más tipos de contenido (video, ejercicios interactivos)
- [ ] Sistema de recomendaciones basado en progreso
- [ ] Análisis de sentimiento para feedback
- [ ] Generación de certificados
- [ ] API REST para integración con frontend

## 🤝 Contribuir

1. Fork el repositorio
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo licencia MIT. Ver `LICENSE` para más detalles. 