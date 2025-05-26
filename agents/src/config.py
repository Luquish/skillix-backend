"""Configuración centralizada para Skillix Agents"""

import os
from typing import Dict, Any
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

class Settings(BaseSettings):
    """Configuración global de la aplicación"""
    
    # Firebase y Data Connect
    firebase_project_id: str = os.getenv("FIREBASE_PROJECT_ID", "")
    firebase_region: str = os.getenv("FIREBASE_REGION", "us-central1")
    firebase_service_account_path: str = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "")
    dataconnect_api_endpoint: str = os.getenv("DATACONNECT_API_ENDPOINT", "")
    dataconnect_api_key: str = os.getenv("DATACONNECT_API_KEY", "")
    dataconnect_service_id: str = os.getenv("DATACONNECT_SERVICE_ID", "skillix-dataconnect")
    
    # Node.js Bridge para Data Connect
    dataconnect_bridge_url: str = os.getenv("DATACONNECT_BRIDGE_URL", "http://localhost:3000")
    dataconnect_bridge_api_key: str = os.getenv("DATACONNECT_BRIDGE_API_KEY", "")
    
    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4-mini")
    
    # Google AI (Gemini)
    google_api_key: str = os.getenv("GOOGLE_API_KEY", "")
    google_model: str = os.getenv("GOOGLE_MODEL", "gemini-2.0-flash")
    
    # Configuración del modelo
    model_config: Dict[str, Any] = {
        "temperature": 0.7,
        "max_tokens": 4000,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    }
    
    # Configuración de la aplicación
    app_name: str = "skillix"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    debug_mode: bool = os.getenv("DEBUG_MODE", "false").lower() == "true"
    
    class Config:
        """Configuración de Pydantic"""
        env_file = ".env"
        case_sensitive = False
        extra = "allow"

# Instancia global de configuración
settings = Settings()

# Configurar logging
import logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)