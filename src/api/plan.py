from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from src.agentes.orchestrator import orchestrate_course_creation
from src.services.storage_service import Enrollment, StorageService, UserPreferences
from ..schemas.user import User
import logging
from pathlib import Path
import json
from datetime import datetime, timezone
from src.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()
storage = StorageService(settings.STORAGE_PATH)

class PlanRequest(BaseModel):
    email: EmailStr
    name: str
    skill: str
    experience: str
    motivation: str
    time: str
    learning_style: str
    goal: str

class PlanResponse(BaseModel):
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
    """Creates a personalized learning plan based on user preferences"""
    try:
        # Crear preferencias del usuario usando el modelo
        preferences = UserPreferences(
            name=request.name,
            skill=request.skill,
            experience=request.experience,
            motivation=request.motivation,
            time=request.time,
            learning_style=request.learning_style,
            goal=request.goal,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        # Crear el curso con todas las preferencias
        user_data = preferences.model_dump()
        enrollment = await orchestrate_course_creation(user_data, request.email)
        
        if not enrollment:
            raise HTTPException(status_code=500, detail="Failed to create course")
            
        logger.info(f"Enrollment roadmap: {enrollment.roadmap_json}")
        
        # Get first day content
        first_day = storage.get_day_content(
            request.email,
            request.skill.lower().replace(' ', '-'),
            1
        )
        
        if not first_day:
            raise HTTPException(status_code=404, detail="First day not found")
            
        logger.info(f"First day content: {first_day.model_dump()}")
            
        return PlanResponse(
            roadmap=enrollment.roadmap_json,
            first_day=first_day.model_dump()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
