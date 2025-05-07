"""Service for managing vector index updates."""
from typing import Dict, Any
from openai import OpenAI
from config import settings
from services.gcp_clients import vertex_client
from schemas.course import CourseDoc

class IndexService:
    def __init__(self):
        self._openai = OpenAI(api_key=settings.OPENAI_API_KEY)
        self._vertex = vertex_client()
    
    def _generate_course_embedding(self, course: CourseDoc) -> list[float]:
        """Generate embedding for a course using its key content."""
        # Combinamos información relevante del curso para generar el embedding
        content_for_embedding = f"""
        Título: {course.title}
        Descripción: {course.description}
        Nivel: {course.level}
        Tags: {', '.join(course.tags)}
        Contenido: {' '.join(str(block) for block in course.blocks)}
        """
        
        resp = self._openai.embeddings.create(
            model="text-embedding-3-small",
            input=content_for_embedding
        )
        return resp.data[0].embedding

    async def add_course_to_index(self, course: CourseDoc) -> bool:
        """Add a new course to the vector index."""
        try:
            if not settings.INDEX_ENDPOINT:
                print(f"Warning: INDEX_ENDPOINT not configured in {settings.PROJECT_ID}")
                return False

            # Generamos el embedding del curso
            course_vector = self._generate_course_embedding(course)
            
            # Preparamos el datapoint para el índice
            datapoint = {
                "id": course.courseId,
                "vector": course_vector,
                "datapoint_id": course.dict()  # Almacenamos el curso completo
            }
            
            # Añadimos al índice
            self._vertex.upsert_datapoints(
                index_endpoint=settings.INDEX_ENDPOINT,
                deployed_index_id=settings.DEPLOYED_INDEX_ID,
                datapoints=[datapoint]
            )
            
            return True
            
        except Exception as e:
            print(f"Error adding course to index in {settings.PROJECT_ID}: {e}")
            return False
    
    async def update_course_in_index(self, course: CourseDoc) -> bool:
        """Update an existing course in the vector index."""
        return await self.add_course_to_index(course)
    
    async def remove_course_from_index(self, course_id: str) -> bool:
        """Remove a course from the vector index."""
        try:
            if not settings.INDEX_ENDPOINT:
                print(f"Warning: INDEX_ENDPOINT not configured in {settings.PROJECT_ID}")
                return False

            self._vertex.remove_datapoints(
                index_endpoint=settings.INDEX_ENDPOINT,
                deployed_index_id=settings.DEPLOYED_INDEX_ID,
                datapoint_ids=[course_id]
            )
            return True
            
        except Exception as e:
            print(f"Error removing course from index in {settings.PROJECT_ID}: {e}")
            return False 