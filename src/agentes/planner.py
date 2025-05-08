# planner.py 
import os
from src.config import settings
from typing import List
from pydantic import BaseModel
from agents import Agent, Runner
from tools.search_web import search_web, SearchWebInput, SearchWebOutput
from services.vector_service import VectorService
from config import settings

# Ensure OpenAI key env var is set for child SDKs
os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY


class PlanStep(BaseModel):
    """Un paso en el plan del curso."""
    type: str
    title: str
    description: str
    content: str | None = None
    prompt: str | None = None

class PlanOutput(BaseModel):
    """Salida estructurada del PlannerAgent."""
    plan: List[PlanStep]
    reasoning: str

def create_planner_agent() -> Agent:
    """Crea y configura el PlannerAgent."""
    
    agent = Agent(
        name="Course Planner",
        instructions="""
        Eres un experto en planificación educativa. Tu tarea es crear un plan detallado 
        para un curso sobre el tema proporcionado.
        
        Para cada paso del plan debes:
        1. Definir el tipo de contenido (read, audio, quiz, etc)
        2. Crear un título descriptivo
        3. Explicar el objetivo del paso
        4. Proporcionar contenido base o prompt si es necesario
        
        El plan debe:
        - Seguir una progresión lógica
        - Incluir variedad de tipos de contenido
        - Mantener el engagement del estudiante
        - Asegurar la comprensión del tema
        """,
        output_type=PlanOutput
    )
    
    return agent

async def generate_course_plan(topic: str) -> PlanOutput:
    """Genera el plan inicial del curso."""
    agent = create_planner_agent()
    result = await Runner.run(
        agent,
        f"Crear un plan de curso sobre: {topic}"
    )
    return result.final_output_as(PlanOutput)
