from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional

# Resolve paths relative to the project root (parent of backend/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"

class Settings(BaseSettings):
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'journal.db'}"
    GEMINI_API_KEY: Optional[str] = None
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    class Config:
        env_file = str(PROJECT_ROOT / ".env")

settings = Settings()
