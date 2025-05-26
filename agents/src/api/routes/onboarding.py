"""Rutas de onboarding usando FastAPI"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from pydantic import BaseModel
from datetime import datetime

from ...skillix_agents.orchestrator import SkillixOrchestrator
from ..auth.middleware import get_current_user
from ..db import dataconnect

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

class OnboardingData(BaseModel):
    """Modelo para datos de onboarding"""
    skill: str
    experience: str
    motivation: str
    time: str
    learning_style: str
    goal: str

@router.post("/complete")
async def complete_onboarding(
    data: OnboardingData,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Completa el proceso de onboarding y genera el plan inicial"""
    try:
        # 1. Guardar preferencias del usuario
        preference_data = {
            "userId": user["id"],  # ID del usuario ya autenticado
            "skill": data.skill,
            "experience": data.experience,
            "motivation": data.motivation,
            "time": data.time,
            "learningStyle": data.learning_style,
            "goal": data.goal,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }

        # Guardar en Data Connect
        await dataconnect.user_preferences.create(preference_data)

        # 2. Generar plan personalizado usando el orquestador
        orchestrator = SkillixOrchestrator()
        result = await orchestrator.create_personalized_course({
            "name": user["name"],  # Usar el nombre del usuario autenticado
            "skill": data.skill,
            "experience": data.experience,
            "motivation": data.motivation,
            "time": data.time,
            "learning_style": data.learning_style,
            "goal": data.goal
        }, user["id"])  # Usar el ID del usuario autenticado

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=result["error"]
            )

        return {
            "success": True,
            "plan": result["learning_plan"],
            "first_day": result["first_day_content"]
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error procesando onboarding: {str(e)}"
        ) 