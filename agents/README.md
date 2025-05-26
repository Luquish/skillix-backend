# Skillix Agents

Sistema de agentes de IA para la generación y adaptación de contenido educativo personalizado.

## Estructura

```
agents/
├── api/                    # API REST con FastAPI
│   ├── auth/              # Autenticación con Firebase
│   │   ├── providers/     # Proveedores de autenticación
│   │   │   ├── apple.py   # Sign in with Apple
│   │   │   └── google.py  # Sign in with Google
│   │   └── middleware.py  # Middleware de autenticación Firebase
│   ├── routes/           # Endpoints de la API
│   │   ├── auth.py      # Rutas de autenticación
│   │   ├── onboarding.py # Rutas de onboarding
│   │   └── content.py    # Rutas de contenido
│   └── main.py          # Configuración principal de FastAPI
└── skillix_agents/      # Lógica de negocio y agentes IA
    ├── orchestrator.py  # Orquestador de agentes
    ├── content/        # Generación de contenido
    └── learning/       # Lógica de aprendizaje
```

## Instalación

1. **Entorno Virtual**:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
.\venv\Scripts\activate  # Windows
```

2. **Dependencias**:
```bash
pip install -r requirements.txt
```

## Variables de Entorno

Crear archivo `.env` en la raíz de `agents/`:

```bash
# Firebase
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_PRIVATE_KEY=tu-clave
FIREBASE_CLIENT_EMAIL=tu-email

# OpenAI
OPENAI_API_KEY=tu-api-key
OPENAI_MODEL=gpt-4

# Auth Providers
GOOGLE_CLIENT_ID=tu-client-id
APPLE_TEAM_ID=tu-team-id
APPLE_KEY_ID=tu-key-id
APPLE_PRIVATE_KEY=tu-private-key

# FastAPI
PORT=8000
HOST=0.0.0.0
```

## Desarrollo

1. **Iniciar servidor**:
```bash
uvicorn api.main:app --reload --port $PORT --host $HOST
```

2. **Tests**:
```bash
pytest
```

## API REST

### Autenticación

```python
# Obtener nonce para Apple Sign In
GET /api/auth/apple/nonce
- Genera nonce seguro
- Retorna nonce y hash

# Autenticación con Google
POST /api/auth/google
{
  "id_token": string,
  "access_token": string,
  "platform": "IOS" | "ANDROID"
}

# Autenticación con Apple
POST /api/auth/apple
{
  "identity_token": string,
  "nonce": string,
  "user_identifier": string,
  "platform": "IOS" | "ANDROID",
  "name": string | null
}
```

### Onboarding

```python
# Completar onboarding
POST /api/onboarding/complete
- Recibe preferencias
- Genera plan inicial
- Retorna primer día
```

### Contenido

```python
# Siguiente día
POST /api/content/next-day
- Genera siguiente día
- Adapta dificultad
- Actualiza progreso

# Progreso
GET /api/progress/{userId}
- Estadísticas
- Estado actual
- Recomendaciones
```

## Agentes Disponibles

### 1. Onboarding Agent
- Analiza preferencias del usuario
- Genera plan de aprendizaje personalizado
- Adapta contenido según nivel

### 2. Content Agent
- Genera contenido diario
- Adapta dificultad según progreso
- Incorpora feedback del usuario

### 3. Learning Agent
- Monitorea progreso
- Ajusta plan según rendimiento
- Genera recomendaciones

## Middleware de Autenticación

El middleware de Firebase verifica los tokens y proporciona:
- Validación de tokens JWT
- Datos del usuario autenticado
- Manejo de errores de autenticación

```python
# Ejemplo de uso en rutas
from api.auth.middleware import get_current_user

@router.get("/protected")
async def protected_route(user = Depends(get_current_user)):
    return {"message": f"Hello {user['email']}"}
```

## Integración con Data Connect

Los agentes consumen y actualizan datos a través de Data Connect:

1. **Lectura**:
- Preferencias de usuario
- Progreso actual
- Historial de aprendizaje

2. **Escritura**:
- Planes generados
- Contenido diario
- Métricas de progreso

## Docker

```bash
# Build
docker build -t skillix-agents .

# Run
docker run -p 8000:8000 \
  --env-file .env \
  skillix-agents
``` 