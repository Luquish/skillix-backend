"""Rutas de contenido usando FastAPI"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from datetime import datetime

from ...skillix_agents.orchestrator import SkillixOrchestrator
from ..auth.middleware import get_current_user
from ..db import dataconnect

router = APIRouter(prefix="/api/content", tags=["content"])

@router.get("/next-day/{plan_id}")
async def get_next_day_content(
    plan_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Genera el contenido para el siguiente día del plan"""
    try:
        # 1. Obtener plan actual
        plan = await dataconnect.learning_plans.find_one(
            where={"id": plan_id, "user_id": user["uid"]}
        )

        if not plan:
            raise HTTPException(
                status_code=404,
                detail="Plan no encontrado"
            )

        # 2. Obtener último contenido generado
        last_content = await dataconnect.daily_content.find_one(
            where={"plan_id": plan_id},
            order_by={"day_number": "desc"}
        )

        # 3. Obtener datos del usuario
        user_data = await dataconnect.users.find_one(
            where={"id": user["uid"]}
        )

        # 4. Generar siguiente día
        orchestrator = SkillixOrchestrator()
        result = await orchestrator.generate_next_day_content(
            plan_id,
            last_content["day_number"] if last_content else 0,
            {
                "name": user_data["name"],
                "skill": plan["skill_name"],
                "experience": user_data["experience_level"],
                "time": user_data["available_time"],
                "learning_style": user_data["learning_style"]
            },
            plan["sections"],
            last_content
        )

        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=result["error"]
            )

        return {
            "success": True,
            "content": result["day_content"]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generando contenido: {str(e)}"
        ) 