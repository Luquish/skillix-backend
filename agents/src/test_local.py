"""Script para probar localmente los endpoints de la API"""

import asyncio
import os
import json
from dotenv import load_dotenv
from datetime import datetime
from typing import Dict, Any, Optional

from skillix_agents.orchestrator import SkillixOrchestrator
from api.routes.onboarding import OnboardingData
from api.providers.google import verify_google_token
from api.providers.apple import verify_apple_token, hash_nonce

# Cargar variables de entorno desde .env
load_dotenv()

class MockDB:
    """Simula la base de datos en memoria"""
    def __init__(self):
        self.users = {}
        self.preferences = {}
        self.learning_plans = {}
        self.daily_content = {}
    
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        user_id = f"user_{len(self.users) + 1}"
        self.users[user_id] = {**user_data, "id": user_id}
        return self.users[user_id]
    
    async def create_preferences(self, data: Dict[str, Any]) -> Dict[str, Any]:
        pref_id = f"pref_{len(self.preferences) + 1}"
        self.preferences[pref_id] = {**data, "id": pref_id}
        return self.preferences[pref_id]
    
    async def create_learning_plan(self, data: Dict[str, Any]) -> Dict[str, Any]:
        plan_id = f"plan_{len(self.learning_plans) + 1}"
        self.learning_plans[plan_id] = {**data, "id": plan_id}
        return self.learning_plans[plan_id]

# Instancia global de la DB mock
mock_db = MockDB()

async def simular_auth(auth_type: str = "google"):
    """Simula el proceso de autenticación"""
    print("\n🔐 SIMULANDO AUTENTICACIÓN")
    print("=" * 50)
    
    if auth_type == "google":
        mock_token_data = {
            "id_token": "mock_id_token",
            "access_token": "mock_access_token",
            "platform": "IOS"
        }
        
        print("\n📝 DATOS DE AUTENTICACIÓN GOOGLE:")
        print(json.dumps(mock_token_data, indent=2, ensure_ascii=False))
        
        # Simular verificación de token
        result = {
            "success": True,
            "user": {
                "id": "test_user_1",
                "name": "Juan Pérez",
                "email": "juan@ejemplo.com",
                "picture": "https://example.com/photo.jpg"
            }
        }
    else:  # apple
        nonce = "mock_nonce"
        mock_token_data = {
            "identity_token": "mock_identity_token",
            "nonce": nonce,
            "user_identifier": "mock_user_id",
            "platform": "IOS",
            "name": "Juan Pérez"
        }
        
        print("\n📝 DATOS DE AUTENTICACIÓN APPLE:")
        print(json.dumps(mock_token_data, indent=2, ensure_ascii=False))
        
        result = {
            "success": True,
            "user": {
                "id": "test_user_1",
                "name": "Juan Pérez",
                "email": "juan@ejemplo.com"
            }
        }
    
    # Guardar usuario en DB mock
    await mock_db.create_user(result["user"])
    
    print("\n✨ RESPUESTA DE AUTENTICACIÓN:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result["user"]

async def simular_onboarding(user: Dict[str, Any]):
    """Simula el endpoint de onboarding"""
    print("\n🚀 SIMULANDO ONBOARDING")
    print("=" * 50)
    
    # Datos de onboarding
    onboarding_data = OnboardingData(
        skill="Python",
        experience="principiante",
        motivation="Quiero cambiar mi carrera a tecnología",
        time="20 minutos",
        learning_style="práctico/visual",
        goal="Conseguir mi primer trabajo como desarrollador"
    )
    
    print("\n📝 DATOS DE ONBOARDING:")
    print(json.dumps(onboarding_data.model_dump(), indent=2, ensure_ascii=False))
    
    try:
        # 1. Guardar preferencias
        preference_data = {
            "userId": user["id"],
            **onboarding_data.model_dump(),
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat()
        }
        await mock_db.create_preferences(preference_data)
        
        # 2. Generar plan personalizado
        orchestrator = SkillixOrchestrator()
        result = await orchestrator.create_personalized_course({
            "name": user["name"],
            **onboarding_data.model_dump()
        }, user["id"])
        
        if not result.get("success"):
            print(f"\n❌ Error: {result.get('error', 'Error desconocido')}")
            return None
        
        # Guardar plan en DB mock
        await mock_db.create_learning_plan({
            "userId": user["id"],
            **result["learning_plan"]
        })
        
        response = {
            "success": True,
            "plan": result["learning_plan"],
            "first_day": result["first_day_content"]
        }
        
        print("\n✨ RESPUESTA DE ONBOARDING:")
        print(json.dumps(response, indent=2, ensure_ascii=False))
        return response
        
    except Exception as e:
        print(f"\n❌ Error durante onboarding: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

async def simular_next_day_content(user: Dict[str, Any], plan_id: str):
    """Simula el endpoint de siguiente día de contenido"""
    print("\n📚 SIMULANDO GENERACIÓN DE SIGUIENTE DÍA")
    print("=" * 50)
    
    try:
        # Obtener plan de la DB mock
        plan = mock_db.learning_plans.get(plan_id)
        if not plan:
            print("\n❌ Error: Plan no encontrado")
            return None
            
        # Obtener último contenido (simulado)
        last_content = {"day_number": 1}
        
        # Generar siguiente día
        orchestrator = SkillixOrchestrator()
        result = await orchestrator.generate_next_day_content(
            plan_id,
            last_content["day_number"],
            {
                "name": user["name"],
                "skill": plan["skill"],
                "experience": plan["experience"],
                "time": plan["time"],
                "learning_style": plan["learning_style"]
            },
            plan["sections"],
            last_content
        )
        
        if not result.get("success"):
            print(f"\n❌ Error: {result.get('error', 'Error desconocido')}")
            return None
            
        response = {
            "success": True,
            "content": result["day_content"]
        }
        
        print("\n✨ RESPUESTA DE SIGUIENTE DÍA:")
        print(json.dumps(response, indent=2, ensure_ascii=False))
        return response
        
    except Exception as e:
        print(f"\n❌ Error generando contenido: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

async def simular_flujo_completo():
    """Simula el flujo completo de la API"""
    try:
        # 1. Autenticación
        user = await simular_auth("google")
        if not user:
            return
            
        # 2. Onboarding
        onboarding_result = await simular_onboarding(user)
        if not onboarding_result:
            return
            
        # 3. Generar siguiente día
        plan_id = list(mock_db.learning_plans.keys())[0]  # Tomar el primer plan creado
        await simular_next_day_content(user, plan_id)
        
    except Exception as e:
        print(f"\n❌ Error durante la simulación: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Verificar que las variables de entorno estén cargadas
    if not os.getenv("OPENAI_API_KEY"):
        print("\n❌ No se encontró OPENAI_API_KEY en las variables de entorno")
        print("   Asegúrate de que tu archivo .env contenga esta variable")
    else:
        # Ejecutar simulación
        print("\n📝 Variables de entorno cargadas correctamente")
        asyncio.run(simular_flujo_completo()) 