"""ContentAgent: Genera el contenido detallado del curso."""
from typing import List
from pydantic import BaseModel
from agents import Agent, Runner
from schemas.course import Block
from .planner import PlanOutput
from config import settings

class ContentOutput(BaseModel):
    """Salida estructurada del ContentAgent."""
    blocks: List[Block]
    reasoning: str

def create_content_agent() -> Agent:
    """Crea y configura el ContentAgent."""
    
    agent = Agent(
        name="Content Creator",
        instructions="""
        Eres un experto en creación de contenido educativo. Tu tarea es convertir 
        el plan en bloques de contenido detallados y efectivos.
        
        Para cada bloque debes:
        1. Mantener el tipo especificado en el plan
        2. Desarrollar contenido claro y conciso
        3. Incluir ejemplos relevantes
        4. Asegurar que el contenido sea engaging
        
        Reglas específicas:
        1. Textos concisos (≤ 200 palabras)
        2. Evaluaciones con instrucciones claras
        3. Ejercicios prácticos y relevantes
        4. Progresión lógica entre bloques
        """,
        output_type=ContentOutput
    )
    
    return agent

async def generate_course_content(plan: PlanOutput) -> ContentOutput:
    """Genera el contenido detallado basado en el plan."""
    agent = create_content_agent()
    result = await Runner.run(
        agent,
        {
            "plan": [step.dict() for step in plan.plan],
            "reasoning": plan.reasoning
        }
    )
    return result.final_output_as(ContentOutput) 