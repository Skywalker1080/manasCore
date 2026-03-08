"""
Models router — exposes available Ollama models to the frontend.

GET /models/ollama  — lists models downloaded on the user's local Ollama instance
"""

import httpx
from fastapi import APIRouter, HTTPException
from backend.config import settings
from logger.logger import get_logger

router = APIRouter(prefix="/models", tags=["models"])
logger = get_logger()


@router.get("/ollama")
async def list_ollama_models():
    """
    Fetches the list of models available on the user's local Ollama instance
    by calling the Ollama API at /api/tags.
    """
    ollama_url = f"{settings.OLLAMA_BASE_URL}/api/tags"
    logger.info(f"Fetching Ollama models from {ollama_url}")

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(ollama_url)
            response.raise_for_status()
            data = response.json()

        models = [
            {
                "name": m["name"],
                "size": m.get("size"),
                "parameter_size": m.get("details", {}).get("parameter_size"),
                "family": m.get("details", {}).get("family"),
                "quantization_level": m.get("details", {}).get("quantization_level"),
            }
            for m in data.get("models", [])
        ]

        logger.info(f"Found {len(models)} Ollama models")
        return {"models": models}

    except httpx.ConnectError:
        logger.warning("Ollama is not running or unreachable")
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Please start Ollama and try again.",
        )
    except Exception as e:
        logger.error(f"Error fetching Ollama models: {e}")
        raise HTTPException(status_code=500, detail=str(e))
