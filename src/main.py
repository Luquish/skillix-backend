from fastapi import FastAPI
from src.api import plan, day

app = FastAPI(
    title="Learning Journey API",
    description="API for generating personalized learning plans and daily content",
    version="1.0.0"
)

app.include_router(plan.router, tags=["Planning"])
app.include_router(day.router, tags=["Daily Content"])