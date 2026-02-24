from pathlib import Path
import logging
from typing import List
from backend.config import DATA_DIR

logger = logging.getLogger(__name__)

class ProfileService:
    """
    Service to handle reading and writing user profile markdown files.
    Profiles are stored in data/profiles/.
    """
    PROFILES_DIR = DATA_DIR / "profiles"
    ALLOWED_PROFILES = ["personality.md", "goals.md", "vision.md"]

    @classmethod
    def ensure_profiles_setup(cls) -> None:
        """
        Ensures the profiles directory exists and creates/populates default 
        profile files if they are missing or empty.
        Called on application startup.
        """
        try:
            cls.PROFILES_DIR.mkdir(parents=True, exist_ok=True)
            for profile in cls.ALLOWED_PROFILES:
                file_path = cls.PROFILES_DIR / profile
                # Populate if file doesn't exist OR is empty
                if not file_path.exists() or file_path.stat().st_size == 0:
                    logger.info(f"Initializing profile file: {profile}")
                    title = profile.split('.')[0].capitalize()
                    default_content = f"# {title}\n\nThis is your AI-generated {title} profile.\n"
                    file_path.write_text(default_content, encoding="utf-8")
        except Exception as e:
            logger.error(f"Failed to setup profiles directory: {e}")
            raise

    @classmethod
    def _validate_filename(cls, filename: str) -> None:
        """Validates that the filename is one of the allowed profiles."""
        if filename not in cls.ALLOWED_PROFILES:
            # Check if it's missing extension
            if f"{filename}.md" in cls.ALLOWED_PROFILES:
                return
            raise ValueError(f"Unauthorized profile access: {filename}. Allowed: {cls.ALLOWED_PROFILES}")

    @classmethod
    def _get_path(cls, filename: str) -> Path:
        """Constructs the full path for a profile file."""
        if not filename.endswith(".md"):
            filename = f"{filename}.md"
        return cls.PROFILES_DIR / filename

    @classmethod
    def get_profile_content(cls, filename: str) -> str:
        """
        Reads the content of a profile file.
        
        Args:
            filename: Name of the file (e.g., 'personality.md' or 'personality')
            
        Returns:
            The markdown content of the file.
            
        Raises:
            ValueError: If the filename is not allowed.
            FileNotFoundError: If the file does not exist.
        """
        cls._validate_filename(filename)
        file_path = cls._get_path(filename)
        
        if not file_path.exists():
            logger.warning(f"Profile file not found: {file_path}")
            raise FileNotFoundError(f"Profile {filename} not found.")
            
        return file_path.read_text(encoding="utf-8")

    @classmethod
    def update_profile_content(cls, filename: str, content: str) -> None:
        """
        Writes content to a profile file.
        
        Args:
            filename: Name of the file (e.g., 'personality.md' or 'personality')
            content: The new markdown content.
            
        Raises:
            ValueError: If the filename is not allowed.
        """
        cls._validate_filename(filename)
        file_path = cls._get_path(filename)
        
        logger.info(f"Updating profile: {filename}")
        file_path.write_text(content, encoding="utf-8")

    @classmethod
    def list_profiles(cls) -> List[str]:
        """Returns the list of allowed profile filenames."""
        return [p.replace(".md", "") for p in cls.ALLOWED_PROFILES]

    # --- Onboarding Status ---

    ONBOARDING_FLAG = DATA_DIR / "profiles" / ".onboarding_complete"

    @classmethod
    def is_onboarding_complete(cls) -> bool:
        """Checks if the user has completed onboarding."""
        return cls.ONBOARDING_FLAG.exists()

    @classmethod
    def mark_onboarding_complete(cls) -> None:
        """Creates the flag file to mark onboarding as done."""
        cls.ONBOARDING_FLAG.write_text("true", encoding="utf-8")
        logger.info("Onboarding marked as complete.")

    @classmethod
    def reset_onboarding(cls) -> None:
        """Removes the flag file so onboarding triggers again."""
        if cls.ONBOARDING_FLAG.exists():
            cls.ONBOARDING_FLAG.unlink()
            logger.info("Onboarding has been reset.")
