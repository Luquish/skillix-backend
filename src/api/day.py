from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.agentes.orchestrator import generate_next_day_content
from src.services.storage_service import StorageService, EnrollmentDay
from src.config import settings
from typing import Optional
from datetime import datetime

router = APIRouter()
storage = StorageService(settings.STORAGE_PATH)

class DayRequest(BaseModel):
    uid: str
    course_id: str
    current_day: int
    completed: bool
    score: Optional[float] = None
    feedback: Optional[str] = None

class DayResponse(BaseModel):
    day_number: int
    content: dict
    is_last_day: bool

@router.post("/day", response_model=DayResponse)
async def get_next_day(request: DayRequest) -> DayResponse:
    """Gets or generates the next day's content"""
    try:
        # Verify current day completion
        if not request.completed:
            raise HTTPException(
                status_code=400,
                detail="Current day must be completed before getting next day"
            )
            
        # Update current day completion status
        current_day = storage.get_day_content(
            request.uid,
            request.course_id,
            request.current_day
        )
        
        if current_day:
            current_day.score = request.score
            current_day.feedback = request.feedback
            current_day.completed_at = datetime.now(datetime.UTC)
            
            storage.save_day_content(
                request.uid,
                request.course_id,
                request.current_day,
                current_day
            )
        
        # Generate next day content
        success = await generate_next_day_content(request.uid, request.course_id)
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate next day content"
            )
            
        # Get enrollment to check if it's the last day
        enrollment = storage.get_enrollment(request.uid, request.course_id)
        if not enrollment:
            raise HTTPException(
                status_code=404,
                detail="Enrollment not found"
            )
            
        next_day_number = request.current_day + 1
        next_day = storage.get_day_content(
            request.uid,
            request.course_id,
            next_day_number
        )
        
        if not next_day:
            raise HTTPException(
                status_code=404,
                detail="Next day content not found"
            )
            
        # Check if this is the last day
        total_days = sum(len(section["days"]) for section in enrollment.roadmap_json["sections"])
        is_last_day = next_day_number >= total_days
            
        return DayResponse(
            day_number=next_day_number,
            content=next_day.model_dump(),
            is_last_day=is_last_day
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
