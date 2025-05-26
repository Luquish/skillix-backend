"""Aplicación principal de FastAPI"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, Optional
import logging

from .routes import onboarding, content, auth, adk_routes
from skillix_agents import (
    SkillixTeamRunner,
    session_service,
    get_dataconnect_client
)

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Skillix API",
    description="API para la plataforma de aprendizaje Skillix con sistema multi-agente",
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

# Inicializar componentes
team_runner = SkillixTeamRunner(session_service)
data_connect = get_dataconnect_client()

# Registrar rutas
app.include_router(auth.router)  # Primero auth
app.include_router(adk_routes.router)  # Rutas ADK
app.include_router(onboarding.router)
app.include_router(content.router)

@app.get("/")
async def root():
    """Endpoint de salud"""
    return {
        "status": "ok",
        "service": "skillix-api",
        "version": "1.0.0",
        "components": {
            "multi_agent": "active",
            "data_connect": "ready"
        }
    }

# Nuevos endpoints para interacción directa con agentes
@app.post("/api/agents/process")
async def process_user_request(
    message: str,
    firebase_uid: str,
    session_id: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None
):
    """Procesa una solicitud del usuario usando el sistema multi-agente"""
    try:
        result = await team_runner.process_user_request(
            user_message=message,
            firebase_uid=firebase_uid,
            session_id=session_id,
            context=context
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=result["error"]
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error procesando solicitud: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error interno procesando la solicitud"
        )

@app.get("/api/agents/session/{firebase_uid}/{session_id}")
async def get_session_state(firebase_uid: str, session_id: str):
    """Obtiene el estado de una sesión del sistema multi-agente"""
    try:
        state = await team_runner.get_session_state(
            firebase_uid=firebase_uid,
            session_id=session_id
        )
        
        if not state["exists"]:
            raise HTTPException(
                status_code=404,
                detail="Sesión no encontrada"
            )
        
        return state
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo estado de sesión: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error interno obteniendo estado de sesión"
        )

# Middleware para inyectar dependencias
def get_team_runner():
    """Dependency injection para el team runner"""
    return team_runner

def get_data_connect():
    """Dependency injection para Data Connect"""
    return data_connect

# Hacer disponibles las dependencias para las rutas
app.dependency_overrides[get_team_runner] = get_team_runner
app.dependency_overrides[get_data_connect] = get_data_connect 