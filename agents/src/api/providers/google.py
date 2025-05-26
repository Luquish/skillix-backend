"""Autenticación con Google para iOS y Android"""

from typing import Dict, Any, Optional
from firebase_admin import auth
from datetime import datetime
from ...db import dataconnect

async def verify_google_token(id_token: str, access_token: str, platform: str) -> Dict[str, Any]:
    """Verifica el token de Google y retorna/crea el usuario"""
    try:
        # Verificar token con Firebase
        decoded_token = auth.verify_id_token(id_token)
        firebase_uid = decoded_token['uid']
        
        # Buscar usuario existente
        existing_user = await dataconnect.users.find_one(
            where={"firebase_uid": firebase_uid}
        )
        
        # Obtener información del usuario de Google
        google_user = auth.get_user(firebase_uid)
        
        user_data = {
            "email": google_user.email,
            "name": google_user.display_name or "",
            "photo_url": google_user.photo_url,
            "email_verified": google_user.email_verified,
            "auth_provider": "GOOGLE",
            "platform": platform,
            "firebase_uid": firebase_uid,
            "google_id_token": id_token,
            "google_access_token": access_token,
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
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        } 