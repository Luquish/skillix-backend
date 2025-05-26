"""Script para probar el sistema multi-agente localmente sin base de datos"""

import asyncio
import os
from datetime import datetime
from dotenv import load_dotenv
from skillix_agents import (
    SkillixTeamRunner,
    SkillixOrchestrator,
    session_service
)

# Cargar variables de entorno desde .env
load_dotenv()

async def simular_flujo_completo():
    """Simula el flujo completo de un usuario usando el sistema"""
    
    print("\n🚀 INICIANDO SIMULACIÓN DE SKILLIX\n")
    print("=" * 50)
    
    # 1. Simular datos de usuario
    user_data = {
        "name": "Usuario de Prueba",
        "firebase_uid": "test_user_123",
        "skill": "Python para principiantes",
        "experience": "beginner",
        "time": "30 minutos diarios",
        "learning_style": "visual",
        "goal": "Aprender programación básica"
    }
    
    print("\n👤 DATOS DEL USUARIO:")
    for key, value in user_data.items():
        print(f"  {key}: {value}")
    
    # 2. Inicializar componentes
    team_runner = SkillixTeamRunner(session_service)
    orchestrator = SkillixOrchestrator()
    
    try:
        # 3. Simular onboarding - Análisis inicial
        print("\n📝 INICIANDO ONBOARDING...")
        onboarding_result = await team_runner.process_user_request(
            user_message=f"Soy {user_data['name']} y quiero aprender {user_data['skill']}. "
                        f"Soy {user_data['experience']} y tengo {user_data['time']} disponibles.",
            firebase_uid=user_data['firebase_uid']
        )
        
        if onboarding_result["success"]:
            print("\n✅ RESPUESTA DEL GREETING AGENT:")
            print(f"  {onboarding_result['response'][:200]}...")
            if onboarding_result.get("delegated_to"):
                print(f"  Delegado a: {onboarding_result['delegated_to']}")
        
        # 4. Crear curso personalizado
        print("\n📚 GENERANDO CURSO PERSONALIZADO...")
        course_result = await orchestrator.analyze_and_plan_course(
            user_data=user_data,
            firebase_uid=user_data['firebase_uid']
        )
        
        if course_result["success"]:
            print("\n✅ CURSO GENERADO:")
            
            # Mostrar análisis de habilidad
            skill_analysis = course_result["skill_analysis"]
            print("\n📊 ANÁLISIS DE HABILIDAD:")
            print(f"  Categoría: {skill_analysis['skill_category']}")
            print(f"  Demanda del mercado: {skill_analysis['market_demand']}")
            print("\n  Componentes principales:")
            for i, comp in enumerate(skill_analysis['components'][:3], 1):
                print(f"    {i}. {comp['name']} ({comp['difficulty_level']})")
            
            # Mostrar plan de aprendizaje
            learning_plan = course_result["learning_plan"]
            print("\n📅 PLAN DE APRENDIZAJE:")
            print(f"  Total de secciones: {len(learning_plan['sections'])}")
            print(f"  Resumen: {learning_plan['overview'][:200]}...")
            
            print("\n  Primeras secciones:")
            for i, section in enumerate(learning_plan['sections'][:3], 1):
                print(f"    {i}. {section['title']}")
                print(f"       Días: {len(section['days'])}")
            
            # Mostrar contenido del primer día
            first_day = course_result["first_day_content"]
            print("\n📖 CONTENIDO DEL DÍA 1:")
            print(f"  Título: {first_day['title']}")
            print(f"  Tipo de día: {'Práctica' if first_day['is_action_day'] else 'Teoría'}")
            print(f"  Bloques de contenido: {len(first_day['blocks'])}")
            
            if first_day['blocks']:
                print("\n  Primer bloque:")
                block = first_day['blocks'][0]
                print(f"    Tipo: {block['type']}")
                if block['type'] == 'read':
                    print(f"    Contenido: {block['body'][:150]}...")
        
        # 5. Simular algunas interacciones de chat
        print("\n💭 SIMULANDO INTERACCIONES DE CHAT...")
        
        chat_messages = [
            "¿Puedes explicarme más sobre funciones en Python?",
            "¿Cuál es el siguiente tema que debo aprender?",
            "¿Puedes darme un ejercicio práctico?"
        ]
        
        for message in chat_messages:
            print(f"\n👤 Usuario pregunta: {message}")
            
            chat_result = await team_runner.process_user_request(
                user_message=message,
                firebase_uid=user_data['firebase_uid']
            )
            
            if chat_result["success"]:
                print(f"\n🤖 Asistente responde:")
                print(f"  {chat_result['response'][:200]}...")
                if chat_result.get("delegated_to"):
                    print(f"  (Respondido por: {chat_result['delegated_to']})")
            
            print("-" * 40)
        
        print("\n✨ SIMULACIÓN COMPLETADA EXITOSAMENTE!")
        
    except Exception as e:
        print(f"\n❌ Error durante la simulación: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Verificar que las variables de entorno estén cargadas
    if not os.getenv("OPENAI_API_KEY"):
        print("\n⚠️  No se encontró OPENAI_API_KEY en las variables de entorno")
        print("   Asegúrate de que tu archivo .env contenga esta variable")
    else:
        # Ejecutar simulación
        print("\n📝 Variables de entorno cargadas correctamente")
        asyncio.run(simular_flujo_completo()) 