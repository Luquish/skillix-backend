from fastapi import APIRouter, HTTPException, status
from ..schemas.user import UserCreate, UserLogin, User
import json
import os
from pathlib import Path
from datetime import datetime
from passlib.context import CryptContext

router = APIRouter()
USERS_DIR = Path("storage/users")

# Configuración del hash de contraseña
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Genera un hash de la contraseña"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña coincide con el hash"""
    return pwd_context.verify(plain_password, hashed_password)

def save_user(user_data: dict):
    """Guarda los datos básicos del usuario"""
    email = user_data["email"]
    user_dir = USERS_DIR / email
    user_dir.mkdir(parents=True, exist_ok=True)
    
    # Crear estructura de directorios
    (user_dir / "courses").mkdir(exist_ok=True)
    
    # Guardar datos básicos del usuario
    user_file = user_dir / "user.json"
    with open(user_file, "w") as f:
        json.dump(user_data, f, indent=2, default=str)

def get_user_by_email(email: str) -> dict:
    """Obtiene los datos del usuario por email"""
    user_dir = USERS_DIR / email
    user_file = user_dir / "user.json"
    
    if not user_file.exists():
        return None
        
    with open(user_file) as f:
        return json.load(f)

@router.post("/signup", response_model=User)
async def create_user(user: UserCreate):
    if get_user_by_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Crear datos básicos del usuario
    user_data = {
        "email": user.email,
        "name": user.name,
        "password_hash": get_password_hash(user.password),
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    save_user(user_data)
    return user_data

@router.post("/login", response_model=User)
async def login(user_credentials: UserLogin):
    user = get_user_by_email(user_credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not verify_password(user_credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    return user

@router.get("/me", response_model=User)
async def get_current_user(email: str):
    """Obtiene los datos del usuario actual"""
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user 