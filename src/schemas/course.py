from __future__ import annotations
from typing import List, Literal, Tuple, Annotated
from pydantic import BaseModel, Field, validator, constr
from config import settings
from datetime import datetime

class BaseBlock(BaseModel):
    type: str
    xp: int = Field(ge=0, le=20)

class AudioBlock(BaseBlock):
    type: Literal["audio"]
    text: str
    audioUrl: str

class ReadBlock(BaseBlock):
    type: Literal["read"]
    title: str | None = None
    body: str

class QuizMCQBlock(BaseBlock):
    type: Literal["quiz_mcq"]
    question: str
    options: List[str]
    answer: int

class QuizTFBlock(BaseBlock):
    type: Literal["quiz_tf"]
    statement: str
    answer: bool

class SentenceShuffleBlock(BaseBlock):
    type: Literal["sentence_shuffle"]
    tokens: List[str]
    answer: List[str]

class MatchingPairsBlock(BaseBlock):
    type: Literal["matching_pairs"]
    pairs: List[Tuple[str, str]]

class ImageMCQBlock(BaseBlock):
    type: Literal["image_mcq"]
    prompt: str
    imageUrls: List[str]
    options: List[str]
    answer: int

class ClozeMCQBlock(BaseBlock):
    type: Literal["cloze_mcq"]
    sentenceParts: Tuple[str, str]  # (before, after)
    options: List[str]
    answer: int

class ScenarioMCQBlock(BaseBlock):
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
    # Campos de identificación
    courseId: Annotated[str, constr(regex=r'^[a-z0-9_]+$')]  # snake-case, único
    version: str = Field(default="v1", regex=r'^v\d+$')  # para control de cambios
    language: str = Field(default="es", regex=r'^[a-z]{2}$')  # ISO-639-1 (es, en, fr...)
    
    # Campos descriptivos
    title: str
    description: str
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    tags: List[str] = Field(
        default=[],
        max_items=10,
        description="Máximo 10 tags"
    )
    
    # Control de calidad
    canonical: bool = Field(
        default=False,
        description="Se marca true tras evaluación A/B"
    )
    
    # Contenido
    blocks: List[Block] = Field(
        ...,
        description=f"Lista de bloques (máximo {settings.MAX_BLOCKS})"
    )
    
    # Timestamps
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    @validator("blocks")
    def limit_blocks(cls, v):
        if len(v) == 0:
            raise ValueError("Course must contain at least one block")
        if len(v) > settings.MAX_BLOCKS:
            raise ValueError(f"Course too long (> {settings.MAX_BLOCKS} blocks)")
        return v

    @validator("courseId")
    def validate_course_id(cls, v):
        if not v.islower():
            raise ValueError("courseId must be lowercase")
        return v

    @validator("version")
    def validate_version(cls, v):
        if not v.startswith("v"):
            raise ValueError("Version must start with 'v' (e.g. v1, v2)")
        return v

    @validator("language")
    def validate_language(cls, v):
        if len(v) != 2:
            raise ValueError("Language must be a 2-letter ISO-639-1 code")
        return v.lower()

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }