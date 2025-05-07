# planner.py 
import os
from src.config import settings
from typing import List
from pydantic import BaseModel
from openai import Agent, Runner
from services.brave_search import search_web
from tools.vector_search import VectorSearchTool

# Ensure OpenAI key env var is set for child SDKs
os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY


class PlanStep(BaseModel):
    """Representa un paso en el plan del curso."""
    type: str
    prompt: str
    content: str | None = None

class PlanOutput(BaseModel):
    """Salida estructurada del PlannerAgent."""
    plan: List[PlanStep]
    reasoning: str

def create_planner_agent() -> Agent:
    """Crea y configura el PlannerAgent."""
    
    vector_search = VectorSearchTool()
    
    agent = Agent(
        name="PlannerAgent",
        instructions="""
        Eres un experto en diseño instruccional. Tu tarea es diseñar una secuencia pedagógica 
        efectiva de 5-8 bloques que mezclen diferentes modalidades según Bloom/ARCS.
        
        Antes de crear el plan:
        1. Usa vector_search para encontrar cursos similares existentes
        2. Analiza su estructura y enfoque
        3. Diseña un plan complementario y único
        
        Reglas:
        1. Combina diferentes tipos de bloque (audio, read, quiz_mcq, etc.)
        2. Sigue un orden lógico: introducción → práctica → evaluación
        3. Máximo 8 bloques en total
        4. Cada bloque debe tener un propósito pedagógico claro
        
        Para cada bloque debes especificar:
        - type: Uno de los tipos válidos (audio, read, quiz_mcq, etc.)
        - prompt: Instrucción clara de qué debe contener
        - content: Borrador inicial del contenido (opcional)
        
        Una vez que hayas diseñado el plan, debes hacer handoff al ContentAgent para que 
        desarrolle el contenido detallado de cada bloque.
        """,
        tools=[search_web, vector_search.find_similar_courses],
        output_type=PlanOutput
    )
    
    return agent

async def generate_course_plan(topic: str) -> PlanOutput:
    """Genera un plan de curso para el tema dado."""
    vector_search = VectorSearchTool()
    
    # Buscamos cursos similares con un umbral base
    similar_course = vector_search.find_similar_courses(
        query=topic,
        score_threshold=0.85  # Umbral base para encontrar similares
    )
    
    if similar_course:
        similarity_score = similar_course.get("similarity_score", 0)
        is_canonical = similar_course.get("canonical", False)
        
        # Solo retornamos el curso exacto si es canónico y tiene alta similitud
        if is_canonical and similarity_score > 0.95:
            return PlanOutput(
                plan=[
                    PlanStep(
                        type=block["type"],
                        prompt=block.get("text", ""),
                        content=block.get("text", None)
                    )
                    for block in similar_course.get("blocks", [])
                ],
                reasoning="Utilizando curso canónico existente sin modificaciones debido a alta similitud semántica."
            )
        
        # Para cualquier otro caso (no canónico o similitud menor), usamos como base para remix
        elif similarity_score > 0.85:
            base_reasoning = "canónico" if is_canonical else "existente no canónico"
            return PlanOutput(
                plan=[
                    PlanStep(
                        type=block["type"],
                        prompt=f"Remix y actualización del contenido {base_reasoning}: {block.get('text', '')}",
                        content=block.get("text", None)
                    )
                    for block in similar_course.get("blocks", [])
                ],
                reasoning=f"Creando remix actualizado basado en curso {base_reasoning} similar."
            )
    
    # Si no hay curso similar, generamos uno nuevo
    agent = create_planner_agent()
    result = await Runner.run(agent, topic)
    return result.final_output
