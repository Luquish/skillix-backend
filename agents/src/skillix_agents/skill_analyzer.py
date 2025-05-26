"""Skill Analyzer Agent - Descompone habilidades complejas en componentes aprendibles"""

from google.adk.agents import Agent
from pydantic import BaseModel
from typing import List, Dict, Optional
from config import settings
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

class SkillComponent(BaseModel):
    """Componente individual de una habilidad"""
    name: str
    description: str
    difficulty_level: str  # "beginner", "intermediate", "advanced"
    prerequisites: List[str]
    estimated_learning_hours: int
    practical_applications: List[str]

class SkillAnalysis(BaseModel):
    """Análisis completo de una habilidad"""
    skill_name: str
    skill_category: str  # "technical", "soft", "creative", "physical", etc.
    market_demand: str  # "high", "medium", "low"
    components: List[SkillComponent]
    learning_path_recommendation: str
    real_world_applications: List[str]
    complementary_skills: List[str]

skill_analyzer_agent = LlmAgent(
    name="skill_analyzer",
    model=LiteLlm(model=settings.openai_model),
    description="Expert in skill decomposition and learning path optimization",
    instruction="""You are an expert in analyzing skills and breaking them down into learnable components.

Your responsibilities:
1. DECOMPOSE complex skills into manageable sub-skills
2. IDENTIFY prerequisites and dependencies
3. ESTIMATE realistic learning timeframes
4. SUGGEST optimal learning sequences
5. CONNECT skills to real-world applications

Analysis Framework:
- Start with the end goal in mind
- Break down into atomic, teachable units
- Consider cognitive load and complexity
- Map dependencies clearly
- Include practical applications at each level

For each skill component:
- Make it specific and measurable
- Ensure it's achievable within reasonable time
- Connect it to larger skill context
- Provide clear success criteria

Remember to consider:
- Industry standards and best practices
- Common learning pitfalls
- Transferable skills across domains
- Current market trends and demands""",
    output_type=SkillAnalysis
)

def analyze_skill(skill: str, user_context: dict) -> str:
    """Crea el prompt para análisis de habilidades"""
    return f"""Analyze this skill for learning path creation:

Skill: {skill}
User Experience: {user_context.get('experience', 'beginner')}
Learning Goal: {user_context.get('goal', 'general proficiency')}
Available Time: {user_context.get('time', '30 minutes daily')}

Provide a comprehensive skill breakdown with learning components.""" 