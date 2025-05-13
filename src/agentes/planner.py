# planner.py 
import os
from typing import List, Optional
from pydantic import BaseModel
from openai import OpenAI
from src.config import settings
from agents import Agent, Runner
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure OpenAI key is set
os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY
logger.info(f"OpenAI Model configurado: {settings.OPENAI_MODEL}")

class LearningDay(BaseModel):
    """Represents a single day in the learning plan"""
    day_number: int
    title: str
    is_action_day: bool
    description: Optional[str] = None

class LearningSection(BaseModel):
    """Represents a section in the learning plan"""
    title: str
    days: List[LearningDay]

class LearningPlan(BaseModel):
    """The complete learning plan"""
    sections: List[LearningSection]
    overview: str

def create_planner_agent() -> Agent:
    """Creates and configures the Planner Agent"""
    
    agent = Agent(
        name="Learning Journey Planner",
        instructions="""You are an AI learning coach creating personalized skill journeys.

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
        output_type=LearningPlan,
        model=settings.OPENAI_MODEL
    )
    
    return agent

async def generate_learning_plan(user_data: dict) -> LearningPlan:
    """Generates a personalized learning plan based on user data"""
    try:
        logger.info("Iniciando generación del plan de aprendizaje")
        logger.info(f"Datos del usuario: {user_data}")
        
        agent = create_planner_agent()
        logger.info("Agente planner creado exitosamente")
        
        # Create the context message with user data
        context_message = f"""Create a personalized learning plan based on these user details:

Name: {user_data['name']}
Skill to learn: {user_data['skill']}
Experience level: {user_data['experience']}
Motivation: {user_data['motivation']}
Daily available time: {user_data['time']}
Preferred learning style: {user_data['learning_style']}
Learning goal: {user_data['goal']}"""

        logger.info("Enviando solicitud al agente")
        result = await Runner.run(
            agent,
            [
                {
                    "role": "system",
                    "content": "You are an expert learning coach that creates personalized learning plans."
                },
                {
                    "role": "user",
                    "content": context_message
                }
            ]
        )
        logger.info("Respuesta recibida del agente")
        
        plan = result.final_output_as(LearningPlan)
        logger.info(f"Plan generado exitosamente con {len(plan.sections)} secciones")
        return plan
        
    except Exception as e:
        logger.error(f"Error generando el plan de aprendizaje: {str(e)}", exc_info=True)
        raise
