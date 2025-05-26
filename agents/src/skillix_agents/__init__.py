"""Skillix Agents - Sistema multi-agente para aprendizaje personalizado"""

from .config import settings

# Importar agentes especializados
from .skill_analyzer import (
    skill_analyzer_agent,
    analyze_skill,
    SkillAnalysis
)
from .pedagogical_expert import (
    pedagogical_expert_agent,
    analyze_learning_structure,
    PedagogicalAnalysis,
    adaptive_learning_agent
)
from .learning_planner import (
    learning_planner_agent,
    create_learning_plan_prompt,
    LearningPlan
)
from .content_generator import (
    content_generator_agent,
    action_day_specialist,
    create_content_prompt,
    DayContent,
    ActionTask
)
from .ski_the_fox import (
    ski_the_fox,
    motivational_analysis_agent,
    get_ski_greeting,
    create_streak_celebration_prompt,
    get_random_ski_phrase,
    should_ski_appear,
    SkiMessage,
    StreakCelebration,
    DailyMotivation
)
from .analytics_agent import (
    analytics_agent,
    churn_prediction_agent,
    analyze_user_data,
    calculate_engagement_score,
    get_notification_strategy,
    run_daily_analytics,
    UserAnalytics,
    LearningPattern,
    OptimalLearningTime,
    ContentOptimization,
    StreakMaintenance
)

# Importar orquestadores
from .orchestrator import (
    orchestrator_agent,
    SkillixOrchestrator,
    analyze_and_plan_course_tool,
    generate_adaptive_content_tool
)
from .team_coordinator import (
    team_coordinator_agent,
    SkillixTeamRunner,
    greeting_agent,
    progress_checker_agent
)

# Importar integración con Data Connect
from .dataconnect_nodejs_bridge import (
    DataConnectNodeBridge,
    get_dataconnect_bridge
)

# Definir qué se puede importar con from skillix_agents import *
__all__ = [
    # Agentes principales
    "team_coordinator_agent",
    "orchestrator_agent",
    
    # Clases principales
    "SkillixTeamRunner",
    "SkillixOrchestrator",
    
    # Agentes especializados
    "skill_analyzer_agent",
    "pedagogical_expert_agent",
    "adaptive_learning_agent",
    "learning_planner_agent",
    "content_generator_agent",
    "action_day_specialist",
    "greeting_agent",
    "progress_checker_agent",
    "ski_the_fox",
    "motivational_analysis_agent",
    "analytics_agent",
    "churn_prediction_agent",
    
    # Funciones de utilidad
    "analyze_skill",
    "analyze_learning_structure",
    "create_learning_plan_prompt",
    "create_content_prompt",
    "analyze_and_plan_course_tool",
    "generate_adaptive_content_tool",
    "get_ski_greeting",
    "create_streak_celebration_prompt",
    "get_random_ski_phrase",
    "should_ski_appear",
    "analyze_user_data",
    "calculate_engagement_score",
    "get_notification_strategy",
    "run_daily_analytics",
    
    # Modelos de datos
    "SkillAnalysis",
    "PedagogicalAnalysis",
    "LearningPlan",
    "DayContent",
    "ActionTask",
    "SkiMessage",
    "StreakCelebration",
    "DailyMotivation",
    "UserAnalytics",
    "LearningPattern",
    "OptimalLearningTime",
    "ContentOptimization",
    "StreakMaintenance",
    
    # Integración con Data Connect
    "DataConnectNodeBridge",
    "get_dataconnect_bridge"
]

# Versión del paquete
__version__ = "1.0.0" 