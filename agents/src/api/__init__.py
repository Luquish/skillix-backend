"""API REST para Skillix Backend"""

from .routes import auth, content, onboarding, adk_routes
from .middleware import get_current_user, verify_token
from .providers import google_auth, apple_auth

__all__ = [
    # Rutas principales
    "auth",
    "content",
    "onboarding",
    "adk_routes",
    
    # Middleware de autenticación
    "get_current_user",
    "verify_token",
    
    # Proveedores de autenticación
    "google_auth",
    "apple_auth"
]
