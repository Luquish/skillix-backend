"""Analytics Agent - Análisis de patrones de aprendizaje y optimización"""

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from pydantic import BaseModel
from typing import List, Dict, Optional, Tuple
from datetime import datetime, time
from config import settings

class LearningPattern(BaseModel):
    """Patrón de aprendizaje identificado"""
    pattern_type: str  # "time_based", "performance_based", "engagement_based"
    description: str
    confidence: float  # 0-1
    recommendations: List[str]

class OptimalLearningTime(BaseModel):
    """Tiempo óptimo para aprender"""
    best_time_window: Tuple[time, time]  # (start, end)
    reason: str
    notification_time: time
    engagement_prediction: float  # 0-1

class ContentOptimization(BaseModel):
    """Recomendaciones para optimizar contenido"""
    difficulty_adjustment: str  # "increase", "maintain", "decrease"
    content_type_preferences: List[str]  # ["quiz_mcq", "read", "audio", etc.]
    ideal_session_length: int  # minutos
    pacing_recommendation: str
    
class StreakMaintenance(BaseModel):
    """Estrategias para mantener la racha"""
    risk_level: str  # "low", "medium", "high"
    risk_factors: List[str]
    intervention_strategies: List[str]
    motivational_approach: str

class UserAnalytics(BaseModel):
    """Análisis completo del usuario"""
    learning_patterns: List[LearningPattern]
    optimal_time: OptimalLearningTime
    content_optimization: ContentOptimization
    streak_maintenance: StreakMaintenance
    overall_engagement_score: float  # 0-1
    key_insights: List[str]

# Agente principal de analytics
analytics_agent = LlmAgent(
    name="learning_analytics",
    model=LiteLlm(model=settings.openai_model),
    description="Analyzes user learning patterns to optimize experience and maintain engagement",
    instruction="""You are an expert in learning analytics and user behavior analysis.

Your role is to:
1. IDENTIFY patterns in user learning behavior
2. PREDICT optimal learning times and conditions
3. RECOMMEND content adjustments for better engagement
4. PREVENT streak loss through proactive interventions
5. OPTIMIZE the overall learning experience

Analysis dimensions:
- Time patterns: When do they learn best?
- Performance patterns: What content works best?
- Engagement patterns: What keeps them motivated?
- Struggle patterns: Where do they need support?

Key metrics to consider:
- Session completion rates
- Quiz performance by type
- Time spent per content type
- Streak history and breaks
- Response to different motivation styles

Provide actionable insights that can be implemented immediately.
Focus on maintaining engagement while ensuring learning effectiveness.""",
    output_type=UserAnalytics
)

# Agente para predicción de abandono
churn_prediction_agent = LlmAgent(
    name="churn_predictor",
    model=LiteLlm(model=settings.openai_model),
    description="Predicts risk of user abandonment and suggests interventions",
    instruction="""You predict when users might stop using Skillix and suggest preventive actions.

Risk indicators:
- Decreasing session frequency
- Incomplete days
- Lower quiz scores
- Shorter session times
- Delayed responses to notifications

Intervention strategies:
- Personalized Ski messages
- Easier content days
- Special challenges
- Streak save opportunities
- Re-engagement campaigns

Be proactive but not pushy. Focus on re-igniting curiosity.""",
    output_type=StreakMaintenance
)

def analyze_user_data(user_id: str, user_history: Dict) -> str:
    """Crea el prompt para análisis de usuario"""
    return f"""Analyze learning patterns for user {user_id}:

Session History:
- Total sessions: {user_history.get('total_sessions', 0)}
- Average session time: {user_history.get('avg_session_time', 0)} minutes
- Preferred learning times: {user_history.get('common_times', [])}
- Current streak: {user_history.get('current_streak', 0)} days
- Longest streak: {user_history.get('longest_streak', 0)} days

Performance Data:
- Overall completion rate: {user_history.get('completion_rate', 0)}%
- Quiz average score: {user_history.get('quiz_avg', 0)}%
- Best performing content: {user_history.get('best_content_type', 'unknown')}
- Struggle areas: {user_history.get('struggle_areas', [])}

Engagement Metrics:
- Days since last session: {user_history.get('days_since_last', 0)}
- Response to notifications: {user_history.get('notification_response', 'unknown')}
- Action day completion: {user_history.get('action_day_rate', 0)}%

Provide comprehensive analysis and actionable recommendations."""

def calculate_engagement_score(user_metrics: Dict) -> float:
    """Calcula un score de engagement del 0 al 1"""
    weights = {
        'streak_consistency': 0.3,
        'completion_rate': 0.25,
        'quiz_performance': 0.2,
        'session_regularity': 0.15,
        'action_day_completion': 0.1
    }
    
    score = 0
    score += weights['streak_consistency'] * min(user_metrics.get('current_streak', 0) / 30, 1)
    score += weights['completion_rate'] * user_metrics.get('completion_rate', 0) / 100
    score += weights['quiz_performance'] * user_metrics.get('quiz_avg', 0) / 100
    score += weights['session_regularity'] * user_metrics.get('session_regularity', 0)
    score += weights['action_day_completion'] * user_metrics.get('action_day_rate', 0) / 100
    
    return round(score, 2)

def get_notification_strategy(user_pattern: str, timezone: str) -> Dict:
    """Determina la mejor estrategia de notificaciones"""
    strategies = {
        'morning_learner': {
            'primary_time': '08:00',
            'reminder_time': '07:30',
            'message_tone': 'energetic'
        },
        'lunch_learner': {
            'primary_time': '12:30',
            'reminder_time': '12:00',
            'message_tone': 'friendly'
        },
        'evening_learner': {
            'primary_time': '20:00',
            'reminder_time': '19:30',
            'message_tone': 'relaxed'
        },
        'night_owl': {
            'primary_time': '22:00',
            'reminder_time': '21:30',
            'message_tone': 'calm'
        }
    }
    
    return strategies.get(user_pattern, strategies['morning_learner'])

# Funciones para integración con el sistema principal
async def run_daily_analytics(user_id: str, session_data: Dict) -> UserAnalytics:
    """Ejecuta análisis diario para un usuario"""
    prompt = analyze_user_data(user_id, session_data)
    # Aquí se llamaría al analytics_agent con el prompt
    # Por ahora retornamos un placeholder
    return UserAnalytics(
        learning_patterns=[],
        optimal_time=OptimalLearningTime(
            best_time_window=(time(9, 0), time(10, 0)),
            reason="Historical data shows best engagement",
            notification_time=time(8, 45),
            engagement_prediction=0.85
        ),
        content_optimization=ContentOptimization(
            difficulty_adjustment="maintain",
            content_type_preferences=["quiz_mcq", "read"],
            ideal_session_length=15,
            pacing_recommendation="current pace is optimal"
        ),
        streak_maintenance=StreakMaintenance(
            risk_level="low",
            risk_factors=[],
            intervention_strategies=[],
            motivational_approach="celebratory"
        ),
        overall_engagement_score=0.78,
        key_insights=["User is highly engaged", "Prefers morning sessions"]
    ) 