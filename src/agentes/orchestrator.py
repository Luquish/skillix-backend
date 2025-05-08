"""OrchestratorAgent: Coordina el flujo completo de creación y gestión de cursos."""
from typing import Optional
from pydantic import BaseModel
from agents import Agent, Runner, RunConfig, ModelSettings
from schemas.course import CourseDoc, Block
from tools.course_builder import build_course_doc
from services.course_service import CourseService
from .content import create_content_agent
from .assessment import create_assessment_agent
from config import settings

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
        print("\n🎭 Iniciando OrchestratorAgent")
        self._course_service = CourseService()
        self._orchestrator = Agent(
            name="Course Orchestrator",
            instructions="""Coordinas la creación completa de cursos educativos.
            Debes:
            1. Analizar el tema solicitado
            2. Coordinar con los agentes especializados
            3. Asegurar la calidad del contenido final""",
            handoffs=[content_agent, assessment_agent],
            model=settings.OPENAI_MODEL
        )

    async def create_new_course(self, topic: str, metadata: dict) -> Optional[OrchestrationOutput]:
        """Coordina la creación completa de un nuevo curso."""
        try:
            print("\n🎯 Iniciando creación de nuevo curso")
            print(f"📝 Tema: {topic}")
            
            # Configuración del runner
            run_config = RunConfig(
                model=settings.OPENAI_MODEL,
                model_settings=ModelSettings(
                    temperature=0.7,  # Balancear creatividad con consistencia
                    max_tokens=2000  # Suficiente para generar contenido detallado
                ),
                workflow_name="Creación de Curso",
                trace_metadata={
                    "topic": topic,
                    "metadata": str(metadata)  # Convertir a string
                }
            )
            
            print("\n🤖 Ejecutando agente orquestador...")
            # 1. Ejecutar el orquestador
            result = await Runner.run(
                self._orchestrator,
                [
                    {
                        "role": "system",
                        "content": "Coordinas la creación completa de cursos educativos."
                    },
                    {
                        "role": "user",
                        "content": f"""Crear un curso sobre: {topic}

                        Metadata del curso:
                        - Título: {metadata.get('title', topic)}
                        - Descripción: {metadata.get('description', '')}
                        - Nivel: {metadata.get('level', 'beginner')}
                        - Tags: {', '.join(metadata.get('tags', []))}
                        - Canónico: {metadata.get('canonical', False)}"""
                    }
                ],
                run_config=run_config
            )
            
            print("\n✨ Procesando resultado del orquestador...")
            # 2. Procesar el resultado y construir el CourseDoc
            try:
                content = result.final_output_as(CourseOutput)
                print("✅ Contenido procesado correctamente")
                print(f"📊 Orquestador recibió {len(content.blocks)} bloques")
            except Exception as e:
                print(f"❌ Error al procesar la salida del modelo: {e}")
                return None
            
            print("\n🏗️  Construyendo documento del curso...")
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
            print(f"📦 CourseDoc construido con {len(course.blocks)} bloques")
            
            # 3. Persistir y indexar el curso
            print("\n💾 Guardando curso...")
            try:
                created_course = await self._course_service.create_course(course)
                if created_course:
                    print("✅ Curso guardado exitosamente")
                    return OrchestrationOutput(
                        course=created_course,
                        reasoning=content.reasoning
                    )
            except Exception as e:
                print(f"❌ Error al persistir el curso: {e}")
                return None
            
            return None
            
        except Exception as e:
            print(f"❌ Error en la orquestación: {e}")
            return None

    async def update_existing_course(
        self, 
        course_id: str, 
        topic: str, 
        metadata: dict
    ) -> Optional[OrchestrationOutput]:
        """Coordina la actualización de un curso existente."""
        try:
            # Configuración del runner
            run_config = RunConfig(
                model=settings.OPENAI_MODEL,
                model_settings=ModelSettings(
                    temperature=0.7,
                    max_tokens=2000
                ),
                workflow_name="Actualización de Curso",
                trace_metadata={
                    "course_id": course_id,
                    "topic": topic,
                    "metadata": str(metadata)  # Convertir a string
                }
            )
            
            # Similar a create_new_course pero manteniendo el course_id
            result = await Runner.run(
                self._orchestrator,
                [
                    {
                        "role": "system",
                        "content": "Coordinas la actualización de cursos educativos existentes."
                    },
                    {
                        "role": "user",
                        "content": f"""Actualizar el curso {course_id} sobre: {topic}

Metadata del curso:
- Título: {metadata.get('title', topic)}
- Descripción: {metadata.get('description', '')}
- Nivel: {metadata.get('level', 'beginner')}
- Tags: {', '.join(metadata.get('tags', []))}
- Canónico: {metadata.get('canonical', False)}"""
                    }
                ],
                run_config=run_config
            )
            
            try:
                content = result.final_output_as(CourseOutput)
            except Exception as e:
                print(f"Error al procesar la salida del modelo: {e}")
                return None
            
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
            
            try:
                updated_course = await self._course_service.update_course(course_id, course)
            except Exception as e:
                print(f"Error al actualizar el curso: {e}")
                return None
            
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