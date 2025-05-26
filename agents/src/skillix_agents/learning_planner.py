"""Learning Planner Agent - Crea planes de aprendizaje personalizados"""

import os
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from datetime import datetime, timedelta
from .config import settings

class LearningDay(BaseModel):
    """Representa un día en el plan de aprendizaje"""
    day_number: int
    title: str
    focus_area: str  # Área específica de enfoque para este día
    is_action_day: bool
    description: Optional[str] = None

class LearningSection(BaseModel):
    """Representa una sección en el plan de aprendizaje"""
    title: str
    description: str  # Descripción de lo que se aprenderá en esta sección
    days: List[LearningDay]

class LearningPlan(BaseModel):
    """Plan de aprendizaje personalizado"""
    total_duration_weeks: int
    daily_time_minutes: int
    skill_level_target: str  # "beginner", "intermediate", "advanced"
    milestones: List[str]
    daily_activities: List[Dict[str, Any]]
    resources: List[Dict[str, str]]
    progress_metrics: List[str]
    flexibility_options: List[str]

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "total_duration_weeks": 8,
                "daily_time_minutes": 30,
                "skill_level_target": "intermediate",
                "milestones": [
                    "Complete basic syntax",
                    "Build first web app"
                ],
                "daily_activities": [
                    {
                        "type": "learning",
                        "duration_minutes": 15,
                        "description": "Watch tutorial video"
                    },
                    {
                        "type": "practice",
                        "duration_minutes": 15,
                        "description": "Complete coding exercises"
                    }
                ],
                "resources": [
                    {
                        "name": "Official Documentation",
                        "url": "https://docs.python.org"
                    }
                ],
                "progress_metrics": [
                    "Quiz scores",
                    "Project completion"
                ],
                "flexibility_options": [
                    "Weekend catch-up sessions",
                    "Optional advanced topics"
                ]
            }]
        }
    }

# Actualizar el agente planificador para usar GPT-4
learning_planner_agent = LlmAgent(
    name="learning_journey_planner",
    model=LiteLlm(model=settings.openai_model),
    description="Creates personalized learning plans based on user goals and constraints",
    instruction="""You are an expert in creating personalized learning plans. Your role is to:

1. ANALYZE user goals and constraints
2. CREATE realistic learning schedules
3. INCORPORATE pedagogical best practices
4. BALANCE challenge and achievability
5. PROVIDE clear progress metrics

Key Planning Principles:
- Realistic Time Allocation
- Progressive Difficulty
- Regular Milestones
- Flexible Scheduling
- Clear Success Criteria

Consider:
- User's available time
- Prior experience level
- Learning preferences
- Real-world commitments
- Desired outcomes

IMPORTANT: You MUST ALWAYS respond with a valid JSON object that matches this exact structure:
{
    "total_duration_weeks": number,
    "daily_time_minutes": number,
    "skill_level_target": "string",  # "beginner", "intermediate", "advanced"
    "milestones": ["string"],
    "daily_activities": [
        {
            "type": "string",
            "duration_minutes": number,
            "description": "string"
        }
    ],
    "resources": [
        {
            "name": "string",
            "url": "string"
        }
    ],
    "progress_metrics": ["string"],
    "flexibility_options": ["string"]
}""",
    output_schema=LearningPlan
)

def create_learning_plan_prompt(user_data: dict) -> str:
    """Crea el prompt para generar un plan de aprendizaje"""
    return f"""Create a personalized learning plan with the following context:

User Profile:
- Skill: {user_data.get('skill', 'Python')}
- Experience: {user_data.get('experience', 'beginner')}
- Available Time: {user_data.get('time', '30 minutes daily')}
- Goal: {user_data.get('goal', 'general proficiency')}

Additional Context:
- Skill Analysis: {user_data.get('skill_analysis', {})}
- Pedagogical Analysis: {user_data.get('pedagogical_analysis', {})}

Provide a detailed learning plan in the exact JSON format specified in the instructions.""" 