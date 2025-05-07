"""ContentAgent: Convierte el plan en bloques completos."""
from typing import List
from pydantic import BaseModel, Field
from openai import Agent, Runner
from schemas.course import Block
from .planner import PlanOutput, PlanStep
from tools.vector_search import VectorSearchTool

class ContentOutput(BaseModel):
    """Salida estructurada del ContentAgent."""
    blocks: List[Block]
    reasoning: str

def create_content_agent() -> Agent:
    """Crea y configura el ContentAgent."""
    
    vector_search = VectorSearchTool()
    
    agent = Agent(
        name="ContentAgent",
        instructions="""
        Eres un experto en creación de contenido educativo. Tu tarea es convertir cada elemento 
        del plan en un bloque completo que cumpla con el esquema Pydantic (schemas.course.Block).
        
        Antes de crear cada bloque:
        1. Usa vector_search para encontrar contenido similar existente
        2. Asegúrate que el nuevo contenido sea único y complementario
        3. Referencia contenido relacionado cuando sea relevante
        
        Reglas:
        1. Cada bloque debe tener todos sus campos obligatorios
        2. Los textos deben ser concisos (≤ 200 palabras)
        3. No incluir audioUrl todavía (lo añadirá MediaAgent)
        4. Para quizzes:
           - Opciones plausibles y bien redactadas
           - Respuesta correcta clara y sin ambigüedad
           - No repetir el mismo tipo de quiz dos veces seguidas
        
        Una vez que hayas creado todos los bloques de contenido, debes hacer handoff al 
        AssessmentAgent para que revise y enriquezca la evaluación si es necesario.
        """,
        tools=[vector_search.find_similar_courses],
        output_type=ContentOutput
    )
    
    return agent

async def generate_course_content(plan: PlanOutput) -> ContentOutput:
    """Genera los bloques de contenido basados en el plan."""
    
    # Si el plan está basado en un curso existente
    if "curso" in plan.reasoning and ("canónico" in plan.reasoning or "existente" in plan.reasoning):
        blocks = []
        
        # Solo preservamos exactamente para cursos canónicos con alta similitud
        if "sin modificaciones" in plan.reasoning:
            for step in plan.plan:
                if step.content:
                    # Convertimos el contenido existente al formato Block sin modificar
                    block_data = {
                        "type": step.type,
                        "xp": 10,
                    }
                    
                    if step.type == "read":
                        block_data.update({"title": None, "body": step.content})
                    elif step.type == "audio":
                        block_data.update({"text": step.content, "audioUrl": ""})
                    elif "quiz" in step.type:
                        # Para quizzes, preservamos exactamente el contenido original
                        block_data.update({"question": step.content})
                        quiz_data = eval(step.prompt)  # Asegurarse que el prompt contiene los datos estructurados
                        block_data.update(quiz_data)
                    
                    blocks.append(Block(**block_data))
            
            return ContentOutput(
                blocks=blocks,
                reasoning="Contenido preservado del curso canónico existente sin modificaciones"
            )
        
        # Para remixes (tanto de canónicos como no canónicos)
        else:
            agent = create_content_agent()
            # Añadimos contexto específico para remix
            result = await Runner.run(
                agent,
                {
                    "plan": [step.dict() for step in plan.plan],
                    "reasoning": plan.reasoning,
                    "instruction": """
                    Crea un remix actualizado del contenido existente:
                    1. Mantén los conceptos fundamentales correctos
                    2. Actualiza con información más reciente si aplica
                    3. Mejora ejemplos y explicaciones
                    4. Añade contenido complementario relevante
                    """
                }
            )
            return result.final_output
    
    # Si no hay base existente, generamos contenido nuevo
    agent = create_content_agent()
    result = await Runner.run(
        agent,
        {
            "plan": [step.dict() for step in plan.plan],
            "reasoning": plan.reasoning
        }
    )
    return result.final_output 