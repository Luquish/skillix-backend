"""AssessmentAgent: Revisa y enriquece las evaluaciones del curso."""
from typing import List
from pydantic import BaseModel
from agents import Agent, Runner
from schemas.course import Block
from tools.assessment_generator import (
    generate_mcq,
    generate_tf,
    generate_sentence_shuffle,
    generate_matching_pairs,
    generate_cloze_mcq,
    generate_scenario_mcq
)

class AssessmentOutput(BaseModel):
    """Salida estructurada del AssessmentAgent."""
    blocks: List[Block]
    reasoning: str

def create_assessment_agent() -> Agent:
    """Crea y configura el AssessmentAgent."""
    
    agent = Agent(
        name="Assessment Expert",
        instructions="""
        Eres un experto en evaluación educativa. Tu tarea es revisar y mejorar 
        las evaluaciones del curso.
        
        Para cada evaluación debes:
        1. Verificar que sea clara y efectiva
        2. Asegurar que mide el aprendizaje real
        3. Proporcionar retroalimentación útil
        4. Mantener un nivel apropiado
        
        Puedes usar las siguientes herramientas:
        - generate_mcq: Preguntas de opción múltiple
        - generate_tf: Verdadero/Falso
        - generate_sentence_shuffle: Ordenar oraciones
        - generate_matching_pairs: Emparejar conceptos
        - generate_cloze_mcq: Completar espacios
        - generate_scenario_mcq: Escenarios prácticos
        """,
        tools=[
            generate_mcq,
            generate_tf,
            generate_sentence_shuffle,
            generate_matching_pairs,
            generate_cloze_mcq,
            generate_scenario_mcq
        ],
        output_type=AssessmentOutput
    )
    
    return agent

async def enrich_course_assessment(blocks: List[Block]) -> AssessmentOutput:
    """Enriquece la evaluación del curso si es necesario."""
    agent = create_assessment_agent()
    result = await Runner.run(
        agent,
        [
            {
                "role": "system",
                "content": "Eres un experto en evaluación educativa."
            },
            {
                "role": "user",
                "content": f"""Revisar y mejorar las evaluaciones del curso.

Bloques actuales:
{chr(10).join(f'- {block.type}: {getattr(block, "title", "")}' for block in blocks)}"""
            }
        ]
    )
    return result.final_output_as(AssessmentOutput) 