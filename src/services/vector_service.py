"""Service for managing vector operations including indexing and similarity search."""
from typing import Optional, Dict, Any
from openai import OpenAI
from config import settings
from services.gcp_clients import vertex_client
from schemas.course import CourseDoc

class VectorService:
    def __init__(self):
        self._openai = OpenAI(api_key=settings.OPENAI_API_KEY)
        self._vertex = vertex_client()

    def _generate_embedding(self, text: str) -> list[float]:
        """Generate embeddings for input text using OpenAI."""
        resp = self._openai.embeddings.create(
            model=settings.OPENAI_EMBEDDING_MODEL, 
            input=text
        )
        return resp.data[0].embedding

    def _generate_course_embedding(self, course: CourseDoc) -> list[float]:
        """Generate embedding for a course using its key content."""
        content_for_embedding = f"""
        Título: {course.title}
        Descripción: {course.description}
        Nivel: {course.level}
        Tags: {', '.join(course.tags)}
        Contenido: {' '.join(str(block) for block in course.blocks)}
        """
        return self._generate_embedding(content_for_embedding)

    async def add_course_to_index(self, course: CourseDoc) -> bool:
        """Add a new course to the vector index."""
        try:
            if not settings.INDEX_ENDPOINT_NAME:
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
                index_endpoint=settings.INDEX_ENDPOINT_NAME,
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
            if not settings.INDEX_ENDPOINT_NAME:
                print(f"Warning: INDEX_ENDPOINT not configured in {settings.PROJECT_ID}")
                return False

            self._vertex.remove_datapoints(
                index_endpoint=settings.INDEX_ENDPOINT_NAME,
                deployed_index_id=settings.DEPLOYED_INDEX_ID,
                datapoint_ids=[course_id]
            )
            return True
            
        except Exception as e:
            print(f"Error removing course from index in {settings.PROJECT_ID}: {e}")
            return False

    async def find_similar_courses(
        self, 
        query: str, 
        k: int = 1, 
        score_threshold: float = 0.85
    ) -> Optional[Dict[str, Any]]:
        """Find similar courses using vector similarity search.
        
        Args:
            query: Text to search for similar courses
            k: Number of neighbors to return
            score_threshold: Minimum similarity score (0-1)
            
        Returns:
            Dictionary containing:
            - course_data: Full course JSON
            - similarity_score: Score between 0-1
            - canonical: Whether the course is canonical
            Or None if no match found
        """
        if not settings.INDEX_ENDPOINT_NAME:
            return None

        query_embedding = self._generate_embedding(query)
        
        response = self._vertex.find_neighbors(
            index_endpoint=settings.INDEX_ENDPOINT_NAME,
            deployed_index_id=settings.DEPLOYED_INDEX_ID,
            queries=[{
                "vector": query_embedding,
                "neighbor_count": k
            }]
        )

        if not response.nearest_neighbors or not response.nearest_neighbors[0].neighbors:
            return None

        neighbor = response.nearest_neighbors[0].neighbors[0]
        similarity_score = 1 - neighbor.distance
        
        if similarity_score < score_threshold:
            return None

        # Asumimos que datapoint_id contiene el JSON completo del curso
        course_data = neighbor.datapoint.datapoint_id
        
        return {
            "course_data": course_data,
            "similarity_score": similarity_score,
            "canonical": course_data.get("canonical", False),
            "blocks": course_data.get("blocks", []),
            "metadata": {
                "courseId": course_data.get("courseId"),
                "version": course_data.get("version"),
                "language": course_data.get("language"),
                "title": course_data.get("title"),
                "level": course_data.get("level")
            }
        } 