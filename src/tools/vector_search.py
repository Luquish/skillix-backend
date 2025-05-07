"""Tool for vector-based similarity search using OpenAI embeddings and Vertex AI."""
from typing import Optional, Dict, Any
from openai import OpenAI
from config import INDEX_ENDPOINT_NAME, DEPLOYED_INDEX_ID, OPENAI_API_KEY
from services.gcp_clients import vertex_client

class VectorSearchTool:
    def __init__(self):
        self._openai = OpenAI(api_key=OPENAI_API_KEY)
        self._vertex = vertex_client()

    def _embed(self, text: str) -> list[float]:
        """Generate embeddings for input text using OpenAI."""
        resp = self._openai.embeddings.create(
            model="text-embedding-3-small", 
            input=text
        )
        return resp.data[0].embedding

    def find_similar_courses(
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
        if not INDEX_ENDPOINT_NAME:
            return None

        query_embedding = self._embed(query)
        
        response = self._vertex.find_neighbors(
            index_endpoint=INDEX_ENDPOINT_NAME,
            deployed_index_id=DEPLOYED_INDEX_ID,
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