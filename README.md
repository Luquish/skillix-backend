# Skillix Backend

Backend para la plataforma de aprendizaje personalizado Skillix, que combina FastAPI, Firebase Data Connect y agentes de IA para crear una experiencia de aprendizaje adaptativa.

## Arquitectura

El proyecto está dividido en dos componentes principales:

### 1. Agentes de IA (Python/FastAPI)

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

#### Responsabilidades:
- Generación de contenido personalizado con IA
- Orquestación de agentes de aprendizaje
- API REST para interacción con el frontend
- Autenticación con Firebase (Google y Apple Sign In)

### 2. Data Connect (Base de Datos y SDK)

```
dataconnect/
├── schema/                    # Modelos de datos
│   ├── enums.gql             # Enumeraciones del sistema
│   ├── user.gql              # Esquema de usuarios
│   ├── learning.gql          # Esquema de aprendizaje
│   ├── schema.gql            # Esquema principal
│   ├── user.yaml             # Configuración de usuarios
│   ├── learning_plans.yaml   # Configuración de planes
│   └── daily_content.yaml    # Configuración de contenido
├── connector/                # Operaciones de datos
│   ├── queries.gql           # Consultas GraphQL
│   ├── mutations.gql         # Mutaciones GraphQL
│   └── connector.yaml        # Configuración del SDK
└── dataconnect.yaml          # Configuración principal
```

#### Responsabilidades:
- Persistencia de datos en PostgreSQL
- Generación automática de SDK tipado
- Reglas de autorización y seguridad
- Integración con Firebase y TanStack Query

## Tecnologías Principales

### Backend (Python)
- FastAPI: Framework web moderno y rápido
- Firebase Admin: Autenticación y autorización
- OpenAI: Generación de contenido con IA
- Pydantic: Validación de datos

### Data Connect
- PostgreSQL: Base de datos relacional
- GraphQL: Lenguaje de consulta
- Firebase Data Connect: ORM y generación de SDK
- TanStack Query: Gestión de estado y caché

## Configuración del Entorno

1. **Variables de Entorno**:
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

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/skillix
```

2. **Instalación**:
```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/skillix-backend.git
cd skillix-backend

# Instalar dependencias Python
cd agents
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Instalar Firebase Tools
npm install -g firebase-tools
firebase login
```

## Desarrollo

### Backend Python (agents/)
Ver [agents/README.md](agents/README.md) para más detalles.

1. **Iniciar el servidor FastAPI**:
```bash
cd agents
uvicorn api.main:app --reload
```

2. **Ejecutar tests**:
```bash
pytest
```

### Data Connect (dataconnect/)
Ver [dataconnect/README.md](dataconnect/README.md) para más detalles.

1. **Generar SDK**:
```bash
cd dataconnect
firebase dataconnect:sdk:generate
```

2. **Modo desarrollo**:
```bash
firebase dataconnect:sdk:generate --watch
```

3. **Emulador**:
```bash
firebase emulators:start
```

## Flujo de Datos

1. **Autenticación**:
   ```mermaid
   graph LR
   A[Frontend] --> B[Firebase Auth]
   B --> C[Google/Apple]
   C --> D[Token JWT]
   D --> E[FastAPI]
   E --> F[Middleware]
   ```

2. **Onboarding**:
   ```mermaid
   graph LR
   A[Usuario] --> B[Auth]
   B --> C[Preferencias]
   C --> D[Agente IA]
   D --> E[Plan Personal]
   E --> F[Data Connect]
   ```

3. **Generación de Contenido**:
   ```mermaid
   graph LR
   A[Plan] --> B[Orquestador]
   B --> C[Agentes IA]
   C --> D[Contenido]
   D --> E[Data Connect]
   ```

## Despliegue

1. **Backend Python**:
```bash
# Build imagen Docker
cd agents
docker build -t skillix-agents .

# Deploy a Cloud Run
gcloud run deploy skillix-agents --image skillix-agents
```

2. **Data Connect**:
```bash
cd dataconnect
firebase deploy --only dataconnect
```

## Documentación Detallada

- [Agentes y API (agents/README.md)](agents/README.md)
  - Configuración de autenticación
  - Endpoints disponibles
  - Agentes de IA
  - Middleware y seguridad

- [Data Connect (dataconnect/README.md)](dataconnect/README.md)
  - Esquemas GraphQL
  - Configuración del SDK
  - Queries y Mutations
  - Reglas de seguridad

## Contribución

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/amazing`)
3. Commit cambios (`git commit -m 'Add feature'`)
4. Push a la rama (`git push origin feature/amazing`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. 