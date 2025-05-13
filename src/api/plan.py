from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from src.agentes.orchestrator import orchestrate_course_creation
from src.services.storage_service import Enrollment
from ..schemas.user import User
import logging
from pathlib import Path
import json
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

class PlanRequest(BaseModel):
    email: EmailStr
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

def get_current_user(email: str) -> User:
    """Obtiene el usuario actual por su email"""
    user_dir = Path("storage/users") / email
    user_file = user_dir / "user.json"
    
    if not user_file.exists():
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials"
        )
        
    with open(user_file) as f:
        user_data = json.load(f)
        
    return User(**user_data)

def save_course_data(email: str, course_id: str, preferences: dict, roadmap: dict, first_day: dict):
    """Guarda los datos del curso en la estructura correcta"""
    user_dir = Path("storage/users") / email
    course_dir = user_dir / "courses" / course_id
    course_dir.mkdir(parents=True, exist_ok=True)
    
    # Crear directorio para los días
    days_dir = course_dir / "days"
    days_dir.mkdir(exist_ok=True)
    
    # Guardar preferencias del curso
    with open(course_dir / "preferences.json", "w") as f:
        json.dump(preferences, f, indent=2, default=str)
    
    # Guardar roadmap
    with open(course_dir / "roadmap.json", "w") as f:
        json.dump(roadmap, f, indent=2, default=str)
    
    # Guardar primer día
    with open(days_dir / "day_1.json", "w") as f:
        json.dump(first_day, f, indent=2, default=str)

@router.post("/plan", response_model=PlanResponse)
async def create_learning_plan(request: PlanRequest) -> PlanResponse:
    """Creates a new learning plan and generates first day content"""
    try:
        user = get_current_user(request.email)
        
        # Get course_id from skill name
        course_id = request.skill.lower().replace(' ', '-')
        
        # Crear el plan de aprendizaje
        plan_data = {
            "name": user.name,
            "skill": request.skill,
            "experience": request.experience,
            "motivation": request.motivation,
            "time": request.time,
            "learning_style": request.learning_style,
            "goal": request.goal
        }
        
        enrollment = await orchestrate_course_creation(plan_data, request.email)
        
        if not enrollment:
            raise HTTPException(status_code=500, detail="Failed to create learning plan")
            
        logger.info(f"Enrollment roadmap: {enrollment.roadmap_json}")
        
        # Get first day content
        first_day = enrollment.days.get(1)
        if not first_day:
            raise HTTPException(status_code=500, detail="Failed to generate first day content")
            
        logger.info(f"First day content: {first_day.model_dump()}")
        
        # Guardar datos del curso
        preferences = {
            "experience_level": request.experience,
            "available_time": request.time,
            "learning_style": request.learning_style,
            "goals": [request.goal],
            "completed_onboarding": True,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        save_course_data(
            email=request.email,
            course_id=course_id,
            preferences=preferences,
            roadmap=enrollment.roadmap_json,
            first_day=first_day.model_dump()
        )
        
        return PlanResponse(
            course_id=course_id,
            roadmap=enrollment.roadmap_json,
            first_day=first_day.model_dump()
        )
            
    except Exception as e:
        logger.error(f"Error creating learning plan: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
