"""Centralised env + constants loader."""
from functools import lru_cache
from pathlib import Path
from dotenv import load_dotenv
import os

# Load .env in local dev only
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

@lru_cache
class Settings:  # type: ignore[misc]
    OPENAI_API_KEY: str = os.environ["OPENAI_API_KEY"]
    OPENAI_MODEL: str = os.environ["OPENAI_MODEL"]
    OPENAI_EMBEDDING_MODEL: str = os.environ["OPENAI_EMBEDDING_MODEL"]
    PROJECT_ID: str = os.getenv("PROJECT_ID", "skillix-dev")
    REGION: str = os.getenv("GCP_REGION", "us-central1")
    INDEX_ENDPOINT_NAME: str = os.environ.get("MATCHING_ENGINE_INDEX_ENDPOINT", "")
    DEPLOYED_INDEX_ID: str = os.environ.get("MATCHING_ENGINE_DEPLOYED_INDEX_ID", "")
    GCS_BUCKET: str = os.getenv("GCS_BUCKET", "skillix-assets")
    TTS_VOICE: str = os.getenv("TTS_VOICE", "es-ES-Wavenet-A")
    MAX_BLOCKS: int = int(os.getenv("MAX_BLOCKS", 12))
    BRAVE_API_KEY: str = os.getenv("BRAVE_API_KEY", "")

settings = Settings()