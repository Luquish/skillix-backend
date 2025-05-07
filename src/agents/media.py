from typing import List, Dict, Any
from pydantic import BaseModel
from openai import Agent, Runner
from schemas.course import Block, CourseDoc
from services.tts import synthesize_tts
from services.gcp_clients import upload_to_gcs
from tools.course_builder import build_course_doc

class MediaOutput(BaseModel):
    """Salida estructurada del MediaAgent."""
    course: CourseDoc
    stats: Dict[str, Any]  # Estadísticas sobre recursos generados

def create_media_agent() -> Agent:
    """Crea y configura el MediaAgent."""
    
    agent = Agent(
        name="MediaAgent",
        instructions="""
        Eres un experto en contenido multimedia. Tu tarea es añadir los recursos necesarios
        (audio, imágenes) a los bloques que lo requieran y producir el CourseDoc final.
        
        Reglas:
        1. Para bloques 'audio':
           - Usar synthesize_tts para generar el MP3
           - Subir a GCS y actualizar audioUrl
        2. Para bloques con imágenes:
           - Seleccionar imágenes apropiadas
           - Subir a GCS y actualizar imageUrls
        3. Procesar los bloques en paralelo cuando sea posible
        
        Como eres el último agente en la cadena, debes:
        1. Asegurarte de que todos los recursos multimedia estén listos
        2. Usar create_course_doc para construir el CourseDoc final con todos los metadatos
        3. Incluir estadísticas sobre los recursos generados
        
        El CourseDoc debe incluir:
        - Todos los campos obligatorios (courseId, version, language, etc.)
        - Los bloques con sus recursos multimedia
        - Metadatos actualizados (createdAt, updatedAt, etc.)
        """,
        tools=[
            synthesize_tts,
            upload_to_gcs,
            build_course_doc
        ],
        output_type=MediaOutput
    )
    
    return agent

async def add_media_resources(blocks: List[Block], course_id: str) -> CourseDoc:
    """Añade recursos multimedia a los bloques y genera el CourseDoc final."""
    agent = create_media_agent()
    result = await Runner.run(
        agent,
        {
            "blocks": [block.dict() for block in blocks],
            "course_id": course_id
        }
    )
    
    # Construir el CourseDoc final
    return CourseDoc(
        courseId=course_id,
        blocks=result.final_output.blocks,
        # ... otros campos necesarios
    ) 