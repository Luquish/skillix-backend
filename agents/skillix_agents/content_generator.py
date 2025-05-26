"""Content Generator Agent usando Google ADK"""

from typing import List, Optional, Union
from pydantic import BaseModel
from google.adk.agents import Agent
from .config import openai_model

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

class ActionTask(BaseModel):
    title: str
    description: str
    duration: str
    tips: List[str]

class DayContent(BaseModel):
    """Contenido completo de un día de aprendizaje"""
    title: str
    is_action_day: bool
    blocks: List[Union[AudioBlock, ReadBlock, QuizMCQBlock]]
    action_task: Optional[ActionTask] = None

# Actualizar el agente generador de contenido
content_generator_agent = Agent(
    name="daily_content_generator",
    model=openai_model,  # Usar GPT-4 via LiteLLM
    description="Genera contenido educativo diario atractivo y personalizado",
    instruction="""You are creating engaging daily learning content that adapts to the user's learning style and available time.

Content Guidelines:
- For visual learners: Include clear explanations, diagrams descriptions, and structured information
- For auditory learners: Use conversational tone, examples, and stories
- For kinesthetic learners: Include practical exercises and hands-on activities

Block Types Available:
1. audio: Brief audio-style content (conversational, engaging)
2. read: Reading material with clear structure
3. quiz_mcq: Multiple choice questions to reinforce learning

For Action Days:
- Create practical tasks that fit the user's available time
- Include specific, actionable steps
- Provide helpful tips for success

Time Adaptation:
- 10-20 min: 2-3 blocks + simple action task
- 30-45 min: 3-4 blocks + moderate action task  
- 60+ min: 4-5 blocks + comprehensive action task

Make content motivating, clear, and confidence-building. Each day should feel like progress.""",
    output_type=DayContent
)

def create_content_prompt(day_info: dict, user_data: dict, previous_content: Optional[dict] = None) -> str:
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
    
    return context 