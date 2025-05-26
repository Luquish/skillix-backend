"""Pedagogical Expert Agent - Especialista en principios pedagógicos y andragógicos"""

from google.adk.agents import LlmAgent
from pydantic import BaseModel
from typing import List, Dict, Any
from config import settings
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

class PedagogicalAnalysis(BaseModel):
    """Análisis pedagógico de un plan de aprendizaje"""
    learning_objectives: List[str]
    bloom_taxonomy_levels: Dict[str, List[str]]  # nivel: objetivos
    cognitive_load_assessment: str
    scaffolding_strategy: str
    assessment_recommendations: List[str]
    engagement_techniques: List[str]

class AdaptiveLearningRecommendation(BaseModel):
    """Recomendaciones para adaptar el contenido"""
    difficulty_adjustment: str  # "increase", "maintain", "decrease"
    pacing_recommendation: str
    content_modifications: List[str]
    motivational_elements: List[str]

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
- Preferred learning style""",
    output_type=PedagogicalAnalysis
)

def analyze_learning_structure(plan: dict, user_data: dict) -> str:
    """Crea el prompt para análisis pedagógico"""
    return f"""Analyze this learning plan from a pedagogical perspective:

Learning Plan: {plan}

User Context:
- Experience Level: {user_data['experience']}
- Daily Time: {user_data['time']}
- Learning Style: {user_data['learning_style']}
- Goal: {user_data['goal']}

Provide detailed pedagogical analysis and recommendations."""

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
    output_type=AdaptiveLearningRecommendation
) 