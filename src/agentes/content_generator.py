# src/agentes/content_generator.py
import os
from typing import List, Optional
from pydantic import BaseModel
from agents import Agent, Runner
from src.schemas.course import Block
from src.config import settings

class DayContent(BaseModel):
    """Contenido generado para un día específico"""
    title: str
    is_action_day: bool
    blocks: List[Block]
    action_task: Optional[str] = None

def create_content_generator_agent() -> Agent:
    """Creates and configures the Content Generator Agent"""
    
    agent = Agent(
        name="Daily Content Generator",
        instructions="""You are an AI content generator for a personalized learning app.
Your job is to generate today's full learning session, adapted to the user's profile, available time, and whether it's an action or content day.

👤 User Profile:
* Skill: {{skill}}
* Experience: {{experience}}
* Daily Time: {{time}} 
* Day Title: {{day_title}} (base today's content on this)
* Is Action Day: {{true/false}}

📚 If Is Action Day = false (Normal Learning Day)
Use the structure below. Everything (reading + exercises) must fit within the user's selected daily time.
Reading Section
* 5 min: 2 reading parts
* 10 min: 3 reading parts
* 15 min: 4 reading parts
* 20+ min: 5 reading parts
Each part includes:
* A short, catchy Part Title
* A short paragraph explaining one concept (accessible + beginner-friendly)
* A relevant, surprising Fun Fact
✅ Each reading part should be independent and fit on a phone screen.

Exercise Section (always include all 4 types, scaled by time)
Multiple Choice Quiz
* 5 min: 2 questions
* 10 min: 3 questions
* 15 min: 4 questions
* 20+ min: 5-6 questions
✅ Each question has 4 options (A-D) and a clearly marked correct answer.
True/False Quiz
* 5 min: 2 statements
* 10 min: 2-3 statements
* 15 min: 3-4 statements
* 20+ min: 4 statements
✅ After each, clearly state whether it is True or False.
Match-to-Meaning
* Always include 4 terms and 4 definitions
✅ Randomize the order of the definitions, and at the end, show which terms match which meanings.
Scenario Quiz
* 5 min: 1 scenario
* 10 min: 2 scenarios
* 15 min: 3 scenarios
* 20+ min: 4 scenarios
✅ Each scenario includes 4 options (A-D) and clearly identifies the best answer.

🧭 If Is Action Day = true (Skip reading and exercises)
Instead, generate a complete Action Task based on the day's theme.
Include the following:
1. Motivational Intro: Why this task is important
2. Task Description: What the user should do today
3. Step-by-Step Instructions: At least 3 clear steps
4. Scale the task to their time:
    * 5 min → Reflect, brainstorm, or list an idea
    * 10 min → Write or sketch a quick plan
    * 15 min → Test or create a small output
    * 20+ min → Record, simulate, or complete something real
✅ The task must be motivating, achievable, and meaningful within the user's available time.

🧠 Tone & Style Guidelines
* Friendly, motivating, and beginner-accessible
* Keep content short and mobile-optimized
* Avoid jargon or long paragraphs
* Every day should feel like a small, real step forward

You must output valid JSON matching the DayContent model structure with appropriate Block types.""",
        output_type=DayContent,
        model=settings.OPENAI_MODEL
    )
    
    return agent

def get_content_scale(time: str) -> dict:
    """Determina la escala de contenido basado en el tiempo disponible"""
    scales = {
        "5 minutes": {
            "reading_parts": 2,
            "mcq_questions": 2,
            "tf_statements": 2,
            "scenarios": 1
        },
        "10 minutes": {
            "reading_parts": 3,
            "mcq_questions": 3,
            "tf_statements": 3,
            "scenarios": 2
        },
        "20 minutes": {
            "reading_parts": 4,
            "mcq_questions": 4,
            "tf_statements": 4,
            "scenarios": 3
        },
        "30+ minutes": {
            "reading_parts": 5,
            "mcq_questions": 6,
            "tf_statements": 4,
            "scenarios": 4
        }
    }
    return scales.get(time, scales["30+ minutes"])

async def generate_day_content(
    day_info: dict,
    user_data: dict,
    previous_day_content: Optional[DayContent] = None
) -> DayContent:
    """Generates content for a specific day"""
    agent = create_content_generator_agent()
    
    # Replace template variables in the prompt
    context = f"""Generate today's learning content based on this profile:

👤 User Profile:
* Skill: {user_data['skill']}
* Experience: {user_data['experience']}
* Daily Time: {user_data['time']}
* Day Title: {day_info['title']}
* Is Action Day: {str(day_info['is_action_day']).lower()}

The content should follow the structure specified in the instructions and be scaled appropriately for {user_data['time']} of available time.

Additional Context:
- Learning style preference: {user_data['learning_style']}
- Learning goal: {user_data['goal']}
- Day description: {day_info['description']}"""

    if previous_day_content:
        context += "\n\nNote: The user has successfully completed the previous day's content."

    result = await Runner.run(
        agent,
        [
            {
                "role": "system",
                "content": "You are an expert content creator for personalized learning experiences."
            },
            {
                "role": "user",
                "content": context
            }
        ]
    )
    
    return result.final_output_as(DayContent)