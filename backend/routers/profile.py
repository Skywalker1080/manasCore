from fastapi import APIRouter, HTTPException

from backend.services.profile import ProfileService
from backend.schemas.profile import ProfileUpdateRequest, ConfigResponse, ConfigUpdateRequest, VisionFlipRequest
from backend.config import settings, mask_api_key, update_env_and_reload
from backend.agent.agents import Agent
from logger.logger import get_logger

router = APIRouter(prefix="/profile", tags=["profile"])
logger = get_logger()
agent = Agent()

# --- Configuration Endpoints ---

@router.get("/config", response_model=ConfigResponse)
def get_config():
    """Return current config values with the API key masked."""
    return ConfigResponse(
        gemini_api_key_masked=mask_api_key(settings.GEMINI_API_KEY),
        ollama_base_url=settings.OLLAMA_BASE_URL,
    )


@router.put("/config")
def update_config(request: ConfigUpdateRequest):
    """Update GEMINI_API_KEY and/or OLLAMA_BASE_URL in .env and reload settings."""
    if request.gemini_api_key:
        try:
            from litellm import completion
            # Validate key with a tiny generation
            completion(
                model="gemini/gemini-3-flash-preview",
                messages=[{"role": "user", "content": "test validation"}],
                api_key=request.gemini_api_key,
                max_tokens=1
            )
        except Exception as e:
            logger.error(f"API Key validation failed for provided key: {e}")
            raise HTTPException(status_code=400, detail="Invalid Gemini API Key. Please verify and try again.")

    try:
        update_env_and_reload(
            gemini_api_key=request.gemini_api_key,
            ollama_base_url=request.ollama_base_url,
        )
        # Re-import to get the refreshed singleton
        from backend.config import settings as refreshed
        return {
            "message": "Configuration updated successfully.",
            "gemini_api_key_masked": mask_api_key(refreshed.GEMINI_API_KEY),
            "ollama_base_url": refreshed.OLLAMA_BASE_URL,
        }
    except Exception as e:
        logger.error(f"Error updating config: {e}")
        raise HTTPException(status_code=500, detail="Failed to update configuration.")

# --- Onboarding Status ---

@router.get("/onboarding/status")
def get_onboarding_status():
    """Check if the user has completed onboarding."""
    return {"completed": ProfileService.is_onboarding_complete()}

@router.post("/onboarding/complete")
def complete_onboarding():
    """Mark onboarding as complete."""
    ProfileService.mark_onboarding_complete()
    return {"message": "Onboarding marked as complete."}

@router.post("/onboarding/reset")
def reset_onboarding():
    """Reset onboarding so it triggers again on next visit."""
    ProfileService.reset_onboarding()
    return {"message": "Onboarding has been reset."}

# --- Vision Flip (AI-powered) ---

@router.post("/vision/flip")
def flip_vision(request: VisionFlipRequest):
    """
    Takes the user's anti-vision and uses the LLM to flip it into
    a positive vision — a bullet list of motivating 'I' statements.
    """
    logger.info("Vision flip requested")
    try:
        vision = agent.flip_vision(request.anti_vision)
        return {"vision": vision}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Vision flip failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate vision. Please try again.")

# --- Profile CRUD ---

@router.get("/{filename}")
def read_profile(filename: str):
    logger.info(f"Reading profile: {filename}")
    try:
        content = ProfileService.get_profile_content(filename)
        return {"filename": filename, "content": content}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Profile '{filename}' not found.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error reading profile {filename}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{filename}")
def update_profile(filename: str, request: ProfileUpdateRequest):
    logger.info(f"Updating profile manually: {filename}")
    try:
        ProfileService.update_profile_content(filename, request.content)
        return {"message": "Profile updated successfully.", "filename": filename}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating profile {filename}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


