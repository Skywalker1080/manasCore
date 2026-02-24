from fastapi import APIRouter, HTTPException

from backend.services.profile import ProfileService
from backend.schemas.profile import ProfileUpdateRequest
from logger.logger import get_logger

router = APIRouter(prefix="/profile", tags=["profile"])
logger = get_logger()

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

