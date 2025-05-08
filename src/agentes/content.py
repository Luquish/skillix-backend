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
        instructions=f"""
        Eres un experto en creación de contenido educativo. Tu tarea es convertir 
        el plan en bloques de contenido detallados y efectivos.
        
        Para cada bloque debes:
        1. Mantener el tipo especificado en el plan
        2. Desarrollar contenido claro y conciso
        3. Incluir ejemplos relevantes
        4. Asegurar que el contenido sea engaging
        5. Asignar puntos de experiencia (xp) según la dificultad:
           - Lectura básica: 5 xp
           - Lectura con ejemplos: 8 xp
           - Audio explicativo: 7 xp
           - Quiz simple: 10 xp
           - Quiz complejo: 15 xp
        
        Reglas específicas:
        1. Textos concisos (≤ 200 palabras)
        2. Evaluaciones con instrucciones claras
        3. Ejercicios prácticos y relevantes
        4. Progresión lógica entre bloques
        5. Maximo {settings.MAX_BLOCKS} bloques
        """,
        output_type=ContentOutput
    )
    
    return agent

async def generate_course_content(plan: PlanOutput) -> ContentOutput:
    """Genera el contenido detallado basado en el plan."""
    print(f"\n📊 Plan contiene {len(plan.plan)} pasos")
    
    agent = create_content_agent()
    result = await Runner.run(
        agent,
        [
            {
                "role": "system",
                "content": "Eres un experto en creación de contenido educativo."
            },
            {
                "role": "user",
                "content": f"""Generar contenido detallado basado en el siguiente plan:

Plan del curso:
{plan.reasoning}

Pasos del plan:
{chr(10).join(f'- {step.title}: {step.description}' for step in plan.plan)}"""
            }
        ]
    )
    content_output = result.final_output_as(ContentOutput)
    print(f"📦 ContentAgent generó {len(content_output.blocks)} bloques (máximo permitido: {settings.MAX_BLOCKS})")
    return content_output 