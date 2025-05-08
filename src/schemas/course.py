from __future__ import annotations
from typing import List, Literal
from pydantic import BaseModel, Field, field_validator
from config import settings
from datetime import datetime

class BaseBlock(BaseModel):
    """Bloque base para todos los tipos de contenido."""
    type: str
    xp: int

class AudioBlock(BaseBlock):
    """Bloque de audio con texto y URL."""
    type: Literal["audio"]
    text: str
    audioUrl: str

class ReadBlock(BaseBlock):
    """Bloque de lectura con título opcional y cuerpo."""
    type: Literal["read"]
    title: str | None
    body: str

class QuizMCQBlock(BaseBlock):
    """Bloque de quiz de opción múltiple."""
    type: Literal["quiz_mcq"]
    question: str
    options: List[str]
    answer: int

class QuizTFBlock(BaseBlock):
    """Bloque de quiz verdadero/falso."""
    type: Literal["quiz_tf"]
    statement: str
    answer: bool

class SentenceShuffleBlock(BaseBlock):
    """Bloque de ordenar oraciones."""
    type: Literal["sentence_shuffle"]
    tokens: List[str]
    answer: List[str]

class MatchingPairsBlock(BaseBlock):
    """Bloque de emparejar conceptos."""
    type: Literal["matching_pairs"]
    left_items: List[str]
    right_items: List[str]
    answer: List[int]  # Índices que conectan left_items con right_items

class ImageMCQBlock(BaseBlock):
    """Bloque de quiz con imágenes."""
    type: Literal["image_mcq"]
    prompt: str
    imageUrls: List[str]
    options: List[str]
    answer: int

class ClozeMCQBlock(BaseBlock):
    """Bloque de completar espacios."""
    type: Literal["cloze_mcq"]
    before_text: str
    after_text: str
    options: List[str]
    answer: int

class ScenarioMCQBlock(BaseBlock):
    """Bloque de quiz basado en escenarios."""
    type: Literal["scenario_mcq"]
    context: str
    options: List[str]
    answer: int

Block = (
    AudioBlock | 
    ReadBlock | 
    QuizMCQBlock | 
    QuizTFBlock | 
    SentenceShuffleBlock | 
    MatchingPairsBlock | 
    ImageMCQBlock | 
    ClozeMCQBlock | 
    ScenarioMCQBlock
)

class CourseDoc(BaseModel):
    """Documento completo del curso."""
    # Campos de identificación
    courseId: str
    version: str = "v1"
    language: str = "es"
    
    # Campos descriptivos
    title: str
    description: str
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    tags: List[str] = []
    
    # Control de calidad
    canonical: bool = False
    
    # Contenido
    blocks: List[Block]
    
    # Timestamps
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("blocks")
    @classmethod
    def limit_blocks(cls, v):
        if len(v) == 0:
            raise ValueError("Course must contain at least one block")
        if len(v) > settings.MAX_BLOCKS:
            raise ValueError(f"Course too long (> {settings.MAX_BLOCKS} blocks)")
        return v

    @field_validator("courseId")
    @classmethod
    def validate_course_id(cls, v):
        if not v.islower():
            raise ValueError("courseId must be lowercase")
        return v

    @field_validator("version")
    @classmethod
    def validate_version(cls, v):
        if not v.startswith("v"):
            raise ValueError("Version must start with 'v' (e.g. v1, v2)")
        return v

    @field_validator("language")
    @classmethod
    def validate_language(cls, v):
        if len(v) != 2:
            raise ValueError("Language must be a 2-letter ISO-639-1 code")
        return v.lower()

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }