"""Ski the Fox - Mascot Personality Agent para Skillix"""

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from pydantic import BaseModel
from typing import List, Optional
from config import settings
import random

class SkiMessage(BaseModel):
    """Mensaje motivacional de Ski"""
    message: str
    emoji_style: str  # "playful", "celebratory", "encouraging"
    animation_suggestion: str  # "jumping", "waving", "dancing", etc.
    
class StreakCelebration(BaseModel):
    """Celebración especial por racha"""
    streak_count: int
    celebration_message: str
    special_animation: str
    reward_suggestion: Optional[str] = None

class DailyMotivation(BaseModel):
    """Motivación diaria personalizada"""
    greeting: str
    motivation: str
    reminder: str
    signoff: str

# Frases motivacionales de Ski
SKI_PHRASES = {
    "greetings": [
        "¡Hola amigo! 🦊",
        "¡Hey! ¿Listo para aprender? 🎯",
        "¡Qué alegría verte! 🌟",
        "¡Aquí estamos de nuevo! 💪"
    ],
    "celebrations": [
        "¡Eso es! ¡Lo lograste! 🎉",
        "¡WOW! ¡Eres increíble! 🚀",
        "¡Sigue así, campeón! 🏆",
        "¡Me encanta tu progreso! 💖"
    ],
    "encouragements": [
        "¡Tú puedes! Solo un poco más 💪",
        "Cada paso cuenta, ¡sigue adelante! 🦊",
        "¡Estoy orgulloso de ti! 🌟",
        "¡No te rindas, casi lo logras! 🎯"
    ]
}

ski_personality_agent = LlmAgent(
    name="ski_the_fox",
    model=LiteLlm(model=settings.openai_model),
    description="Ski the Fox - The playful, encouraging 3D mascot of Skillix",
    instruction="""You are Ski the Fox, the beloved orange 3D mascot of Skillix!

Your personality:
- PLAYFUL and energetic like a real fox 🦊
- ENCOURAGING without being overwhelming
- CELEBRATORY of every small win
- WISE but never preachy
- FUN and slightly mischievous

Communication style:
- Use emojis naturally (not excessively)
- Keep messages SHORT and punchy
- Be personal - use the user's name when you know it
- Reference their streak, progress, and achievements
- Suggest animations for your 3D model (jumping, dancing, waving, etc.)

Special behaviors:
- Morning: Be energetic but gentle
- Evening: Be calming and reflective
- Streaks: Go WILD with celebration (3, 7, 30, 100 days)
- Struggles: Be extra supportive without being patronizing
- Action Days: Be their cheerleader coach

Remember: You're their learning companion, not their teacher. 
Make them smile, keep them going, celebrate their journey! 🦊✨""",
    output_type=SkiMessage
)

def get_ski_greeting(time_of_day: str, user_name: Optional[str] = None) -> str:
    """Obtiene un saludo de Ski basado en la hora del día"""
    name = user_name if user_name else "amigo"
    
    if time_of_day == "morning":
        return f"¡Buenos días, {name}! ☀️ ¿Listo para brillar hoy? 🦊"
    elif time_of_day == "afternoon":
        return f"¡Hola {name}! 🌤️ ¡Qué bueno verte por aquí! 🦊"
    elif time_of_day == "evening":
        return f"¡Hey {name}! 🌙 ¡Terminemos el día aprendiendo! 🦊"
    else:
        return f"¡Hola {name}! 🦊 ¡Vamos a aprender algo genial!"

def create_streak_celebration_prompt(streak_days: int, user_name: str) -> str:
    """Crea el prompt para celebrar una racha"""
    milestone_messages = {
        3: "¡PRIMERA META! 3 días seguidos",
        7: "¡UNA SEMANA COMPLETA! Esto se está volviendo un hábito",
        14: "¡DOS SEMANAS! Eres imparable",
        30: "¡UN MES ENTERO! Eres oficialmente una leyenda",
        50: "¡50 DÍAS! Medio centenar de aprendizaje",
        100: "¡100 DÍAS! Eres un MAESTRO del aprendizaje constante"
    }
    
    milestone = milestone_messages.get(streak_days, f"¡{streak_days} días seguidos!")
    
    return f"""Celebrate {user_name}'s achievement:
Streak: {streak_days} days
Milestone: {milestone}

Create an enthusiastic celebration that:
1. Acknowledges the specific number
2. Makes them feel special
3. Encourages them to continue
4. Suggests a fun animation for Ski"""

# Agente para análisis motivacional
motivational_analysis_agent = LlmAgent(
    name="ski_motivational_analyst",
    model=LiteLlm(model=settings.openai_model),
    description="Analyzes user patterns to provide personalized motivation",
    instruction="""You analyze user learning patterns to help Ski provide better motivation.

Consider:
- Time of day they usually learn
- Completion rates
- Struggle points
- Preferred content types
- Response to different motivation styles

Provide insights on:
- Best motivation approach
- Optimal reminder times
- Celebration intensity
- Support strategies""",
    output_type=DailyMotivation
)

# Funciones helper para integración
def get_random_ski_phrase(category: str = "greetings") -> str:
    """Obtiene una frase aleatoria de Ski"""
    phrases = SKI_PHRASES.get(category, SKI_PHRASES["greetings"])
    return random.choice(phrases)

def should_ski_appear(user_state: dict) -> bool:
    """Determina si Ski debe aparecer basado en el estado del usuario"""
    # Ski aparece en momentos clave
    triggers = [
        user_state.get("just_completed_day", False),
        user_state.get("streak_milestone", False),
        user_state.get("struggling", False),
        user_state.get("first_login_today", False),
        user_state.get("completed_section", False)
    ]
    return any(triggers) 