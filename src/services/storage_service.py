import json
import os
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from src.schemas.course import Block
from pydantic import BaseModel, ConfigDict

class UserPreferences(BaseModel):
    """Modelo para las preferencias del usuario guardadas durante el onboarding"""
    name: str
    skill: str
    experience: str
    motivation: str
    time: str
    learning_style: str
    goal: str
    created_at: datetime = datetime.now(timezone.utc)
    updated_at: datetime = datetime.now(timezone.utc)

    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )

class UserProfile(BaseModel):
    name: str
    email: str
    preferences: Dict[str, Any]
    auth_provider: str

class EnrollmentDay(BaseModel):
    title: str
    is_action_day: bool
    blocks: list[Block]
    action_task: Optional[str] = None
    score: Optional[float] = None
    feedback: Optional[str] = None
    completed_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )

class Enrollment(BaseModel):
    roadmap_json: dict
    last_generated_day: int = 0
    streak: int = 0
    xp_total: int = 0
    created_at: datetime
    updated_at: datetime
    days: Dict[int, EnrollmentDay] = {}
    
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )

class StorageService:
    def __init__(self, base_path: str):
        self.base_path = base_path
        self.courses_path = os.path.join(base_path, "courses")
        self.users_path = os.path.join(base_path, "users")
        
        # Crear directorios base si no existen
        os.makedirs(self.base_path, exist_ok=True)
        os.makedirs(self.courses_path, exist_ok=True)
        os.makedirs(self.users_path, exist_ok=True)

    def _ensure_dirs(self, path: str):
        """Ensures all directories in path exist"""
        os.makedirs(path, exist_ok=True)

    def save_user_preferences(self, uid: str, preferences: UserPreferences):
        """Guarda las preferencias del usuario"""
        path = os.path.join(self.users_path, uid, "preferences.json")
        self._ensure_dirs(os.path.dirname(path))
        with open(path, 'w') as f:
            json_data = preferences.model_dump_json(indent=2)
            f.write(json_data)

    def get_user_preferences(self, uid: str) -> Optional[UserPreferences]:
        """Obtiene las preferencias del usuario"""
        path = os.path.join(self.users_path, uid, "preferences.json")
        if not os.path.exists(path):
            return None
        with open(path, 'r') as f:
            return UserPreferences.model_validate(json.load(f))

    def save_user_profile(self, uid: str, profile: UserProfile):
        """Saves user profile"""
        path = os.path.join(self.users_path, uid, "profile")
        self._ensure_dirs(os.path.dirname(path))
        with open(path, 'w') as f:
            json_data = profile.model_dump_json(indent=2)
            f.write(json_data)

    def get_user_profile(self, uid: str) -> Optional[UserProfile]:
        """Gets user profile"""
        path = os.path.join(self.users_path, uid, "profile")
        if not os.path.exists(path):
            return None
        with open(path, 'r') as f:
            return UserProfile.model_validate(json.load(f))

    def create_enrollment(self, uid: str, course_id: str, roadmap: dict) -> Enrollment:
        """Creates new course enrollment"""
        enrollment = Enrollment(
            roadmap_json=roadmap,
            last_generated_day=0,
            streak=0,
            xp_total=0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            days={}
        )
        
        path = os.path.join(self.users_path, uid, "enrollments", course_id)
        self._ensure_dirs(path)
        self._save_enrollment(path, enrollment)
        return enrollment

    def save_day_content(self, uid: str, course_id: str, day_number: int, content: EnrollmentDay):
        """Saves content for a specific day"""
        enrollment_path = os.path.join(self.users_path, uid, "enrollments", course_id)
        day_path = os.path.join(enrollment_path, "days", str(day_number))
        self._ensure_dirs(os.path.dirname(day_path))
        with open(day_path, 'w') as f:
            json_data = content.model_dump_json(indent=2)
            f.write(json_data)

    def get_day_content(self, uid: str, course_id: str, day_number: int) -> Optional[EnrollmentDay]:
        """Gets content for a specific day"""
        path = os.path.join(self.users_path, uid, "enrollments", course_id, "days", str(day_number))
        if not os.path.exists(path):
            return None
        with open(path, 'r') as f:
            return EnrollmentDay.model_validate(json.load(f))

    def _save_enrollment(self, path: str, enrollment: Enrollment):
        """Saves enrollment data"""
        with open(os.path.join(path, "enrollment.json"), 'w') as f:
            json_data = enrollment.model_dump_json(indent=2)
            f.write(json_data)

    def get_enrollment(self, uid: str, course_id: str) -> Optional[Enrollment]:
        """Gets enrollment data"""
        path = os.path.join(self.users_path, uid, "enrollments", course_id, "enrollment.json")
        if not os.path.exists(path):
            return None
        with open(path, 'r') as f:
            return Enrollment.model_validate(json.load(f))

    def update_enrollment(self, uid: str, course_id: str, enrollment: Enrollment):
        """Updates enrollment data"""
        path = os.path.join(self.users_path, uid, "enrollments", course_id)
        self._save_enrollment(path, enrollment)
