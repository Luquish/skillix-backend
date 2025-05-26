"""Middleware de autenticación usando Firebase Admin"""

from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth, initialize_app
from typing import Dict, Any

# Inicializar Firebase Admin
initialize_app()

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Dict[str, Any]:
    """Verifica el token de Firebase y retorna los datos del usuario"""
    try:
        # Verificar token
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        
        # Obtener datos adicionales del usuario
        user = auth.get_user(decoded_token["uid"])
        
        return {
            "uid": user.uid,
            "email": user.email,
            "email_verified": user.email_verified,
            "display_name": user.display_name,
            "photo_url": user.photo_url,
            "disabled": user.disabled,
            "created_at": user.user_metadata.creation_timestamp,
            "last_sign_in": user.user_metadata.last_sign_in_timestamp
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Error de autenticación: {str(e)}"
        ) 