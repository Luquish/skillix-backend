"""Team Coordinator - Implementa delegación automática entre agentes especializados"""

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService, Session
from google.adk.events import Event, EventActions
from google.adk.agents.invocation_context import InvocationContext
from google.genai import types
from typing import Dict, Any, Optional, AsyncGenerator
import logging

# Importar agentes especializados
from .skill_analyzer import skill_analyzer_agent
from .pedagogical_expert import pedagogical_expert_agent
from .learning_planner import learning_planner_agent
from .content_generator import content_generator_agent, action_day_specialist
from .orchestrator import orchestrator_agent
from .ski_the_fox import ski_the_fox, motivational_analysis_agent
from .analytics_agent import analytics_agent, churn_prediction_agent
from .config import settings

logger = logging.getLogger(__name__)

# Agente coordinador del equipo (similar al root agent del Weather Bot)
team_coordinator_agent = LlmAgent(
    name="skillix_team_coordinator",
    model=LiteLlm(model=settings.openai_model),
    description="Main coordinator that automatically delegates tasks to specialized agents",
    instruction="""You are the team coordinator for Skillix. 
    
Your primary role is to understand the user's request and delegate to the appropriate specialist:

1. For skill analysis or decomposition → skill_analyzer
2. For pedagogical validation or educational design → pedagogical_expert  
3. For creating learning roadmaps → learning_planner
4. For generating daily content → content_generator
5. For creating action day challenges → action_day_creator
6. For complex multi-step course creation → orchestrator
7. For motivation and celebrations → ski_the_fox
8. For learning pattern analysis → learning_analytics

Key behaviors:
- Be welcoming and encouraging
- Clarify user needs when unclear
- Provide status updates during longer processes
- Celebrate learning milestones
- Use Ski for motivational moments

Never try to handle specialized tasks yourself - always delegate to the experts.""",
    sub_agents=[
        skill_analyzer_agent,
        pedagogical_expert_agent,
        learning_planner_agent,
        content_generator_agent,
        action_day_specialist,
        orchestrator_agent,
        ski_the_fox,
        motivational_analysis_agent,
        analytics_agent,
        churn_prediction_agent,
    ]
)

class SkillixTeamRunner:
    """Runner para el equipo de agentes con capacidad de auto-delegación"""
    
    def __init__(self):
        self.session_service = InMemorySessionService()
        self.app_name = settings.app_name
        self.runner = Runner(
            agent=team_coordinator_agent,
            app_name=self.app_name,
            session_service=self.session_service
        )
    
    async def process_user_request(
        self, 
        user_message: str,
        firebase_uid: str,
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Event, None]:
        """Procesa una solicitud del usuario delegando automáticamente al agente apropiado"""
        try:
            # Obtener o crear sesión
            session_id = session_id or f"session_{firebase_uid}"
            session = self._get_or_create_session(firebase_uid, session_id)
            
            # Si hay contexto adicional, guardarlo en estado
            if context:
                yield Event(
                    author="team_coordinator",
                    content=types.Content(
                        role="assistant",
                        parts=[types.Part(text="Procesando contexto del usuario...")]
                    ),
                    actions=EventActions(
                        state_delta={
                            "user_context": context,
                            "firebase_uid": firebase_uid
                        }
                    )
                )
            
            # Ejecutar el agente coordinador
            async for event in self.runner.run_async(
                user_id=firebase_uid,
                session_id=session_id,
                new_message=types.Content(
                    role="user",
                    parts=[types.Part(text=user_message)]
                )
            ):
                # Propagar eventos del runner
                yield event
                
                # Si es respuesta final, agregar metadata
                if event.is_final_response():
                    delegated_agent = event.author if event.author != "team_coordinator" else None
                    if delegated_agent:
                        yield Event(
                            author="team_coordinator",
                            content=types.Content(
                                role="assistant",
                                parts=[types.Part(text=f"Procesado por: {delegated_agent}")]
                            ),
                            actions=EventActions(
                                state_delta={"last_delegated_agent": delegated_agent}
                            )
                        )
            
        except Exception as e:
            logger.error(f"Error processing user request: {str(e)}", exc_info=True)
            yield Event(
                author="team_coordinator",
                content=types.Content(
                    role="assistant",
                    parts=[types.Part(text=f"Error: {str(e)}")]
                ),
                actions=EventActions(state_delta={"error": str(e)})
            )
    
    def _get_or_create_session(self, firebase_uid: str, session_id: str) -> Session:
        """Obtiene o crea una sesión para el usuario"""
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
    
    async def get_session_state(self, firebase_uid: str, session_id: str) -> Dict[str, Any]:
        """Obtiene el estado actual de la sesión del usuario"""
        session = self.session_service.get_session(
            app_name=self.app_name,
            user_id=firebase_uid,
            session_id=session_id
        )
        
        if session:
            return {
                "exists": True,
                "state": session.state.as_dict() if hasattr(session.state, 'as_dict') else dict(session.state),
                "last_activity": session.updated_at if hasattr(session, 'updated_at') else None
            }
        
        return {"exists": False}

# Agentes especializados para diferentes tipos de interacciones
greeting_agent = LlmAgent(
    name="skillix_greeter",
    model=LiteLlm(model=settings.openai_model),
    description="Handles greetings and onboarding for new users",
    instruction="""You are the friendly greeter for Skillix.

Your role:
- Welcome new users warmly
- Explain how Skillix works
- Gather initial information about their learning goals
- Hand off to appropriate specialist when ready

Keep interactions brief, encouraging, and focused on understanding their needs.

Always ask:
1. What skill they want to learn
2. Their current experience level
3. How much time they have daily
4. Their learning goal

End by saying you'll connect them with a specialist to create their personalized plan."""
)

progress_checker_agent = LlmAgent(
    name="progress_checker",
    model=LiteLlm(model=settings.openai_model),
    description="Checks user progress and provides motivational feedback",
    instruction="""You check on user progress and provide encouragement.

Your responsibilities:
- Review completion rates
- Celebrate achievements
- Identify struggles
- Suggest adjustments
- Maintain motivation

Be positive, specific with praise, and constructive with feedback."""
)

# Agregar agentes especializados al coordinador principal
team_coordinator_agent.sub_agents.extend([greeting_agent, progress_checker_agent]) 