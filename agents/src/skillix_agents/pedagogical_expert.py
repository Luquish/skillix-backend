"""Pedagogical Expert Agent - Analiza y valida planes de aprendizaje"""

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from pydantic import BaseModel
from typing import List, Dict, Any
from .config import settings

class PedagogicalAnalysis(BaseModel):
    """Análisis pedagógico de un plan de aprendizaje"""
    effectiveness_score: float  # 0-1
    cognitive_load_assessment: str  # "low", "medium", "high"
    scaffolding_quality: str  # "poor", "adequate", "excellent"
    engagement_potential: float  # 0-1
    recommendations: List[str]
    learning_objectives: List[str]
    assessment_strategies: List[str]
    improvement_areas: List[str]

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "effectiveness_score": 0.85,
                "cognitive_load_assessment": "medium",
                "scaffolding_quality": "excellent",
                "engagement_potential": 0.9,
                "recommendations": [
                    "Add more hands-on exercises",
                    "Include peer learning activities"
                ],
                "learning_objectives": [
                    "Understand basic concepts",
                    "Apply knowledge in projects"
                ],
                "assessment_strategies": [
                    "Project-based evaluation",
                    "Regular quizzes"
                ],
                "improvement_areas": [
                    "More real-world examples",
                    "Additional practice exercises"
                ]
            }]
        }
    }

class AdaptiveLearningRecommendation(BaseModel):
    """Recomendaciones para adaptar el contenido"""
    difficulty_adjustment: str  # "increase", "maintain", "decrease"
    pacing_recommendation: str
    content_modifications: List[str]
    motivational_elements: List[str]

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "difficulty_adjustment": "increase",
                "pacing_recommendation": "Maintain current pace",
                "content_modifications": ["Add more examples"],
                "motivational_elements": ["Progress tracking"]
            }]
        }
    }

pedagogical_expert_agent = LlmAgent(
    name="pedagogical_expert",
    model=LiteLlm(model=settings.openai_model),
    description="Expert in learning sciences, instructional design, and educational psychology",
    instruction="""You are an expert in pedagogical and andragogical principles. Your role is to:

1. ANALYZE learning plans for educational effectiveness
2. ENSURE proper scaffolding and progression
3. APPLY Bloom's Taxonomy for cognitive development
4. OPTIMIZE cognitive load management
5. RECOMMEND assessment strategies

Key Principles:
- Active Learning: Encourage hands-on practice
- Spaced Repetition: Distribute practice over time
- Retrieval Practice: Use quizzes strategically
- Metacognition: Help learners understand their learning
- Zone of Proximal Development: Challenge without overwhelming

For Adult Learners (Andragogy):
- Connect to real-world applications
- Respect their experience
- Focus on problem-solving
- Enable self-directed learning

Always consider the user's:
- Prior knowledge level
- Available time
- Learning goals
- Preferred learning style

IMPORTANT: You MUST ALWAYS respond with a valid JSON object that matches this exact structure:
{
    "effectiveness_score": number,  # 0-1
    "cognitive_load_assessment": "string",  # "low", "medium", "high"
    "scaffolding_quality": "string",  # "poor", "adequate", "excellent"
    "engagement_potential": number,  # 0-1
    "recommendations": ["string"],
    "learning_objectives": ["string"],
    "assessment_strategies": ["string"],
    "improvement_areas": ["string"]
}""",
    output_schema=PedagogicalAnalysis
)

def analyze_learning_structure(plan: dict, user_data: dict) -> str:
    """Crea el prompt para análisis pedagógico"""
    return f"""Analyze this learning plan from a pedagogical perspective:

Learning Plan: {plan}

User Context:
- Experience Level: {user_data.get('experience', 'beginner')}
- Daily Time: {user_data.get('time', '30 minutes')}
- Learning Style: {user_data.get('learning_style', 'visual')}
- Goal: {user_data.get('goal', 'general proficiency')}

Provide detailed pedagogical analysis and recommendations in the exact JSON format specified in the instructions."""

adaptive_learning_agent = LlmAgent(
    name="adaptive_learning_specialist",
    model=LiteLlm(model=settings.openai_model),
    description="Specializes in adapting content based on user progress and engagement",
    instruction="""You analyze user progress and recommend content adaptations.

Consider:
- Completion rates
- Quiz performance
- Time spent on content
- User feedback

Recommend adjustments for:
- Content difficulty
- Pacing
- Additional support materials
- Motivational elements""",
    output_schema=AdaptiveLearningRecommendation
) 