import json
import os
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from src.schemas.course import Block
from pydantic import BaseModel, ConfigDict
from openai import OpenAI
import numpy as np
from src.config import settings
import logging

logger = logging.getLogger(__name__)

class UserPreferences(BaseModel):
    """Modelo para las preferencias del usuario guardadas durante el onboarding"""
    name: str
    skill: str
    experience: str
    motivation: str
    time: str
    learning_style: str
    goal: str
    created_at: datetime = datetime.now(timezone.utc)
    updated_at: datetime = datetime.now(timezone.utc)

    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )

class UserProfile(BaseModel):
    """Perfil de usuario con email como identificador principal"""
    email: str  # Identificador principal
    name: str
    preferences: Dict[str, Any]
    auth_provider: str
    created_at: datetime = datetime.now(timezone.utc)
    updated_at: datetime = datetime.now(timezone.utc)
    
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )

class DayVersion(BaseModel):
    """Versión específica de un día del roadmap"""
    content: dict  # Contenido del día
    version: int
    created_at: datetime
    
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )

class EnrollmentDay(BaseModel):
    """Modelo para un día completado por el usuario"""
    title: str
    is_action_day: bool
    blocks: list[Block]
    action_task: Optional[str] = None
    score: Optional[float] = None
    feedback: Optional[str] = None
    completed_at: Optional[datetime] = None
    version: Optional[int] = None  # Versión del día que completó el usuario
    
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )

class Enrollment(BaseModel):
    roadmap_json: dict
    last_generated_day: int = 0
    streak: int = 0
    xp_total: int = 0
    created_at: datetime
    updated_at: datetime
    days: Dict[int, EnrollmentDay] = {}
    
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )

class RoadmapMetadata(BaseModel):
    """Metadata para roadmaps compartidos"""
    skill: str
    experience: str
    time: str
    learning_style: str
    created_at: datetime
    updated_at: datetime
    used_by_users: List[str] = []
    version: int = 1
    day_versions: Dict[int, List[DayVersion]] = {}  # día -> lista de versiones
    
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )

class SkillEmbedding(BaseModel):
    """Almacena el embedding de un skill y su hash"""
    skill: str
    embedding: List[float]
    hash_id: str  # El hash MD5 del curso
    created_at: datetime = datetime.now(timezone.utc)

    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )

class StorageService:
    def __init__(self, base_path: str):
        self.base_path = base_path
        self.courses_path = os.path.join(base_path, "courses")
        self.users_path = os.path.join(base_path, "users")
        self.embeddings_path = os.path.join(base_path, "embeddings")
        self.current_preferences = None
        
        # Crear directorios base si no existen
        os.makedirs(self.base_path, exist_ok=True)
        os.makedirs(self.courses_path, exist_ok=True)
        os.makedirs(self.users_path, exist_ok=True)
        os.makedirs(self.embeddings_path, exist_ok=True)
        
        # Inicializar cliente de OpenAI
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def _ensure_dirs(self, path: str):
        """Ensures all directories in path exist"""
        os.makedirs(path, exist_ok=True)

    def save_user_preferences(self, email: str, preferences: UserPreferences):
        """Guarda las preferencias del usuario usando email como identificador"""
        safe_email = email
        path = os.path.join(self.users_path, safe_email, "preferences.json")
        self._ensure_dirs(os.path.dirname(path))
        with open(path, 'w') as f:
            json_data = preferences.model_dump_json(indent=2)
            f.write(json_data)

    def get_user_preferences(self, email: str) -> Optional[UserPreferences]:
        """Obtiene las preferencias del usuario usando email como identificador"""
        safe_email = email
        path = os.path.join(self.users_path, safe_email, "preferences.json")
        if not os.path.exists(path):
            return None
        with open(path, 'r') as f:
            return UserPreferences.model_validate(json.load(f))

    def save_user_profile(self, email: str, profile: UserProfile):
        """Saves user profile using email as identifier"""
        safe_email = email
        path = os.path.join(self.users_path, safe_email, "profile.json")
        self._ensure_dirs(os.path.dirname(path))
        with open(path, 'w') as f:
            json_data = profile.model_dump_json(indent=2)
            f.write(json_data)

    def get_user_profile(self, email: str) -> Optional[UserProfile]:
        """Gets user profile using email as identifier"""
        safe_email = email
        path = os.path.join(self.users_path, safe_email, "profile.json")
        if not os.path.exists(path):
            return None
        with open(path, 'r') as f:
            return UserProfile.model_validate(json.load(f))

    def _normalize_skill(self, skill: str) -> str:
        """Normaliza el nombre del skill para manejar sinónimos"""
        # Normalizar el texto
        normalized = skill.lower().strip()
        
        # Mapeo de sinónimos a nombres base
        skill_mapping = {
            # Mate
            "mate": "cebar mate",
            "mate uruguayo": "cebar mate",
            "mate argentino": "cebar mate",
            "preparar mate": "cebar mate",
            # Marketing
            "marketing online": "marketing digital",
            "marketing en internet": "marketing digital",
            "marketing web": "marketing digital",
            # Truco
            "truco": "jugar al truco",
            "truco argentino": "jugar al truco",
            "truco uruguayo": "jugar al truco"
        }
        
        # Retornar el nombre base si existe, sino el nombre normalizado
        return skill_mapping.get(normalized, normalized)

    def _get_course_embedding_text(self, skill: str, preferences: UserPreferences) -> str:
        """Genera un texto enriquecido para el embedding que incluye solo las características esenciales del curso"""
        return f"{skill} para nivel {preferences.experience} en {preferences.time}"

    def _get_embedding(self, text: str) -> List[float]:
        """Obtiene el embedding de un texto usando OpenAI"""
        response = self.openai_client.embeddings.create(
            model=settings.OPENAI_EMBEDDING_MODEL,
            input=text,
            encoding_format="float"
        )
        return response.data[0].embedding

    def _calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calcula la similitud coseno entre dos embeddings"""
        return np.dot(embedding1, embedding2) / (np.linalg.norm(embedding1) * np.linalg.norm(embedding2))

    def _find_similar_skill(self, skill: str, threshold: float = 0.92) -> Optional[str]:
        """Busca un skill similar en los embeddings existentes y retorna su hash si existe"""
        try:
            if not self.current_preferences:
                logger.error("Current preferences not set before calling _find_similar_skill")
                return None

            # Generar texto enriquecido para el embedding
            embedding_text = self._get_course_embedding_text(skill, self.current_preferences)
            logger.info(f"Generando embedding para: {embedding_text}")
            
            # Obtener embedding del nuevo curso (única llamada a la API)
            new_embedding = self._get_embedding(embedding_text)
            
            # Buscar en embeddings existentes
            embeddings_file = os.path.join(self.embeddings_path, "skills.json")
            stored_embeddings = []
            
            if os.path.exists(embeddings_file):
                try:
                    with open(embeddings_file, 'r') as f:
                        stored_data = json.load(f)
                        if isinstance(stored_data, list):
                            stored_embeddings = [SkillEmbedding.model_validate(e) for e in stored_data]
                except json.JSONDecodeError as e:
                    logger.error(f"Error decoding embeddings file: {str(e)}")
                    backup_file = embeddings_file + f".backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                    os.rename(embeddings_file, backup_file)
                    logger.info(f"Corrupted embeddings file backed up to {backup_file}")
                
                # Calcular similitudes y encontrar la más alta
                max_similarity = 0
                most_similar_hash = None
                most_similar_text = None
                
                for stored in stored_embeddings:
                    similarity = self._calculate_similarity(new_embedding, stored.embedding)
                    if similarity > max_similarity:
                        max_similarity = similarity
                        most_similar_hash = stored.hash_id
                        most_similar_text = stored.skill
                
                # Si encontramos uno suficientemente similar, retornar su hash
                if most_similar_hash and max_similarity >= threshold:
                    logger.info(f"Curso similar encontrado: '{most_similar_text}' con similitud {max_similarity:.2f}")
                    return most_similar_hash
                else:
                    logger.info(f"No se encontró curso similar. Máxima similitud: {max_similarity:.2f}")
            
            # Si no encontramos similar, guardar el nuevo embedding
            # Generar hash basado en las preferencias clave
            key_prefs = {
                "skill": skill,
                "experience": self.current_preferences.experience,
                "time": self.current_preferences.time
            }
            new_hash = hashlib.md5(json.dumps(key_prefs, sort_keys=True).encode()).hexdigest()[:12]
            
            # Guardar el nuevo embedding
            new_embedding_obj = SkillEmbedding(
                skill=embedding_text,  # Guardamos el texto enriquecido
                embedding=new_embedding,
                hash_id=new_hash
            )
            
            # Actualizar archivo de embeddings usando el modelo Pydantic para serialización
            stored_embeddings.append(new_embedding_obj)
            embeddings_json = [e.model_dump(mode='json') for e in stored_embeddings]
            with open(embeddings_file, 'w') as f:
                json.dump(embeddings_json, f, indent=2)
            
            logger.info(f"Nuevo curso guardado con hash: {new_hash}")
            return new_hash
            
        except Exception as e:
            logger.error(f"Error al buscar skills similares: {str(e)}")
            return None

    def _generate_roadmap_id(self, preferences: UserPreferences) -> str:
        """Genera un ID único para un roadmap basado en preferencias clave"""
        # Guardar las preferencias actuales para uso en _find_similar_skill
        self.current_preferences = preferences
        
        # Intentar encontrar un curso similar
        similar_hash = self._find_similar_skill(preferences.skill)
        if similar_hash:
            return similar_hash
            
        # Si no se encontró similar o hubo error, usar el método tradicional
        key_prefs = {
            "skill": preferences.skill,
            "experience": preferences.experience,
            "time": preferences.time,
            "learning_style": preferences.learning_style
        }
        return hashlib.md5(json.dumps(key_prefs, sort_keys=True).encode()).hexdigest()[:12]

    def _save_shared_roadmap(self, roadmap_id: str, roadmap: dict, metadata: RoadmapMetadata):
        """Guarda un roadmap compartido en courses"""
        path = os.path.join(self.courses_path, roadmap_id)
        self._ensure_dirs(path)
        
        # Actualizar versiones de días
        current_version = metadata.version
        for section in roadmap["sections"]:
            for day in section["days"]:
                day_number = day["day_number"]
                day_version = DayVersion(
                    content=day,
                    version=current_version,
                    created_at=datetime.now(timezone.utc)
                )
                
                if day_number not in metadata.day_versions:
                    metadata.day_versions[day_number] = []
                metadata.day_versions[day_number].append(day_version)
        
        # Guardar el roadmap
        with open(os.path.join(path, "roadmap.json"), 'w') as f:
            json.dump(roadmap, f, indent=2)
            
        # Guardar metadata con versiones de días
        with open(os.path.join(path, "metadata.json"), 'w') as f:
            json_data = metadata.model_dump_json(indent=2)
            f.write(json_data)

    def _get_shared_roadmap(self, roadmap_id: str) -> Optional[tuple[dict, RoadmapMetadata]]:
        """Obtiene un roadmap compartido y su metadata"""
        path = os.path.join(self.courses_path, roadmap_id)
        if not os.path.exists(path):
            return None
            
        try:
            # Leer roadmap
            with open(os.path.join(path, "roadmap.json"), 'r') as f:
                roadmap = json.load(f)
                
            # Leer metadata    
            with open(os.path.join(path, "metadata.json"), 'r') as f:
                metadata = RoadmapMetadata.model_validate(json.load(f))
                
            return roadmap, metadata
        except:
            return None

    def create_enrollment(self, email: str, course_id: str, roadmap: dict) -> Enrollment:
        """Creates new course enrollment and saves shared roadmap"""
        # Obtener preferencias del usuario
        preferences = self.get_user_preferences(email)
        if not preferences:
            raise Exception("User preferences not found")
            
        # Generar ID único para el roadmap
        roadmap_id = self._generate_roadmap_id(preferences)
        
        # Verificar si existe un roadmap similar
        existing = self._get_shared_roadmap(roadmap_id)
        if existing:
            shared_roadmap, metadata = existing
            # Actualizar metadata
            metadata.used_by_users.append(email)
            metadata.updated_at = datetime.now(timezone.utc)
            metadata.version += 1
            # Guardar roadmap actualizado
            self._save_shared_roadmap(roadmap_id, roadmap, metadata)
        else:
            # Crear nuevo roadmap compartido
            metadata = RoadmapMetadata(
                skill=preferences.skill,
                experience=preferences.experience,
                time=preferences.time,
                learning_style=preferences.learning_style,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                used_by_users=[email]
            )
            self._save_shared_roadmap(roadmap_id, roadmap, metadata)

        # Crear enrollment para el usuario usando email sanitizado
        safe_email = email
        enrollment = Enrollment(
            roadmap_json=roadmap,
            last_generated_day=0,
            streak=0,
            xp_total=0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            days={}
        )
        
        path = os.path.join(self.users_path, safe_email, "roadmaps", course_id)
        self._ensure_dirs(path)
        self._save_enrollment(path, enrollment)
        return enrollment

    def save_day_content(self, email: str, course_id: str, day_number: int, content: EnrollmentDay):
        """Saves content for a specific day"""
        safe_email = email
        # Obtener roadmap_id basado en las preferencias del usuario
        preferences = self.get_user_preferences(email)
        roadmap_id = self._generate_roadmap_id(preferences)
        
        # Obtener metadata del roadmap compartido
        shared_data = self._get_shared_roadmap(roadmap_id)
        if shared_data:
            _, metadata = shared_data
            # Asignar la versión actual del día al contenido
            if day_number in metadata.day_versions:
                content.version = metadata.day_versions[day_number][-1].version
        
        enrollment_path = os.path.join(self.users_path, safe_email, "roadmaps", course_id)
        day_path = os.path.join(enrollment_path, "days", str(day_number))
        self._ensure_dirs(os.path.dirname(day_path))
        with open(day_path, 'w') as f:
            json_data = content.model_dump_json(indent=2)
            f.write(json_data)

    def get_day_content(self, email: str, course_id: str, day_number: int) -> Optional[EnrollmentDay]:
        """Gets content for a specific day"""
        safe_email = email
        path = os.path.join(self.users_path, safe_email, "roadmaps", course_id, "days", str(day_number))
        if not os.path.exists(path):
            # Si el día no existe, obtener la última versión del roadmap compartido
            preferences = self.get_user_preferences(email)
            roadmap_id = self._generate_roadmap_id(preferences)
            shared_data = self._get_shared_roadmap(roadmap_id)
            
            if shared_data:
                roadmap, metadata = shared_data
                if day_number in metadata.day_versions:
                    latest_version = metadata.day_versions[day_number][-1]
                    return EnrollmentDay(
                        **latest_version.content,
                        version=latest_version.version
                    )
            return None
            
        with open(path, 'r') as f:
            return EnrollmentDay.model_validate(json.load(f))

    def _save_enrollment(self, path: str, enrollment: Enrollment):
        """Saves enrollment data"""
        with open(os.path.join(path, "roadmap.json"), 'w') as f:
            json_data = enrollment.model_dump_json(indent=2)
            f.write(json_data)

    def get_enrollment(self, email: str, course_id: str) -> Optional[Enrollment]:
        """Gets enrollment data"""
        safe_email = email
        path = os.path.join(self.users_path, safe_email, "roadmaps", course_id, "roadmap.json")
        if not os.path.exists(path):
            return None
        with open(path, 'r') as f:
            return Enrollment.model_validate(json.load(f))

    def update_enrollment(self, email: str, course_id: str, enrollment: Enrollment):
        """Updates enrollment data"""
        safe_email = email
        path = os.path.join(self.users_path, safe_email, "roadmaps", course_id)
        self._save_enrollment(path, enrollment)
