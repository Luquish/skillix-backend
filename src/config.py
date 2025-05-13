"""Centralised env + constants loader."""
from functools import lru_cache
from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Storage configuration
STORAGE_PATH = BASE_DIR / "storage"

class Settings:
    # OpenAI configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
    
    # Storage configuration
    STORAGE_PATH: Path = STORAGE_PATH
    
    def __init__(self):
        # Validate OpenAI settings
        if not self.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY must be set in environment variables")
        
        # Ensure storage directories exist
        self.STORAGE_PATH.mkdir(exist_ok=True)
        (self.STORAGE_PATH / "courses").mkdir(exist_ok=True)
        (self.STORAGE_PATH / "users").mkdir(exist_ok=True)

settings = Settings()