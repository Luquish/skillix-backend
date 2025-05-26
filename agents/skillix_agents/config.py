"""Configuración de modelos y clientes para Skillix Agents"""

import os
from dotenv import load_dotenv
from google.adk.models.litellm import LiteLlm

# Cargar variables de entorno
load_dotenv()

# Configurar LiteLLM para usar GPT-4
openai_model = LiteLlm(
    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),  # Usar el modelo definido en .env
    api_key=os.getenv("OPENAI_API_KEY"),  # API key de OpenAI
    config={
        "temperature": 0.7,
        "max_tokens": 4000,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    }
)