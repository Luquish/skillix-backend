"""Autenticación con Apple para iOS y Android"""

from typing import Dict, Any, Optional
import hashlib
from firebase_admin import auth
from datetime import datetime
from ...db import dataconnect

def hash_nonce(nonce: str) -> str:
    """Genera el hash SHA256 del nonce"""
    return hashlib.sha256(nonce.encode()).hexdigest()

async def verify_apple_token(
    identity_token: str,
    nonce: str,
    user_identifier: str,
    platform: str,
    name: Optional[str] = None
) -> Dict[str, Any]:
    """Verifica el token de Apple y retorna/crea el usuario"""
    try:
        # Verificar token con Firebase incluyendo el nonce
        decoded_token = auth.verify_id_token(
            identity_token,
            check_revoked=True
        )
        
        # Verificar que el nonce en el token coincida con el hash del nonce proporcionado
        if 'nonce' in decoded_token and decoded_token['nonce'] != hash_nonce(nonce):
            raise ValueError("Invalid nonce")
            
        firebase_uid = decoded_token['uid']
        
        # Buscar usuario existente por Apple ID o Firebase UID
        existing_user = await dataconnect.users.find_one(
            where={
                "OR": [
                    {"firebase_uid": firebase_uid},
                    {"apple_user_identifier": user_identifier}
                ]
            }
        )
        
        # Obtener información del usuario de Firebase
        apple_user = auth.get_user(firebase_uid)
        
        user_data = {
            "email": apple_user.email,
            "name": name or apple_user.display_name or "",
            "photo_url": apple_user.photo_url,
            "email_verified": apple_user.email_verified,
            "auth_provider": "APPLE",
            "platform": platform,
            "firebase_uid": firebase_uid,
            "apple_user_identifier": user_identifier,
            "apple_identity_token": identity_token,
            "last_sign_in_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        if existing_user:
            # Actualizar usuario existente
            await dataconnect.users.update(
                where={"id": existing_user["id"]},
                data=user_data
            )
            user_data["id"] = existing_user["id"]
        else:
            # Crear nuevo usuario
            user_data["created_at"] = datetime.utcnow()
            created_user = await dataconnect.users.create(user_data)
            user_data["id"] = created_user["id"]
        
        return {
            "success": True,
            "user": user_data
        }
        
    except ValueError as ve:
        return {
            "success": False,
            "error": str(ve)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        } 