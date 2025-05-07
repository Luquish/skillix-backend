"""AssessmentAgent: Garantiza y enriquece la evaluación del curso."""
from typing import List
from pydantic import BaseModel
from openai import Agent, Runner
from schemas.course import Block, QuizMCQBlock, QuizTFBlock

class AssessmentOutput(BaseModel):
    """Salida estructurada del AssessmentAgent."""
    blocks: List[Block]
    reasoning: str

def generate_mcq(context: str) -> QuizMCQBlock:
    """Genera una pregunta de opción múltiple basada en el contexto."""
    # TODO: Implementar la lógica de generación de MCQ
    pass

def generate_tf(context: str) -> QuizTFBlock:
    """Genera una pregunta de verdadero/falso basada en el contexto."""
    # TODO: Implementar la lógica de generación de T/F
    pass

def create_assessment_agent() -> Agent:
    """Crea y configura el AssessmentAgent."""
    
    agent = Agent(
        name="AssessmentAgent",
        instructions="""
        Eres un experto en evaluación educativa. Tu tarea es garantizar que el curso tenga una 
        evaluación efectiva y enriquecerla si es necesario.
        
        Reglas:
        1. Debe haber al menos un bloque de evaluación
        2. No repetir el mismo tipo de quiz dos veces seguidas
        3. Los distractores deben ser plausibles
        4. Si faltan evaluaciones, añadir 1-2 bloques de tipo quiz_mcq o quiz_tf
        
        Puedes usar las funciones generate_mcq y generate_tf para crear nuevas preguntas
        basadas en el contenido existente.
        
        Una vez que hayas revisado y enriquecido la evaluación, debes hacer handoff al 
        MediaAgent para que añada los recursos multimedia necesarios.
        """,
        tools=[generate_mcq, generate_tf],
        output_type=AssessmentOutput
    )
    
    return agent

async def enrich_course_assessment(blocks: List[Block]) -> AssessmentOutput:
    """Enriquece la evaluación del curso si es necesario."""
    agent = create_assessment_agent()
    result = await Runner.run(
        agent,
        {"blocks": [block.dict() for block in blocks]}
    )
    return result.final_output 