"""Orchestrator Agent usando Google ADK con integración a Firebase Data Connect"""

from typing import Optional, Dict, Any, AsyncGenerator
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService, Session
from google.adk.agents.invocation_context import InvocationContext
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmResponse, LlmRequest
from google.adk.events import Event, EventActions
from google.genai import types
import logging
from datetime import datetime

# Importar todos los agentes especializados
from .learning_planner import learning_planner_agent, create_learning_plan_prompt, LearningPlan
from .content_generator import content_generator_agent, create_content_prompt, DayContent
from .pedagogical_expert import pedagogical_expert_agent, analyze_learning_structure, PedagogicalAnalysis
from .skill_analyzer import skill_analyzer_agent, analyze_skill, SkillAnalysis
from .config import settings
from google.adk.models.lite_llm import LiteLlm

# Importar integración con Data Connect a través del bridge Node.js
from .dataconnect_nodejs_bridge import get_dataconnect_bridge

logger = logging.getLogger(__name__)

# Session Service para mantener estado entre interacciones
session_service = InMemorySessionService()

class SkillixOrchestrator:
    """Orquestador principal que coordina la creación de cursos personalizados"""
    
    def __init__(self):
        # Agentes especializados
        self.skill_analyzer = skill_analyzer_agent
        self.pedagogical_expert = pedagogical_expert_agent
        self.planner = learning_planner_agent
        self.content_generator = content_generator_agent
        
        # Configurar session service, runner y cliente de Data Connect
        self.session_service = InMemorySessionService()
        self.app_name = settings.app_name
        self.runner = Runner(
            agent=orchestrator_agent,
            app_name=self.app_name,
            session_service=self.session_service
        )
        self.db_client = get_dataconnect_bridge()  # Cliente bridge Node.js
    
    async def analyze_and_plan_course(
        self, 
        user_data: dict, 
        firebase_uid: str,
        context: Optional[InvocationContext] = None
    ) -> AsyncGenerator[Event, None]:
        """Pipeline completo de creación de curso con análisis pedagógico"""
        try:
            # Obtener o crear sesión
            session = self._get_or_create_session(firebase_uid, context)
            
            logger.info(f"Iniciando pipeline de creación para usuario {firebase_uid}")
            
            # Paso 1: Analizar la habilidad
            logger.info("Paso 1: Analizando habilidad...")
            skill_analysis = None
            async for event in self._analyze_skill(user_data, session):
                if event.is_final_response():
                    skill_analysis = SkillAnalysis.model_validate_json(event.content.parts[0].text)
                yield event
            
            if not skill_analysis:
                yield Event(
                    author="orchestrator",
                    content=types.Content(
                        role="assistant",
                        parts=[types.Part(text="Error: No se pudo completar el análisis de habilidades")]
                    ),
                    actions=EventActions(state_delta={"error": "skill_analysis_failed"})
                )
                return
            
            # Guardar análisis en estado
            yield Event(
                author="orchestrator",
                content=types.Content(
                    role="assistant",
                    parts=[types.Part(text="Análisis de habilidades completado")]
                ),
                actions=EventActions(
                    state_delta={
                        "skill_analysis": skill_analysis.model_dump(),
                        "user_data": user_data
                    }
                )
            )
            
            # Paso 2: Generar plan de aprendizaje
            logger.info("Paso 2: Generando plan de aprendizaje...")
            learning_plan = None
            async for event in self._create_learning_plan(user_data, skill_analysis, session):
                if event.is_final_response():
                    learning_plan = LearningPlan.model_validate_json(event.content.parts[0].text)
                yield event
            
            if not learning_plan:
                yield Event(
                    author="orchestrator",
                    content=types.Content(
                        role="assistant",
                        parts=[types.Part(text="Error: No se pudo generar el plan de aprendizaje")]
                    ),
                    actions=EventActions(state_delta={"error": "learning_plan_failed"})
                )
                return
            
            # Paso 3: Validación pedagógica
            logger.info("Paso 3: Validando plan pedagógicamente...")
            pedagogical_analysis = None
            async for event in self._validate_pedagogically(learning_plan, user_data, session):
                if event.is_final_response():
                    pedagogical_analysis = PedagogicalAnalysis.model_validate_json(event.content.parts[0].text)
                yield event
            
            if not pedagogical_analysis:
                yield Event(
                    author="orchestrator",
                    content=types.Content(
                        role="assistant",
                        parts=[types.Part(text="Error: No se pudo completar la validación pedagógica")]
                    ),
                    actions=EventActions(state_delta={"error": "pedagogical_validation_failed"})
                )
                return
            
            # Guardar plan y análisis en estado
            yield Event(
                author="orchestrator",
                content=types.Content(
                    role="assistant",
                    parts=[types.Part(text="Plan de aprendizaje y validación pedagógica completados")]
                ),
                actions=EventActions(
                    state_delta={
                        "learning_plan": learning_plan.model_dump(),
                        "pedagogical_analysis": pedagogical_analysis.model_dump()
                    }
                )
            )
            
            # Paso 4: Generar contenido del primer día
            logger.info("Paso 4: Generando contenido del día 1...")
            first_day_content = None
            async for event in self._generate_first_day_content(learning_plan, user_data, pedagogical_analysis, session):
                if event.is_final_response():
                    first_day_content = DayContent.model_validate_json(event.content.parts[0].text)
                yield event
            
            if not first_day_content:
                yield Event(
                    author="orchestrator",
                    content=types.Content(
                        role="assistant",
                        parts=[types.Part(text="Error: No se pudo generar el contenido del primer día")]
                    ),
                    actions=EventActions(state_delta={"error": "first_day_content_failed"})
                )
                return
            
            # Guardar estado final
            yield Event(
                author="orchestrator",
                content=types.Content(
                    role="assistant",
                    parts=[types.Part(text="¡Proceso completado con éxito!")]
                ),
                actions=EventActions(
                    state_delta={
                        "last_generated_day": 1,
                        "current_section": 0,
                        "first_day_content": first_day_content.model_dump(),
                        "status": "completed"
                    }
                )
            )
            
            # Guardar en Firebase Data Connect
            try:
                # Obtener información del usuario
                user_data_db = await self.db_client.get_user_by_firebase_uid(firebase_uid)
                if user_data_db:
                    user_id = user_data_db["id"]
                    
                    # Guardar el plan de aprendizaje con estructura completa
                    learning_plan_result = await self.db_client.create_learning_plan(
                        user_id=user_id,
                        plan_data={
                            "skill_analysis": skill_analysis.model_dump(),
                            "learning_plan": learning_plan.model_dump(),
                            "pedagogical_analysis": pedagogical_analysis.model_dump()
                        }
                    )
                    
                    # Si se creó el plan exitosamente y el usuario quiere empezar ahora
                    if learning_plan_result and learning_plan_result.get("learningPlanId"):
                        # Crear enrollment automáticamente
                        enrollment_result = await self.db_client.create_enrollment(
                            user_id=user_id,
                            learning_plan_id=learning_plan_result["learningPlanId"]
                        )
                        
                        # Si hay enrollment, obtener el ID del primer día
                        if enrollment_result and enrollment_result.get("id"):
                            # Necesitamos obtener el plan completo para encontrar el dayContentId
                            plan_data = await self.db_client.get_user_learning_plan(user_id)
                            if plan_data and plan_data.get("sections"):
                                first_section = plan_data["sections"][0]
                                if first_section.get("days"):
                                    first_day = first_section["days"][0]
                                    if first_day.get("id"):
                                        # Ahora sí crear el contenido del día
                                        await self.db_client.create_day_content(
                                            day_content_id=first_day["id"],
                                            content_data={
                                                "objectives": first_day_content.model_dump().get("objectives", []),
                                                "audio_blocks": first_day_content.model_dump().get("audio_blocks", []),
                                                "read_blocks": first_day_content.model_dump().get("read_blocks", []),
                                                "quiz_blocks": first_day_content.model_dump().get("quiz_blocks", []),
                                                "action_tasks": first_day_content.model_dump().get("action_tasks", [])
                                            }
                                        )
                    
                    yield Event(
                        author="orchestrator",
                        content=types.Content(
                            role="assistant",
                            parts=[types.Part(text="✅ Datos guardados en Firebase Data Connect")]
                        )
                    )
            except Exception as e:
                logger.error(f"Error guardando en Data Connect: {str(e)}")
                yield Event(
                    author="orchestrator",
                    content=types.Content(
                        role="assistant",
                        parts=[types.Part(text=f"⚠️ Advertencia: No se pudieron guardar algunos datos: {str(e)}")]
                    )
                )
            
        except Exception as e:
            logger.error(f"Error en pipeline de creación: {str(e)}", exc_info=True)
            yield Event(
                author="orchestrator",
                content=types.Content(
                    role="assistant",
                    parts=[types.Part(text=f"Error en el proceso: {str(e)}")]
                ),
                actions=EventActions(state_delta={"error": str(e)})
            )
    
    async def generate_adaptive_content(
        self,
        firebase_uid: str,
        progress_data: dict,
        context: Optional[InvocationContext] = None
    ) -> AsyncGenerator[Event, None]:
        """Genera contenido adaptativo basado en el progreso del usuario"""
        try:
            session = self._get_session(firebase_uid, context)
            if not session:
                yield Event(
                    author="orchestrator",
                    content=types.Content(
                        role="assistant",
                        parts=[types.Part(text="Error: No se encontró sesión activa")]
                    ),
                    actions=EventActions(state_delta={"error": "no_session_found"})
                )
                return
            
            # Obtener datos de la sesión
            learning_plan = session.state.get("learning_plan")
            last_day = session.state.get("last_generated_day", 0)
            user_data = session.state.get("user_data")
            
            if not learning_plan or not user_data:
                yield Event(
                    author="orchestrator",
                    content=types.Content(
                        role="assistant",
                        parts=[types.Part(text="Error: Faltan datos en la sesión")]
                    ),
                    actions=EventActions(state_delta={"error": "missing_session_data"})
                )
                return
            
            # Guardar datos de progreso
            yield Event(
                author="orchestrator",
                content=types.Content(
                    role="assistant",
                    parts=[types.Part(text="Analizando tu progreso...")]
                ),
                actions=EventActions(
                    state_delta={
                        "progress_data": progress_data,
                        "analysis_timestamp": datetime.now().isoformat()
                    }
                )
            )
            
            next_day = last_day + 1
            day_info = self._get_day_info(learning_plan, next_day)
            
            if not day_info:
                yield Event(
                    author="orchestrator",
                    content=types.Content(
                        role="assistant",
                        parts=[types.Part(text="¡Felicitaciones! Has completado todo el plan de aprendizaje")]
                    ),
                    actions=EventActions(state_delta={"status": "plan_completed"})
                )
                return
            
            # Generar contenido del siguiente día
            yield Event(
                author="orchestrator",
                content=types.Content(
                    role="assistant",
                    parts=[types.Part(text=f"Generando contenido para el día {next_day}...")]
                )
            )
            
            content_prompt = create_content_prompt(
                day_info=day_info,
                user_data=user_data,
                previous_content=session.state.get(f"day_{last_day}_content")
            )
            
            # Ejecutar generador de contenido
            day_content = None
            async for event in self.runner.run_async(
                user_id=session.user_id,
                session_id=session.session_id,
                new_message=types.Content(
                    role="user",
                    parts=[types.Part(text=content_prompt)]
                )
            ):
                if event.is_final_response():
                    day_content = DayContent.model_validate_json(event.content.parts[0].text)
                yield event
            
            if not day_content:
                yield Event(
                    author="orchestrator",
                    content=types.Content(
                        role="assistant",
                        parts=[types.Part(text="Error: No se pudo generar el contenido del día")]
                    ),
                    actions=EventActions(state_delta={"error": "content_generation_failed"})
                )
                return
            
            # Actualizar estado con el nuevo contenido
            yield Event(
                author="orchestrator",
                content=types.Content(
                    role="assistant",
                    parts=[types.Part(text=f"¡Contenido del día {next_day} listo!")]
                ),
                actions=EventActions(
                    state_delta={
                        "last_generated_day": next_day,
                        f"day_{next_day}_content": day_content.model_dump(),
                        "last_content_generation": datetime.now().isoformat(),
                        "adaptive_adjustments": self._calculate_adaptations(progress_data)
                    }
                )
            )
            
        except Exception as e:
            logger.error(f"Error generando contenido adaptativo: {str(e)}", exc_info=True)
            yield Event(
                author="orchestrator",
                content=types.Content(
                    role="assistant",
                    parts=[types.Part(text=f"Error en el proceso: {str(e)}")]
                ),
                actions=EventActions(state_delta={"error": str(e)})
            )
    
    def _calculate_adaptations(self, progress_data: dict) -> list:
        """Calcula ajustes adaptativos basados en el progreso"""
        adjustments = []
        
        # Analizar tiempo de completación
        avg_time = progress_data.get("avg_completion_time", 0)
        if avg_time > 60:  # Más de 60 minutos
            adjustments.append("reduced_content_complexity")
        elif avg_time < 15:  # Menos de 15 minutos
            adjustments.append("increased_content_depth")
            
        # Analizar rendimiento en quizzes
        quiz_score = progress_data.get("avg_quiz_score", 0)
        if quiz_score < 0.6:  # Menos del 60%
            adjustments.append("additional_explanations")
        elif quiz_score > 0.9:  # Más del 90%
            adjustments.append("advanced_challenges")
            
        return adjustments
    
    # Métodos auxiliares privados
    def _get_or_create_session(self, firebase_uid: str, context: Optional[InvocationContext]) -> Session:
        """Obtiene o crea una sesión para el usuario"""
        session_id = context.session.session_id if context and context.session else f"session_{firebase_uid}"
        
        session = self.session_service.get_session(
            app_name=self.app_name,
            user_id=firebase_uid,
            session_id=session_id
        )
        
        if not session:
            session = Session(
                app_name=self.app_name,
                user_id=firebase_uid,
                session_id=session_id
            )
            self.session_service.save_session(session)
        
        return session
    
    def _get_session(self, firebase_uid: str, context: Optional[InvocationContext]) -> Optional[Session]:
        """Obtiene una sesión existente"""
        session_id = context.session.session_id if context and context.session else f"session_{firebase_uid}"
        return self.session_service.get_session(
            app_name=self.app_name,
            user_id=firebase_uid,
            session_id=session_id
        )
    
    async def _analyze_skill(self, user_data: dict, session: Session) -> AsyncGenerator[Event, None]:
        """Analiza la habilidad usando el skill analyzer"""
        prompt = analyze_skill(user_data['skill'], user_data)
        async for event in self.runner.run_async(
            user_id=session.user_id,
            session_id=session.session_id,
            new_message=types.Content(
                role="user",
                parts=[types.Part(text=prompt)]
            )
        ):
            yield event
    
    async def _create_learning_plan(
        self, 
        user_data: dict, 
        skill_analysis: SkillAnalysis,
        session: Session
    ) -> AsyncGenerator[Event, None]:
        """Crea el plan de aprendizaje enriquecido con el análisis"""
        enhanced_prompt = f"""{create_learning_plan_prompt(user_data)}

Skill Analysis:
- Category: {skill_analysis.skill_category}
- Components: {len(skill_analysis.components)} sub-skills identified
- Market Demand: {skill_analysis.market_demand}
- Key Focus Areas: {[c.name for c in skill_analysis.components[:3]]}"""

        async for event in self.runner.run_async(
            user_id=session.user_id,
            session_id=session.session_id,
            new_message=types.Content(
                role="user",
                parts=[types.Part(text=enhanced_prompt)]
            )
        ):
            yield event
    
    async def _validate_pedagogically(
        self,
        learning_plan: LearningPlan,
        user_data: dict,
        session: Session
    ) -> AsyncGenerator[Event, None]:
        """Valida el plan desde una perspectiva pedagógica"""
        prompt = analyze_learning_structure(
            learning_plan.model_dump(),
            user_data
        )
        
        async for event in self.runner.run_async(
            user_id=session.user_id,
            session_id=session.session_id,
            new_message=types.Content(
                role="user",
                parts=[types.Part(text=prompt)]
            )
        ):
            yield event
    
    async def _generate_first_day_content(
        self,
        learning_plan: LearningPlan,
        user_data: dict,
        pedagogical_analysis: PedagogicalAnalysis,
        session: Session
    ) -> AsyncGenerator[Event, None]:
        """Genera contenido del primer día con insights pedagógicos"""
        first_day = learning_plan.sections[0].days[0]
        
        enhanced_prompt = f"""{create_content_prompt(
            day_info=first_day.model_dump(),
            user_data=user_data
        )}

Pedagogical Guidance:
- Engagement Techniques: {pedagogical_analysis.engagement_techniques[:2]}
- Cognitive Load: {pedagogical_analysis.cognitive_load_assessment}
- Learning Objectives for Section 1: {pedagogical_analysis.learning_objectives[:2]}"""

        async for event in self.runner.run_async(
            user_id=session.user_id,
            session_id=session.session_id,
            new_message=types.Content(
                role="user",
                parts=[types.Part(text=enhanced_prompt)]
            )
        ):
            yield event
    
    def _get_day_info(self, learning_plan: dict, day_number: int) -> dict:
        """Obtiene información de un día específico del plan"""
        for section in learning_plan['sections']:
            for day in section['days']:
                if day['day_number'] == day_number:
                    return day
        return None

# Callbacks de seguridad
def before_model_callback(
    callback_context: CallbackContext, 
    llm_request: LlmRequest
) -> Optional[LlmResponse]:
    """Callback para validar seguridad del contenido antes de enviar al modelo"""
    logger.info(f"[Callback] Before model call for agent: {callback_context.agent_name}")
    
    # Verificar contenido inapropiado
    blocked_terms = ["inappropriate", "offensive", "harmful"]
    
    # Inspeccionar el último mensaje del usuario
    last_user_message = ""
    if llm_request.contents and llm_request.contents[-1].role == 'user':
        if llm_request.contents[-1].parts:
            last_user_message = llm_request.contents[-1].parts[0].text
    
    logger.info(f"[Callback] Inspecting last user message: '{last_user_message}'")
    
    # Verificar términos bloqueados
    for message in llm_request.contents:
        if hasattr(message, 'parts'):
            for part in message.parts:
                if hasattr(part, 'text'):
                    text_lower = part.text.lower()
                    for term in blocked_terms:
                        if term in text_lower:
                            logger.warning(f"Blocked content containing: {term}")
                            return LlmResponse(
                                content=types.Content(
                                    role="model",
                                    parts=[types.Part(text="Lo siento, ese contenido no está permitido.")]
                                )
                            )
    
    # Modificar instrucción del sistema
    if llm_request.config and llm_request.config.system_instruction:
        original_instruction = llm_request.config.system_instruction
        prefix = "[Validado por Callback] "
        
        if not isinstance(original_instruction, types.Content):
            original_instruction = types.Content(
                role="system", 
                parts=[types.Part(text=str(original_instruction))]
            )
        
        if not original_instruction.parts:
            original_instruction.parts.append(types.Part(text=""))
            
        modified_text = prefix + (original_instruction.parts[0].text or "")
        original_instruction.parts[0].text = modified_text
        llm_request.config.system_instruction = original_instruction
        
        logger.info(f"[Callback] Modified system instruction to: '{modified_text}'")
    
    return None

def before_tool_callback(
    callback_context: CallbackContext,
    tool_name: str,
    tool_args: dict
) -> Optional[dict]:
    """Callback para validar argumentos de herramientas antes de ejecutar"""
    logger.info(f"[Callback] Before tool execution: {tool_name}")
    
    if tool_name == "analyze_and_plan_course":
        # Validar que la habilidad sea apropiada
        skill = tool_args.get('user_data', {}).get('skill', '')
        
        # Lista de habilidades no permitidas
        blocked_skills = ["hacking malicioso", "actividades ilegales"]
        
        if any(blocked in skill.lower() for blocked in blocked_skills):
            logger.warning(f"Blocked skill request: {skill}")
            return {
                "success": False,
                "error": "Esta habilidad no puede ser enseñada en nuestra plataforma"
            }
    
    return None

# Funciones wrapper para las herramientas
async def analyze_and_plan_course_tool(
    user_data: dict, 
    firebase_uid: str
) -> dict:
    """Wrapper para la herramienta analyze_and_plan_course"""
    orchestrator = SkillixOrchestrator()
    results = {
        "skill_analysis": None,
        "learning_plan": None,
        "pedagogical_validation": None,
        "first_day_content": None,
        "status": "in_progress"
    }
    
    async for event in orchestrator.analyze_and_plan_course(user_data, firebase_uid):
        if event.actions and event.actions.state_delta:
            # Actualizar resultados con el estado
            for key, value in event.actions.state_delta.items():
                if key in results:
                    results[key] = value
                elif key == "status":
                    results["status"] = value
                elif key == "error":
                    results["status"] = "error"
                    results["error"] = value
    
    return results

async def generate_adaptive_content_tool(
    firebase_uid: str,
    progress_data: dict
) -> dict:
    """Wrapper para la herramienta generate_adaptive_content"""
    orchestrator = SkillixOrchestrator()
    results = {
        "day_content": None,
        "day_number": None,
        "adaptive_adjustments": [],
        "status": "in_progress"
    }
    
    async for event in orchestrator.generate_adaptive_content(firebase_uid, progress_data):
        if event.actions and event.actions.state_delta:
            # Actualizar resultados con el estado
            for key, value in event.actions.state_delta.items():
                if key == "last_generated_day":
                    results["day_number"] = value
                elif key.startswith("day_") and key.endswith("_content"):
                    results["day_content"] = value
                elif key == "adaptive_adjustments":
                    results["adaptive_adjustments"] = value
                elif key == "error":
                    results["status"] = "error"
                    results["error"] = value
                elif key == "status":
                    results["status"] = value
    
    if results["status"] == "in_progress" and results["day_content"]:
        results["status"] = "completed"
    
    return results

# Crear el agente orquestador principal con delegación
orchestrator_agent = LlmAgent(
    name="skillix_orchestrator",
    model=LiteLlm(model=settings.openai_model),
    description="""Main orchestrator for Skillix that coordinates specialized agents to create 
    personalized learning experiences. Delegates to skill analyzer, pedagogical expert, 
    learning planner, and content generator based on the task.""",
    instruction="""You are the main orchestrator for Skillix learning platform.

    Your role is to:
    1. COORDINATE between specialized agents for course creation
    2. ENSURE pedagogical quality and user engagement
    3. MAINTAIN context and state across interactions
    4. ADAPT content based on user progress

    Delegation Strategy:
    - For skill analysis → delegate to skill_analyzer
    - For pedagogical validation → delegate to pedagogical_expert  
    - For learning plan creation → delegate to learning_planner
    - For content generation → delegate to content_generator

    Always prioritize:
    - User engagement and motivation
    - Pedagogical best practices
    - Personalization based on user profile
    - Safety and appropriate content

    When responding, be encouraging and supportive of the user's learning journey.""",
    tools=[analyze_and_plan_course_tool, generate_adaptive_content_tool],
    before_model_callback=before_model_callback,
    before_tool_callback=before_tool_callback
) 