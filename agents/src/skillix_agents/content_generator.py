"""Content Generator Agent usando Google ADK"""

from typing import List, Optional, Union
from pydantic import BaseModel
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from config import settings

# Modelos para diferentes tipos de bloques
class AudioBlock(BaseModel):
    type: str = "audio"
    text: str
    audioUrl: str
    xp: int = 10

class ReadBlock(BaseModel):
    type: str = "read"
    title: Optional[str]
    body: str
    xp: int = 10

class QuizMCQBlock(BaseModel):
    type: str = "quiz_mcq"
    question: str
    options: List[str]
    answer: int
    xp: int = 20

class TrueFalseBlock(BaseModel):
    type: str = "quiz_truefalse"
    statement: str
    answer: bool
    xp: int = 15

class MatchToMeaningBlock(BaseModel):
    type: str = "match_meaning"
    pairs: List[dict]  # [{"term": "...", "meaning": "..."}]
    xp: int = 25

class ScenarioQuizBlock(BaseModel):
    type: str = "scenario_quiz"
    scenario: str
    question: str
    options: List[str]
    answer: int
    explanation: str
    xp: int = 30

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

class DayContent(BaseModel):
    """Contenido completo de un día de aprendizaje"""
    title: str
    is_action_day: bool
    blocks: List[Union[AudioBlock, ReadBlock, QuizMCQBlock, TrueFalseBlock, MatchToMeaningBlock, ScenarioQuizBlock]]
    action_task: Optional[ActionTask] = None
    total_xp: int = 0
    estimated_time: str = ""
    learning_objectives: List[str] = []

# Actualizar el agente generador de contenido
content_generator_agent = LlmAgent(
    name="daily_content_generator",
    model=LiteLlm(model=settings.openai_model),
    description="Genera contenido educativo diario atractivo, personalizado y gamificado",
    instruction="""You are creating engaging daily learning content that adapts to the user's learning style and available time.

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
    output_type=DayContent
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
- Goal: {user_data['goal']}"""

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
    output_type=ActionTask
) 