"""Servicio para construir y validar documentos de curso."""
from typing import List, Dict, Any
from schemas.course import CourseDoc, Block
from datetime import datetime
import uuid
import re

def sanitize_course_id(text: str) -> str:
    """
    Convierte un texto en un courseId válido (snake_case).
    """
    # Convertir a minúsculas y reemplazar caracteres especiales
    sanitized = re.sub(r'[^a-z0-9\s]', '', text.lower())
    # Reemplazar espacios con guiones bajos
    return re.sub(r'\s+', '_', sanitized.strip())

def build_course_doc(
    blocks: List[Block],
    metadata: Dict[str, Any],
    course_id: str | None = None
) -> CourseDoc:
    """
    Construye un CourseDoc válido a partir de bloques y metadatos.
    """
    # Generar o sanitizar course_id
    if not course_id:
        base_id = sanitize_course_id(metadata.get("title", ""))
        course_id = f"{base_id}_{uuid.uuid4().hex[:8]}"
    else:
        course_id = sanitize_course_id(course_id)
    
    # Timestamp actual
    now = datetime.utcnow()
    
    # Valores por defecto para campos requeridos
    defaults = {
        "courseId": course_id,
        "version": "v1",
        "language": "es",
        "level": "beginner",
        "tags": [],
        "canonical": False,
        "createdAt": now,
        "updatedAt": now
    }
    
    # Sanitizar tags si existen
    if "tags" in metadata:
        metadata["tags"] = metadata["tags"][:10]  # Limitar a 10 tags
    
    # Combinar defaults con metadata proporcionada
    course_data = {**defaults, **metadata, "blocks": blocks}
    
    # Crear y validar el CourseDoc
    return CourseDoc(**course_data) 