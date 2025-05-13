from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "email": "usuario@ejemplo.com",
                "name": "Usuario Ejemplo",
                "is_active": True,
                "created_at": "2024-05-13T21:54:33.968875",
                "updated_at": "2024-05-13T21:54:33.968875"
            }
        } 