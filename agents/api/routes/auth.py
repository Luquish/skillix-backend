"""Rutas de autenticación"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import secrets
import string

from ..auth.providers.google import verify_google_token
from ..auth.providers.apple import verify_apple_token, hash_nonce

router = APIRouter(prefix="/api/auth", tags=["auth"])

def generate_nonce(length: int = 32) -> str:
    """Genera un nonce aleatorio seguro"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

class GoogleAuthRequest(BaseModel):
    """Modelo para autenticación con Google"""
    id_token: str
    access_token: str
    platform: str

class AppleAuthRequest(BaseModel):
    """Modelo para autenticación con Apple"""
    identity_token: str
    nonce: str
    user_identifier: str
    platform: str
    name: Optional[str] = None

@router.get("/apple/nonce")
async def get_apple_nonce():
    """Genera un nonce para Sign in with Apple"""
    nonce = generate_nonce()
    hashed_nonce = hash_nonce(nonce)
    return {
        "nonce": nonce,
        "hashed_nonce": hashed_nonce
    }

@router.post("/google")
async def google_auth(data: GoogleAuthRequest):
    """Endpoint para autenticación con Google"""
    if data.platform not in ["IOS", "ANDROID"]:
        raise HTTPException(
            status_code=400,
            detail="Platform must be IOS or ANDROID"
        )
    
    result = await verify_google_token(
        id_token=data.id_token,
        access_token=data.access_token,
        platform=data.platform
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=401,
            detail=result["error"]
        )
    
    return result

@router.post("/apple")
async def apple_auth(data: AppleAuthRequest):
    """Endpoint para autenticación con Apple"""
    if data.platform not in ["IOS", "ANDROID"]:
        raise HTTPException(
            status_code=400,
            detail="Platform must be IOS or ANDROID"
        )
    
    result = await verify_apple_token(
        identity_token=data.identity_token,
        nonce=data.nonce,
        user_identifier=data.user_identifier,
        platform=data.platform,
        name=data.name
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=401,
            detail=result["error"]
        )
    
    return result 