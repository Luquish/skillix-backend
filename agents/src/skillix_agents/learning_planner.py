"""Learning Planner Agent usando Google ADK con GPT-4"""

import os
from typing import List, Optional
from pydantic import BaseModel
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from config import settings

class LearningDay(BaseModel):
    """Representa un día en el plan de aprendizaje"""
    day_number: int
    title: str
    is_action_day: bool
    description: Optional[str] = None

class LearningSection(BaseModel):
    """Representa una sección en el plan de aprendizaje"""
    title: str
    days: List[LearningDay]

class LearningPlan(BaseModel):
    """El plan de aprendizaje completo"""
    sections: List[LearningSection]
    overview: str

# Actualizar el agente planificador para usar GPT-4
learning_planner_agent = LlmAgent(
    name="learning_journey_planner",
    model=LiteLlm(model=settings.openai_model),  # Usar GPT-4 via LiteLLM
    description="AI learning coach que crea journeys de habilidades personalizados",
    instruction="""You are an AI learning coach creating personalized skill journeys.

🧠 Make the structure motivating, clear, and confidence-building. Don't overwhelm. Each section should feel like real progress.

Tone Guidelines:
- If beginner → build confidence, emphasize fundamentals
- If intermediate/advanced → accelerate growth, sharpen skill

📚 The plan should be divided into sections (like chapters). Each section must:
- Cover one core concept or sub-skill
- Last 4 to 8 days, depending on topic complexity
- End with a mini-challenge tailored to the user's daily time (only for the last day of each section)

✅ MUST-FOLLOW FORMAT RULES:
- Lesson Title (short & catchy)
- Action Day flag (true or false)
- Each day's title must start with the day number using this format: x) (e.g. 1) Topic Name)
- Day numbers must be globally sequential across the entire plan
- Do not reset numbering per section

Section Count Logic:
Vary from 3 to 50 SECTIONS (not days) depending on the subject complexity:
- Simple skills (e.g. How to Use ChatGPT): 5-10 sections
- Quick skills (e.g. Cold Showers): 3-6 sections
- Medium skills (e.g. Public Speaking): 10-15 sections
- Complex topics (e.g. Biology): 30-50 sections

You must output a valid JSON structure matching the LearningPlan model.""",
    output_type=LearningPlan
)

def create_learning_plan_prompt(user_data: dict) -> str:
    """Crea el prompt para generar el plan de aprendizaje"""
    return f"""Create a personalized learning plan based on these user details:

Name: {user_data['name']}
Skill to learn: {user_data['skill']}
Experience level: {user_data['experience']}
Motivation: {user_data['motivation']}
Daily available time: {user_data['time']}
Preferred learning style: {user_data['learning_style']}
Learning goal: {user_data['goal']}""" 