"""Script para probar la interacción entre agentes sin base de datos"""

import json
import asyncio
from typing import Dict, Any
from google.genai import types
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService, Session
from src.skillix_agents.learning_planner import learning_planner_agent, create_learning_plan_prompt
from src.skillix_agents.content_generator import content_generator_agent, create_content_prompt
from src.skillix_agents.skill_analyzer import skill_analyzer_agent, analyze_skill, SkillAnalysis
from src.skillix_agents.pedagogical_expert import pedagogical_expert_agent, analyze_learning_structure, PedagogicalAnalysis

# Configurar session service y runner
session_service = InMemorySessionService()

# Configurar runner con la sesión
runner = Runner(
    agent=skill_analyzer_agent,
    app_name="skillix_test",
    session_service=session_service
)

async def test_agents(user_data: Dict[str, Any]) -> None:
    """Prueba la interacción completa entre agentes"""
    
    # Crear sesión de prueba
    session = await session_service.create_session(
        app_name="skillix_test",
        user_id="test_user",
        session_id="test_session"
    )
    
    print("\n🔍 Analizando la habilidad...")
    skill_analysis = None
    prompt = analyze_skill(user_data['skill'], user_data)
    
    async for event in runner.run_async(
        user_id=session.user_id,
        session_id=session.id,
        new_message=types.Content(
            role="user",
            parts=[types.Part(text=prompt)]
        )
    ):
        if event.is_final_response():
            skill_analysis = SkillAnalysis.model_validate_json(event.content.parts[0].text)
    
    if skill_analysis:
        print(json.dumps(skill_analysis.model_dump(), indent=2, ensure_ascii=False))
    
    print("\n📚 Generando análisis pedagógico...")
    pedagogical_analysis = None
    prompt = analyze_learning_structure(skill_analysis.model_dump() if skill_analysis else {}, user_data)
    
    runner.agent = pedagogical_expert_agent
    async for event in runner.run_async(
        user_id=session.user_id,
        session_id=session.id,
        new_message=types.Content(
            role="user",
            parts=[types.Part(text=prompt)]
        )
    ):
        if event.is_final_response():
            pedagogical_analysis = PedagogicalAnalysis.model_validate_json(event.content.parts[0].text)
    
    if pedagogical_analysis:
        print(json.dumps(pedagogical_analysis.model_dump(), indent=2, ensure_ascii=False))
    
    print("\n📅 Generando plan de aprendizaje...")
    learning_plan = None
    prompt = create_learning_plan_prompt({
        **user_data,
        'skill_analysis': skill_analysis.model_dump() if skill_analysis else {},
        'pedagogical_analysis': pedagogical_analysis.model_dump() if pedagogical_analysis else {}
    })
    
    runner.agent = learning_planner_agent
    async for event in runner.run_async(
        user_id=session.user_id,
        session_id=session.id,
        new_message=types.Content(
            role="user",
            parts=[types.Part(text=prompt)]
        )
    ):
        if event.is_final_response():
            learning_plan = event.content.parts[0].text
    
    if learning_plan:
        print(json.dumps(json.loads(learning_plan), indent=2, ensure_ascii=False))

if __name__ == "__main__":
    # Solicitar datos al usuario
    print("¿Deseas ingresar datos personalizados? (s/n): ", end="")
    if input().lower() == "s":
        test_user = {
            "name": input("Nombre: "),
            "skill": input("Habilidad a aprender: "),
            "experience": input("Nivel (BEGINNER/INTERMEDIATE/ADVANCED): "),
            "motivation": input("Motivación: "),
            "time": input("Tiempo disponible por día (minutos): "),
            "learning_style": input("Estilo de aprendizaje (VISUAL/AUDITORY/KINESTHETIC): "),
            "goal": input("Objetivo de aprendizaje: ")
        }
    else:
        test_user = {
            "name": "Test User",
            "skill": "Python",
            "experience": "BEGINNER",
            "motivation": "Career change",
            "time": "10",
            "learning_style": "VISUAL",
            "goal": "Build web applications"
        }
    
    # Ejecutar prueba
    asyncio.run(test_agents(test_user)) 