"""Rutas específicas para Google ADK"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from ...skillix_agents.orchestrator import orchestrator_agent
from google.adk.agents import Runner
from ..auth.middleware import get_current_user
from ..db import dataconnect

router = APIRouter(prefix="/adk", tags=["adk"])

class SessionState(BaseModel):
    """Estado de la sesión"""
    key: str
    value: Any

class SessionCreate(BaseModel):
    """Datos para crear una sesión"""
    courseId: str
    state: Optional[Dict[str, Any]] = None

class RunRequest(BaseModel):
    """Solicitud para ejecutar el agente"""
    courseId: str
    newMessage: Dict[str, Any]
    streaming: Optional[bool] = False

@router.post("/sessions")
async def create_or_get_session(
    data: SessionCreate,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Crea o recupera una sesión ADK para un curso específico"""
    try:
        # Crear o recuperar sesión en Data Connect
        session = await dataconnect.adk_sessions.upsert(
            where={
                "userId": user["id"],
                "courseId": data.courseId
            },
            data={
                "userId": user["id"],
                "courseId": data.courseId,
                "state": data.state or {},
                "lastUpdateTime": datetime.utcnow()
            }
        )
        
        return {
            "id": session.id,
            "courseId": data.courseId,
            "userId": user["id"],
            "state": session.state,
            "events": [],
            "lastUpdateTime": session.lastUpdateTime
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creando/recuperando sesión: {str(e)}"
        )

@router.post("/run")
async def run_agent(
    request: RunRequest,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Ejecuta el agente y retorna todos los eventos juntos"""
    try:
        # Obtener sesión existente para el curso
        session = await dataconnect.adk_sessions.find_one(
            where={
                "userId": user["id"],
                "courseId": request.courseId
            }
        )
        
        if not session:
            # Si no existe, crear una nueva
            session = await dataconnect.adk_sessions.create({
                "userId": user["id"],
                "courseId": request.courseId,
                "state": {},
                "lastUpdateTime": datetime.utcnow()
            })
            
        # Ejecutar agente
        result = await Runner.run(
            orchestrator_agent,
            [
                {
                    "role": "user",
                    "content": request.newMessage["parts"][0]["text"]
                }
            ]
        )
        
        # Guardar mensaje del usuario
        await dataconnect.adk_messages.create({
            "sessionId": session.id,
            "role": "user",
            "content": request.newMessage
        })
        
        # Guardar respuesta del agente
        await dataconnect.adk_messages.create({
            "sessionId": session.id,
            "role": "assistant",
            "content": result.final_response
        })
        
        # Actualizar estado de la sesión
        await dataconnect.adk_sessions.update(
            where={"id": session.id},
            data={
                "lastUpdateTime": datetime.utcnow()
            }
        )
        
        return result.events
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error ejecutando agente: {str(e)}"
        )

@router.post("/run_sse")
async def run_agent_streaming(
    request: RunRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Ejecuta el agente con streaming de eventos"""
    try:
        # Obtener sesión existente para el curso
        session = await dataconnect.adk_sessions.find_one(
            where={
                "userId": user["id"],
                "courseId": request.courseId
            }
        )
        
        if not session:
            # Si no existe, crear una nueva
            session = await dataconnect.adk_sessions.create({
                "userId": user["id"],
                "courseId": request.courseId,
                "state": {},
                "lastUpdateTime": datetime.utcnow()
            })
            
        async def event_generator():
            result = await Runner.run(
                orchestrator_agent,
                [
                    {
                        "role": "user",
                        "content": request.newMessage["parts"][0]["text"]
                    }
                ],
                streaming=request.streaming
            )
            
            # Guardar mensaje del usuario
            await dataconnect.adk_messages.create({
                "sessionId": session.id,
                "role": "user",
                "content": request.newMessage
            })
            
            accumulated_response = ""
            for event in result.events:
                accumulated_response += event.get("content", {}).get("text", "")
                yield f"data: {event}\n\n"
            
            # Guardar respuesta completa del agente
            await dataconnect.adk_messages.create({
                "sessionId": session.id,
                "role": "assistant",
                "content": {"text": accumulated_response}
            })
            
            # Actualizar estado de la sesión
            await dataconnect.adk_sessions.update(
                where={"id": session.id},
                data={
                    "lastUpdateTime": datetime.utcnow()
                }
            )
                
        return event_generator()
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error ejecutando agente: {str(e)}"
        ) 