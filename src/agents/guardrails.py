"""Guardrails para la validación de cursos."""
from pydantic import BaseModel
from openai import (
    Agent,
    GuardrailFunctionOutput,
    InputGuardrailTripwireTriggered,
    RunContextWrapper,
    Runner,
    input_guardrail,
)

class TopicValidationOutput(BaseModel):
    """Resultado de la validación del tema."""
    is_valid: bool
    reason: str
    suggested_topic: str | None = None

validation_agent = Agent(
    name="Topic Validator",
    instructions="""
    Valida si el tema propuesto es apropiado para un curso educativo.
    
    Criterios:
    1. Debe ser educativo y constructivo
    2. No debe contener contenido inapropiado o dañino
    3. Debe ser específico pero no demasiado técnico
    4. Debe poder cubrirse en 5-8 bloques
    
    Si el tema no es válido, sugiere una alternativa apropiada.
    """,
    output_type=TopicValidationOutput
)

@input_guardrail
async def topic_guardrail(
    ctx: RunContextWrapper[None],
    agent: Agent,
    input: str
) -> GuardrailFunctionOutput:
    """Valida el tema del curso antes de procesarlo."""
    result = await Runner.run(validation_agent, input, context=ctx.context)
    
    return GuardrailFunctionOutput(
        output_info=result.final_output,
        tripwire_triggered=not result.final_output.is_valid
    ) 