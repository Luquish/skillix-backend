from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import plan, day, auth

app = FastAPI(
    title="Skillix API",
    description="API para la plataforma de aprendizaje personalizado Skillix",
    version="1.0.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar los orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(plan.router, prefix="/api", tags=["plan"])
app.include_router(day.router, prefix="/api", tags=["day"])

@app.get("/")
async def root():
    return {"message": "Bienvenido a la API de Skillix"}