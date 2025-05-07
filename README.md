# skillix-backend

Estructura del proyecto para FastAPI desplegado en Cloud Run.

## Estructura de carpetas

- `Dockerfile`: Imagen para despliegue
- `cloudbuild.yaml`: Configuración de Cloud Build
- `src/`: Código fuente principal
  - `main.py`: Punto de entrada FastAPI
  - `agents/`: Lógica de agentes
  - `tools/`: Herramientas auxiliares
  - `schemas/`: Esquemas Pydantic
  - `services/`: Servicios externos (Firestore, Storage, PubSub)
  - `utils/`: Utilidades y helpers
- `tests/`: Pruebas unitarias e integración 