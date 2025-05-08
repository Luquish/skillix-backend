"""Service for managing course operations."""
from typing import Optional
from datetime import datetime
from google.cloud import firestore
from schemas.course import CourseDoc
from services.vector_service import VectorService
from config import settings

class CourseService:
    def __init__(self, local_mode: bool = True):
        """
        Args:
            local_mode: Si es True, no interactúa con Firestore ni Vector Service
        """
        self._local_mode = local_mode
        if not local_mode:
            print("🔌 Iniciando CourseService en modo producción")
            self._vector_service = VectorService()
            self._db = firestore.Client(project=settings.PROJECT_ID)
            self._courses_collection = self._db.collection('courses')
        else:
            print("🔌 Iniciando CourseService en modo local")
    
    async def create_course(self, course: CourseDoc) -> Optional[CourseDoc]:
        """Create a new course and add it to the vector index."""
        try:
            print(f"\n📦 Creando curso: {course.title}")
            # Aseguramos que los timestamps estén actualizados
            course.createdAt = datetime.utcnow()
            course.updatedAt = course.createdAt
            
            if self._local_mode:
                print("💾 Guardando curso en modo local")
                return course
            
            print("💾 Guardando curso en Firestore...")
            # Convertimos a model_dump para Firestore
            course_data = course.model_dump()
            
            # Guardamos en Firestore usando el courseId como documento
            doc_ref = self._courses_collection.document(course.courseId)
            doc_ref.set(course_data)
            print(f"✅ Curso guardado en Firestore con ID: {course.courseId}")
            
            # Añadimos al índice vectorial
            print("🔍 Indexando curso en servicio vectorial...")
            index_success = await self._vector_service.add_course_to_index(course)
            
            if not index_success:
                print(f"⚠️  Warning: Course {course.courseId} created but not indexed")
            else:
                print("✅ Curso indexado correctamente")
            
            return course
            
        except Exception as e:
            print(f"❌ Error creating course: {e}")
            return None
    
    async def update_course(self, course_id: str, updates: CourseDoc) -> Optional[CourseDoc]:
        """Update an existing course and its vector index entry."""
        try:
            print(f"\n🔄 Actualizando curso: {course_id}")
            # Actualizamos timestamp
            updates.updatedAt = datetime.utcnow()
            
            if self._local_mode:
                print("💾 Actualizando curso en modo local")
                return updates
            
            print("💾 Actualizando curso en Firestore...")
            # Convertimos a model_dump para Firestore
            course_data = updates.model_dump()
            
            # Actualizamos en Firestore
            doc_ref = self._courses_collection.document(course_id)
            doc_ref.update(course_data)
            print("✅ Curso actualizado en Firestore")
            
            # Actualizamos el índice vectorial
            print("🔍 Actualizando índice vectorial...")
            index_success = await self._vector_service.update_course_in_index(updates)
            
            if not index_success:
                print(f"⚠️  Warning: Course {course_id} updated but index not updated")
            else:
                print("✅ Índice vectorial actualizado")
            
            return updates
            
        except Exception as e:
            print(f"❌ Error updating course: {e}")
            return None
    
    async def delete_course(self, course_id: str) -> bool:
        """Delete a course and remove it from the vector index."""
        try:
            print(f"\n🗑️  Eliminando curso: {course_id}")
            if self._local_mode:
                print("💾 Eliminando curso en modo local")
                return True
                
            print("💾 Eliminando curso de Firestore...")
            # Eliminamos de Firestore
            doc_ref = self._courses_collection.document(course_id)
            doc_ref.delete()
            print("✅ Curso eliminado de Firestore")
            
            # Eliminamos del índice vectorial
            print("🔍 Eliminando curso del índice vectorial...")
            index_success = await self._vector_service.remove_course_from_index(course_id)
            
            if not index_success:
                print(f"⚠️  Warning: Course {course_id} deleted but not removed from index")
            else:
                print("✅ Curso eliminado del índice vectorial")
            
            return True
            
        except Exception as e:
            print(f"❌ Error deleting course: {e}")
            return False
            
    async def get_course(self, course_id: str) -> Optional[CourseDoc]:
        """Retrieve a course by its ID."""
        try:
            print(f"\n🔍 Buscando curso: {course_id}")
            if self._local_mode:
                print("ℹ️  Modo local: no se pueden recuperar cursos")
                return None
                
            doc_ref = self._courses_collection.document(course_id)
            doc = doc_ref.get()
            
            if doc.exists:
                print("✅ Curso encontrado")
                return CourseDoc(**doc.to_dict())
            
            print("ℹ️  Curso no encontrado")
            return None
            
        except Exception as e:
            print(f"❌ Error retrieving course: {e}")
            return None 