"""Rutas de la API REST de Skillix"""

from .auth import router as auth
from .content import router as content
from .onboarding import router as onboarding
from .adk_routes import router as adk_routes

__all__ = [
    "auth",         # /api/auth/* - Autenticación
    "content",      # /api/content/* - Contenido del curso
    "onboarding",   # /api/onboarding/* - Proceso inicial
    "adk_routes"    # /api/adk/* - Interacción con agentes
]
