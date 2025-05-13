from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from src.agentes.orchestrator import orchestrate_course_creation
from src.services.storage_service import Enrollment
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class PlanRequest(BaseModel):
    uid: str
    name: str
    skill: str
    experience: str
    motivation: str
    time: str
    learning_style: str
    goal: str

class PlanResponse(BaseModel):
    course_id: str
    roadmap: dict
    first_day: dict

@router.post("/plan", response_model=PlanResponse)
async def create_learning_plan(request: PlanRequest) -> PlanResponse:
    """Creates a new learning plan and generates first day content"""
    try:
        user_data = {
            "name": request.name,
            "skill": request.skill,
            "experience": request.experience,
            "motivation": request.motivation,
            "time": request.time,
            "learning_style": request.learning_style,
            "goal": request.goal
        }
        
        enrollment = await orchestrate_course_creation(user_data, request.uid)
        
        if not enrollment:
            raise HTTPException(status_code=500, detail="Failed to create learning plan")
            
        logger.info(f"Enrollment roadmap: {enrollment.roadmap_json}")
        
        # Get first day content
        first_day = enrollment.days.get(1)
        if not first_day:
            raise HTTPException(status_code=500, detail="Failed to generate first day content")
            
        logger.info(f"First day content: {first_day.model_dump()}")
        
        # Get course_id from skill name (same logic as in orchestrator)
        course_id = user_data['skill'].lower().replace(' ', '-')
        
        return PlanResponse(
            course_id=course_id,
            roadmap=enrollment.roadmap_json,
            first_day=first_day.model_dump()
        )
            
    except Exception as e:
        logger.error(f"Error creating learning plan: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
