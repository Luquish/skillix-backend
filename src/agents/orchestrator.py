"""OrchestratorAgent: Coordina el flujo completo de creación y gestión de cursos."""
from typing import Optional
from pydantic import BaseModel
from openai import Agent, Runner
from schemas.course import CourseDoc
from tools.course_builder import build_course_doc
from services.course_service import CourseService
from .content import generate_course_content
from .planner import generate_course_plan

class OrchestrationOutput(BaseModel):
    """Salida del proceso de orquestación."""
    course: CourseDoc
    reasoning: str

class OrchestratorAgent:
    def __init__(self):
        self._course_service = CourseService()

    async def create_new_course(self, topic: str, metadata: dict) -> Optional[OrchestrationOutput]:
        """Coordina la creación completa de un nuevo curso."""
        try:
            # 1. Generar plan del curso
            plan = await generate_course_plan(topic)
            
            # 2. Generar contenido basado en el plan
            content = await generate_course_content(plan)
            
            # 3. Construir el CourseDoc
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
            
            # 4. Persistir y indexar el curso
            created_course = await self._course_service.create_course(course)
            
            if created_course:
                return OrchestrationOutput(
                    course=created_course,
                    reasoning=f"Curso creado exitosamente: {content.reasoning}"
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
            # 1. Generar nuevo plan (considerando el contenido existente)
            plan = await generate_course_plan(topic)
            
            # 2. Generar contenido actualizado
            content = await generate_course_content(plan)
            
            # 3. Construir el CourseDoc actualizado
            course = build_course_doc(
                blocks=content.blocks,
                metadata={
                    "title": metadata.get("title", topic),
                    "description": metadata.get("description", ""),
                    "level": metadata.get("level", "beginner"),
                    "tags": metadata.get("tags", []),
                    "canonical": metadata.get("canonical", False)
                },
                course_id=course_id  # Mantener el mismo ID
            )
            
            # 4. Actualizar y reindexar el curso
            updated_course = await self._course_service.update_course(course_id, course)
            
            if updated_course:
                return OrchestrationOutput(
                    course=updated_course,
                    reasoning=f"Curso actualizado exitosamente: {content.reasoning}"
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