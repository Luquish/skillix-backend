"""Aplicación principal de FastAPI"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import onboarding, content, auth

app = FastAPI(
    title="Skillix API",
    description="API para la plataforma de aprendizaje Skillix",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configurar con los dominios permitidos en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar rutas
app.include_router(auth.router)  # Primero auth
app.include_router(onboarding.router)
app.include_router(content.router)

@app.get("/")
async def root():
    """Endpoint de salud"""
    return {
        "status": "ok",
        "service": "skillix-api",
        "version": "1.0.0"
    } 