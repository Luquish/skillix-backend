"""Service for managing course operations."""
from typing import Optional
from datetime import datetime
from google.cloud import firestore
from schemas.course import CourseDoc
from services.vector_service import VectorService
from config import settings

class CourseService:
    def __init__(self):
        self._vector_service = VectorService()
        self._db = firestore.Client(project=settings.PROJECT_ID)
        self._courses_collection = self._db.collection('courses')
    
    async def create_course(self, course: CourseDoc) -> Optional[CourseDoc]:
        """Create a new course and add it to the vector index."""
        try:
            # Aseguramos que los timestamps estén actualizados
            course.createdAt = datetime.utcnow()
            course.updatedAt = course.createdAt
            
            # Convertimos a dict para Firestore
            course_data = course.dict()
            
            # Guardamos en Firestore usando el courseId como documento
            doc_ref = self._courses_collection.document(course.courseId)
            doc_ref.set(course_data)
            
            # Añadimos al índice vectorial
            index_success = await self._vector_service.add_course_to_index(course)
            
            if not index_success:
                print(f"Warning: Course {course.courseId} created but not indexed")
            
            return course
            
        except Exception as e:
            print(f"Error creating course in {settings.PROJECT_ID}: {e}")
            return None
    
    async def update_course(self, course_id: str, updates: CourseDoc) -> Optional[CourseDoc]:
        """Update an existing course and its vector index entry."""
        try:
            # Actualizamos timestamp
            updates.updatedAt = datetime.utcnow()
            
            # Convertimos a dict para Firestore
            course_data = updates.dict()
            
            # Actualizamos en Firestore
            doc_ref = self._courses_collection.document(course_id)
            doc_ref.update(course_data)
            
            # Actualizamos el índice vectorial
            index_success = await self._vector_service.update_course_in_index(updates)
            
            if not index_success:
                print(f"Warning: Course {course_id} updated but index not updated")
            
            return updates
            
        except Exception as e:
            print(f"Error updating course in {settings.PROJECT_ID}: {e}")
            return None
    
    async def delete_course(self, course_id: str) -> bool:
        """Delete a course and remove it from the vector index."""
        try:
            # Eliminamos de Firestore
            doc_ref = self._courses_collection.document(course_id)
            doc_ref.delete()
            
            # Eliminamos del índice vectorial
            index_success = await self._vector_service.remove_course_from_index(course_id)
            
            if not index_success:
                print(f"Warning: Course {course_id} deleted but not removed from index")
            
            return True
            
        except Exception as e:
            print(f"Error deleting course from {settings.PROJECT_ID}: {e}")
            return False
            
    async def get_course(self, course_id: str) -> Optional[CourseDoc]:
        """Retrieve a course by its ID."""
        try:
            doc_ref = self._courses_collection.document(course_id)
            doc = doc_ref.get()
            
            if doc.exists:
                return CourseDoc(**doc.to_dict())
            
            return None
            
        except Exception as e:
            print(f"Error retrieving course from {settings.PROJECT_ID}: {e}")
            return None 