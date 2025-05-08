"""OrchestratorAgent: Coordina el flujo completo de creación y gestión de cursos."""
from typing import Optional
from pydantic import BaseModel
from agents import Agent, Runner
from schemas.course import CourseDoc, Block
from tools.course_builder import build_course_doc
from services.course_service import CourseService
from config import settings
from .content import create_content_agent
from .assessment import create_assessment_agent

class OrchestrationOutput(BaseModel):
    """Salida del proceso de orquestación."""
    course: CourseDoc
    reasoning: str

class CourseOutput(BaseModel):
    """Salida estructurada del agente de contenido."""
    blocks: list[Block]
    reasoning: str

# Crear los agentes especializados
content_agent = create_content_agent()
assessment_agent = create_assessment_agent()

class OrchestratorAgent:
    def __init__(self):
        self._course_service = CourseService()
        self._orchestrator = Agent(
            name="Course Orchestrator",
            instructions="""Coordinas la creación completa de cursos educativos.
            Debes:
            1. Analizar el tema solicitado
            2. Coordinar con los agentes especializados
            3. Asegurar la calidad del contenido final""",
            handoffs=[content_agent, assessment_agent]
        )

    async def create_new_course(self, topic: str, metadata: dict) -> Optional[OrchestrationOutput]:
        """Coordina la creación completa de un nuevo curso."""
        try:
            # 1. Ejecutar el orquestador
            result = await Runner.run(
                self._orchestrator,
                f"Crear un curso sobre: {topic}",
                metadata=metadata
            )
            
            # 2. Procesar el resultado y construir el CourseDoc
            content = result.final_output_as(CourseOutput)
            
            course = build_course_doc(
                blocks=content.blocks,
                metadata={
                    "title": metadata.get("title", topic),
                    "description": metadata.get("description", ""),
                    "level": metadata.get("level", "beginner"),
                    "tags": metadata.get("tags", []),
                    "canonical": metadata.get("canonical", False)
                }
            )
            
            # 3. Persistir y indexar el curso
            created_course = await self._course_service.create_course(course)
            
            if created_course:
                return OrchestrationOutput(
                    course=created_course,
                    reasoning=content.reasoning
                )
            
            return None
            
        except Exception as e:
            print(f"Error en la orquestación: {e}")
            return None

    async def update_existing_course(
        self, 
        course_id: str, 
        topic: str, 
        metadata: dict
    ) -> Optional[OrchestrationOutput]:
        """Coordina la actualización de un curso existente."""
        try:
            # Similar a create_new_course pero manteniendo el course_id
            result = await Runner.run(
                self._orchestrator,
                f"Actualizar el curso {course_id} sobre: {topic}",
                metadata=metadata
            )
            
            content = result.final_output_as(CourseOutput)
            
            course = build_course_doc(
                blocks=content.blocks,
                metadata={
                    "title": metadata.get("title", topic),
                    "description": metadata.get("description", ""),
                    "level": metadata.get("level", "beginner"),
                    "tags": metadata.get("tags", []),
                    "canonical": metadata.get("canonical", False)
                },
                course_id=course_id
            )
            
            updated_course = await self._course_service.update_course(course_id, course)
            
            if updated_course:
                return OrchestrationOutput(
                    course=updated_course,
                    reasoning=content.reasoning
                )
            
            return None
            
        except Exception as e:
            print(f"Error en la actualización: {e}")
            return None

    async def delete_course(self, course_id: str) -> bool:
        """Coordina la eliminación de un curso."""
        return await self._course_service.delete_course(course_id)

# Función helper para uso directo
async def orchestrate_course_creation(topic: str, metadata: dict) -> Optional[OrchestrationOutput]:
    """Helper function para crear un nuevo curso."""
    orchestrator = OrchestratorAgent()
    return await orchestrator.create_new_course(topic, metadata) 