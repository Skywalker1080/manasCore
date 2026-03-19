from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional
import re

# Resolve paths relative to the project root (parent of backend/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
ENV_FILE = PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'journal.db'}"
    GEMINI_API_KEY: Optional[str] = None
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    class Config:
        env_file = str(PROJECT_ROOT / ".env")
        extra = "ignore"


settings = Settings()


class EmotionConfig(BaseSettings):
    EMOTION_CATEGORIES: list[str] = ["Happy", "Sad", "Longing", "Reflective"]
    MODE_CATEGORIES: list[str] = ["Work", "Personal", "Health", "Relationships", "Finance", "Hobbies", "Travel", "Education"]
    SENTIMENT_CATEGORIES: list[str] = ["Positive", "Negative", "Neutral"]


def mask_api_key(key: Optional[str]) -> str:
    """Returns 'Not set' or '••••<last 4 chars>' for display."""
    if not key:
        return "Not set"
    if len(key) <= 4:
        return "••••"
    return "••••" + key[-4:]


def update_env_and_reload(
    gemini_api_key: Optional[str] = None,
    ollama_base_url: Optional[str] = None,
) -> None:
    """
    Write new values into the .env file and reload the settings singleton.
    Only updates the keys that are provided (not None).
    """
    global settings

    # Read existing .env content
    env_content = ""
    if ENV_FILE.exists():
        env_content = ENV_FILE.read_text(encoding="utf-8")

    def _set_env_var(content: str, key: str, value: str) -> str:
        """Set or update a key=value line in .env content."""
        # Match lines like KEY = "value", KEY=value, KEY = value
        pattern = re.compile(rf'^{re.escape(key)}\s*=.*$', re.MULTILINE)
        new_line = f'{key} = "{value}"'
        if pattern.search(content):
            return pattern.sub(new_line, content)
        else:
            # Append if not found
            if content and not content.endswith("\n"):
                content += "\n"
            return content + new_line + "\n"

    if gemini_api_key is not None:
        env_content = _set_env_var(env_content, "GEMINI_API_KEY", gemini_api_key)
        # Also update GOOGLE_API_KEY since the project uses both
        env_content = _set_env_var(env_content, "GOOGLE_API_KEY", gemini_api_key)
    if ollama_base_url is not None:
        env_content = _set_env_var(env_content, "OLLAMA_BASE_URL", ollama_base_url)

    ENV_FILE.write_text(env_content, encoding="utf-8")

    # Reload settings singleton so changes take effect immediately
    settings = Settings()

