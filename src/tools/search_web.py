"""Tool for performing web searches using Brave Search API."""
from typing import List
from pydantic import BaseModel, Field
import aiohttp
from config import settings

# Constantes de la API
BRAVE_SEARCH_API_URL = "https://api.search.brave.com/res/v1/web/search"

class SearchResult(BaseModel):
    """Estructura de un resultado de búsqueda."""
    title: str
    description: str
    url: str

class SearchWebInput(BaseModel):
    """Parámetros de entrada para la búsqueda web."""
    query: str = Field(..., description="Texto a buscar en la web")
    max_results: int = Field(default=10, description="Número máximo de resultados a retornar")
    language: str = Field(default="es", description="Código de idioma para la búsqueda (ej: es, en)")

class SearchWebOutput(BaseModel):
    """Resultado de la búsqueda web."""
    results: List[SearchResult] = Field(..., description="Lista de resultados de búsqueda")

async def search_web(input_data: SearchWebInput) -> SearchWebOutput:
    """
    Realiza una búsqueda web usando Brave Search API.
    
    Args:
        input_data: Parámetros de búsqueda
        
    Returns:
        Resultados de la búsqueda web
    """
    try:
        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": settings.BRAVE_API_KEY
        }
        
        params = {
            "q": input_data.query,
            "count": input_data.max_results,
            "language": input_data.language
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                BRAVE_SEARCH_API_URL,
                headers=headers,
                params=params
            ) as response:
                if response.status != 200:
                    print(f"Error from Brave Search API: {response.status}")
                    return SearchWebOutput(results=[])
                    
                data = await response.json()
                
                # Procesamos los resultados web
                search_results = []
                for result in data.get("web", {}).get("results", []):
                    search_results.append(
                        SearchResult(
                            title=result.get("title", ""),
                            description=result.get("description", ""),
                            url=result.get("url", "")
                        )
                    )
                
                return SearchWebOutput(results=search_results)
                
    except Exception as e:
        print(f"Error performing web search: {e}")
        return SearchWebOutput(results=[]) 