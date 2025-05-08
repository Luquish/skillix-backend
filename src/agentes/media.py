"""MediaAgent: Añade recursos multimedia a los bloques del curso."""
from typing import List
from pydantic import BaseModel
from agents import Agent, Runner
from schemas.course import Block, CourseDoc
from tools.synthesize_tts import synthesize_text

class MediaOutput(BaseModel):
    """Salida estructurada del MediaAgent."""
    blocks: List[Block]
    reasoning: str

def create_media_agent() -> Agent:
    """Crea y configura el MediaAgent."""
    
    agent = Agent(
        name="Media Expert",
        instructions="""
        Eres un experto en contenido multimedia educativo. Tu tarea es enriquecer 
        los bloques del curso con recursos multimedia.
        
        Para cada bloque debes:
        1. Identificar oportunidades para audio
        2. Generar scripts claros para TTS
        3. Asegurar calidad profesional
        4. Mantener consistencia de estilo
        
        Reglas específicas:
        1. Usar TTS para bloques de audio
        2. Scripts concisos y bien estructurados
        3. Tono profesional pero amigable
        4. Duración apropiada (30-90 segundos)
        """,
        tools=[synthesize_text],
        output_type=MediaOutput
    )
    
    return agent

async def add_media_resources(blocks: List[Block], course_id: str) -> CourseDoc:
    """Añade recursos multimedia a los bloques y genera el CourseDoc final."""
    agent = create_media_agent()
    result = await Runner.run(
        agent,
        [
            {
                "role": "system",
                "content": "Eres un experto en contenido multimedia educativo."
            },
            {
                "role": "user",
                "content": f"""Enriquecer los bloques del curso {course_id} con recursos multimedia.

Bloques actuales:
{chr(10).join(f'- {block.type}: {getattr(block, "title", "")}' for block in blocks)}"""
            }
        ]
    )
    
    # Construir el CourseDoc final con los bloques enriquecidos
    return CourseDoc(
        courseId=course_id,
        blocks=result.final_output_as(MediaOutput).blocks,
        title=f"Curso {course_id}",
        description="Curso generado automáticamente",
        level="beginner",
        tags=[],
        canonical=False
    ) 