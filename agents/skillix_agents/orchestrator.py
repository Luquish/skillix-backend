"""Orchestrator Agent usando Google ADK con integración a Firebase Data Connect"""

from typing import Optional, Dict, Any
import os
from google.adk.agents import Agent, Runner
from google.adk.tools import FunctionTool
from .learning_planner import learning_planner_agent, create_learning_plan_prompt, LearningPlan
from .content_generator import content_generator_agent, create_content_prompt, DayContent
import logging
from .config import openai_model

# Para integración con Data Connect (placeholder por ahora)
# from generated.dataconnect import DataConnectClient

logger = logging.getLogger(__name__)

class SkillixOrchestrator:
    """Orquestador principal que coordina la creación de cursos personalizados"""
    
    def __init__(self):
        self.planner = learning_planner_agent
        self.content_generator = content_generator_agent
        # self.db_client = DataConnectClient()  # Cliente generado por Data Connect
    
    async def create_personalized_course(self, user_data: dict, firebase_uid: str) -> Dict[str, Any]:
        """Crea un curso personalizado completo para un usuario"""
        try:
            logger.info(f"Iniciando creación de curso para usuario {firebase_uid}")
            
            # Paso 1: Generar el plan de aprendizaje
            plan_prompt = create_learning_plan_prompt(user_data)
            plan_result = await Runner.run(
                self.planner,
                [
                    {
                        "role": "user",
                        "content": plan_prompt
                    }
                ]
            )
            
            learning_plan = plan_result.final_output_as(LearningPlan)
            logger.info(f"Plan generado con {len(learning_plan.sections)} secciones")
            
            # TODO: Guardar plan en Data Connect
            # await self.db_client.save_learning_plan(
            #     user_id=firebase_uid,
            #     plan_data=learning_plan.model_dump(),
            #     generated_by="google-adk-gemini"
            # )
            
            # Paso 2: Generar contenido del primer día
            first_section = learning_plan.sections[0]
            first_day = first_section.days[0]
            
            content_prompt = create_content_prompt(
                day_info={
                    "day_number": first_day.day_number,
                    "title": first_day.title,
                    "is_action_day": first_day.is_action_day,
                    "description": first_day.description
                },
                user_data=user_data
            )
            
            content_result = await Runner.run(
                self.content_generator,
                [
                    {
                        "role": "user", 
                        "content": content_prompt
                    }
                ]
            )
            
            day_content = content_result.final_output_as(DayContent)
            logger.info(f"Contenido del día 1 generado: {len(day_content.blocks)} bloques")
            
            # TODO: Guardar contenido en Data Connect
            # await self.db_client.save_day_content(
            #     enrollment_id=enrollment_id,
            #     day_number=1,
            #     content=day_content.model_dump(),
            #     generated_by="google-adk-gemini"
            # )
            
            return {
                "success": True,
                "learning_plan": learning_plan.model_dump(),
                "first_day_content": day_content.model_dump()
            }
            
        except Exception as e:
            logger.error(f"Error creando curso personalizado: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    async def generate_next_day_content(
        self, 
        enrollment_id: str, 
        current_day: int,
        user_data: dict,
        roadmap: dict,
        previous_content: Optional[dict] = None
    ) -> Dict[str, Any]:
        """Genera el contenido para el siguiente día del curso"""
        try:
            # Buscar información del siguiente día en el roadmap
            next_day = None
            for section in roadmap['sections']:
                for day in section['days']:
                    if day['day_number'] == current_day + 1:
                        next_day = day
                        break
                if next_day:
                    break
            
            if not next_day:
                return {
                    "success": False,
                    "error": "No hay más días disponibles"
                }
            
            # Generar contenido
            content_prompt = create_content_prompt(
                day_info=next_day,
                user_data=user_data,
                previous_content=previous_content
            )
            
            content_result = await Runner.run(
                self.content_generator,
                [
                    {
                        "role": "user",
                        "content": content_prompt
                    }
                ]
            )
            
            day_content = content_result.final_output_as(DayContent)
            
            # TODO: Guardar en Data Connect
            # await self.db_client.save_day_content(...)
            
            return {
                "success": True,
                "day_content": day_content.model_dump(),
                "day_number": next_day['day_number']
            }
            
        except Exception as e:
            logger.error(f"Error generando contenido del día: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

# Crear el agente orquestador principal para usar con ADK
orchestrator_agent = Agent(
    name="skillix_orchestrator",
    model=openai_model,  # Usar GPT-4 via LiteLLM
    description="Orquestador principal de Skillix que coordina la creación de cursos personalizados",
    instruction="""You are the main orchestrator for Skillix learning platform. 
    You coordinate between the learning planner and content generator to create personalized courses.
    Always ensure content is engaging, appropriate for the user's level, and fits their available time.""",
    tools=[
        FunctionTool(SkillixOrchestrator, "create_personalized_course"),
        FunctionTool(SkillixOrchestrator, "generate_next_day_content")
    ]
) 