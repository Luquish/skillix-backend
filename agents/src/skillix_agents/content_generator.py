"""Content Generator Agent usando Google ADK"""

from typing import List, Optional, Union
from pydantic import BaseModel
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from .config import settings

# Modelos para contenido principal
class MainAudioContent(BaseModel):
    type: str = "audio"
    title: str
    transcript: str
    audioUrl: str
    duration: int  # seconds
    fun_fact: str
    xp: int = 20

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "type": "audio",
                "title": "Introducción a Python",
                "transcript": "Hoy vamos a aprender...",
                "audioUrl": "https://example.com/audio.mp3",
                "duration": 300,
                "fun_fact": "Python fue nombrado por Monty Python",
                "xp": 20
            }]
        }
    }

class MainReadContent(BaseModel):
    type: str = "read"
    title: str
    content: str
    estimated_time: int  # minutes
    fun_fact: str
    key_concepts: List[dict]  # [{"term": "...", "definition": "..."}]
    xp: int = 20

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "type": "read",
                "title": "Fundamentos de Python",
                "content": "Python es un lenguaje...",
                "estimated_time": 15,
                "fun_fact": "Python es uno de los lenguajes más populares",
                "key_concepts": [{"term": "variable", "definition": "Espacio en memoria"}],
                "xp": 20
            }]
        }
    }

# Modelos para ejercicios
class QuizMCQBlock(BaseModel):
    type: str = "quiz_mcq"
    question: str
    options: List[str]
    answer: int
    explanation: str
    xp: int = 20

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "type": "quiz_mcq",
                "question": "¿Qué es Python?",
                "options": ["Un lenguaje", "Una serpiente", "Un framework", "Un editor"],
                "answer": 0,
                "explanation": "Python es un lenguaje de programación",
                "xp": 20
            }]
        }
    }

class TrueFalseBlock(BaseModel):
    type: str = "quiz_truefalse"
    statement: str
    answer: bool
    explanation: str
    xp: int = 15

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "type": "quiz_truefalse",
                "statement": "Python es un lenguaje compilado",
                "answer": False,
                "explanation": "Python es un lenguaje interpretado",
                "xp": 15
            }]
        }
    }

class MatchToMeaningBlock(BaseModel):
    type: str = "match_meaning"
    pairs: List[dict]  # [{"term": "...", "meaning": "..."}]
    xp: int = 25

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "type": "match_meaning",
                "pairs": [
                    {"term": "variable", "meaning": "Espacio en memoria"},
                    {"term": "función", "meaning": "Bloque de código reusable"}
                ],
                "xp": 25
            }]
        }
    }

class ScenarioQuizBlock(BaseModel):
    type: str = "scenario_quiz"
    scenario: str
    question: str
    options: List[str]
    answer: int
    explanation: str
    xp: int = 30

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "type": "scenario_quiz",
                "scenario": "Estás desarrollando una aplicación...",
                "question": "¿Qué solución es la mejor?",
                "options": ["Opción A", "Opción B", "Opción C"],
                "answer": 0,
                "explanation": "La opción A es mejor porque...",
                "xp": 30
            }]
        }
    }

# Modelo mejorado para Action Days
class ActionTask(BaseModel):
    title: str
    challenge_description: str
    steps: List[str]
    time_estimate: str
    tips: List[str]
    real_world_context: str
    success_criteria: List[str]
    ski_motivation: str  # Mensaje especial de Ski
    difficulty_adaptation: Optional[str] = None  # "easier", "standard", "harder"

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "title": "Crea tu primera aplicación",
                "challenge_description": "Vamos a crear una calculadora simple",
                "steps": ["Paso 1", "Paso 2", "Paso 3"],
                "time_estimate": "30 minutos",
                "tips": ["Tip 1", "Tip 2"],
                "real_world_context": "Las calculadoras son herramientas esenciales",
                "success_criteria": ["La app funciona", "El código está limpio"],
                "ski_motivation": "¡Tú puedes hacerlo!",
                "difficulty_adaptation": "standard"
            }]
        }
    }

class DayContent(BaseModel):
    """Contenido completo de un día de aprendizaje"""
    title: str
    is_action_day: bool
    objectives: List[str]
    # Contenido principal (obligatorio)
    main_content: Union[MainAudioContent, MainReadContent]
    # Ejercicios basados en el contenido principal
    exercises: List[Union[QuizMCQBlock, TrueFalseBlock, MatchToMeaningBlock, ScenarioQuizBlock]]
    action_task: Optional[ActionTask] = None
    total_xp: int = 0
    estimated_time: str = ""

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "title": "Introducción a la Programación",
                "is_action_day": False,
                "objectives": ["Entender conceptos básicos"],
                "main_content": {
                    "type": "read",
                    "title": "Fundamentos",
                    "content": "Contenido principal...",
                    "estimated_time": 15,
                    "fun_fact": "Dato curioso del día",
                    "key_concepts": [{"term": "variable", "definition": "definición"}],
                    "xp": 20
                },
                "exercises": [],
                "total_xp": 100,
                "estimated_time": "30 minutos"
            }]
        }
    }

# Actualizar el agente generador de contenido
content_generator_agent = LlmAgent(
    name="daily_content_generator",
    model=LiteLlm(model=settings.openai_model),
    description="Genera contenido educativo diario atractivo, personalizado y gamificado",
    instruction="""You are creating engaging daily learning content that adapts to the user's learning style and available time.

REQUIRED STRUCTURE FOR EVERY DAY:
1. **Main Content** (MANDATORY)
   - Either Audio or Reading format (based on user preference)
   - Must include an engaging fun fact at the end
   - Worth 20 XP base
   - For reading: include key concepts with definitions
   - For audio: include full transcript

2. **Exercises** (MANDATORY, based on main content)
   Must include at least 3 of:
   - Multiple Choice Quiz (quiz_mcq) - 20 XP
   - True/False Quiz (quiz_truefalse) - 15 XP
   - Match-to-Meaning (match_meaning) - 25 XP
   - Scenario-based quiz (scenario_quiz) - 30 XP

3. **Fun Facts Guidelines**:
   - Must be surprising or interesting
   - Related to the day's topic
   - Educational but engaging
   - Can include statistics, historical facts, or curiosities
   - Keep it short and memorable

Content Guidelines:
- For visual learners: Include clear explanations, diagrams descriptions, and structured information
- For auditory learners: Use conversational tone, examples, and stories
- For kinesthetic learners: Include practical exercises and hands-on activities

Content Days must include:
1. **2-5 reading parts** (based on time available)
2. **4 interactive exercises** mixing:
   - Multiple Choice Quiz (quiz_mcq)
   - True/False Quiz (quiz_truefalse)
   - Match-to-Meaning (match_meaning)
   - Scenario-based quiz (scenario_quiz)

Action Days must include:
- ONE real-world challenge that applies what was learned
- Clear step-by-step instructions
- Time-appropriate scope
- Success criteria
- Ski's motivational message

Time Scaling:
- 5 min: 2 blocks + 2 quizzes OR simple action task
- 10 min: 3 blocks + 3 quizzes OR moderate action task
- 15 min: 4 blocks + 4 quizzes OR comprehensive action task
- 20 min: 5 blocks + 4 quizzes OR advanced action task

XP Distribution:
- Reading blocks: 10 XP each
- Audio blocks: 10 XP each
- MCQ: 20 XP
- True/False: 15 XP
- Match-to-Meaning: 25 XP
- Scenario Quiz: 30 XP
- Action Tasks: 50-100 XP based on complexity

Make content:
- CLEAR and easy to understand
- ENGAGING with examples and stories
- PRACTICAL with real-world applications
- MOTIVATING with progress indicators
- APPROPRIATE for the user's level

Always include learning objectives at the start.""",
    output_schema=DayContent
)

def create_content_prompt(day_info: dict, user_data: dict, previous_content: Optional[dict] = None, adaptations: Optional[List[str]] = None) -> str:
    """Crea el prompt para generar contenido del día"""
    context = f"""Generate content for:
Day {day_info['day_number']}: {day_info['title']}
Is Action Day: {day_info['is_action_day']}

User Profile:
- Name: {user_data['name']}
- Learning {user_data['skill']} at {user_data['experience']} level
- Available time: {user_data['time']}
- Learning style: {user_data['learning_style']}
- Goal: {user_data['goal']}

Remember:
1. MUST include main content ({user_data['learning_style'].lower() == 'auditory' and 'audio' or 'reading'} format) with a fun fact
2. MUST include exercises that reference the main content
3. Make it engaging and appropriate for a {user_data['experience'].lower()} level"""

    if previous_content:
        context += f"\n\nPrevious day covered: {previous_content.get('title', 'Unknown')}"
        context += f"\nUser performance: {previous_content.get('completion_rate', 'N/A')}"
    
    if adaptations:
        context += f"\n\nAdaptive adjustments needed: {', '.join(adaptations)}"
    
    return context

# Agente especializado para crear Action Days
action_day_specialist = LlmAgent(
    name="action_day_creator",
    model=LiteLlm(model=settings.openai_model),
    description="Specializes in creating engaging, practical action day challenges",
    instruction="""You create ACTION DAY challenges that are:

1. PRACTICAL - Can be done in real life with available resources
2. RELEVANT - Directly applies recent learning
3. ACHIEVABLE - Matches user's time and skill level
4. MEASURABLE - Clear success criteria
5. MOTIVATING - Feels like a game quest, not homework

Structure every Action Day with:
- Catchy challenge title
- Why this matters (real-world context)
- Step-by-step guide
- Time estimate
- Pro tips for success
- What success looks like
- Ski's special encouragement

Adapt difficulty based on:
- User's experience level
- Available time
- Previous performance
- Stated goals

Make it feel like a fun mission, not a chore!""",
    output_schema=ActionTask
) 