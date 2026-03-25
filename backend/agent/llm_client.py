from contextvars import ContextVar
from typing import Optional

from google import genai

from backend.config import Settings
from logger.logger import get_logger

settings = Settings()
logger = get_logger()

# Initialize Google GenAI client
genai_client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None

# Default model constants
DEFAULT_PRIMARY_MODEL = "gemini/gemini-2.5-flash"
DEFAULT_FALLBACK_MODEL = "ollama/gemma3:4b"

# Captures route information for the most recent streaming request in this context.
_LAST_STREAM_META: ContextVar[dict] = ContextVar("last_stream_meta", default={})


def get_last_stream_meta() -> dict:
    return _LAST_STREAM_META.get({})


def _resolve_model(model_name: Optional[str] = None) -> tuple[str, bool]:
    """
    Resolve which model to use and whether it's an Ollama model.
    Returns (model_string, is_ollama).
    """
    if model_name:
        if not model_name.startswith("ollama/"):
            model_name = f"ollama/{model_name}"
        return model_name, True
    return DEFAULT_PRIMARY_MODEL, False


def get_completion(message: str, model_name: Optional[str] = None) -> str:
    from litellm import completion

    resolved_model, is_ollama = _resolve_model(model_name)

    if is_ollama:
        try:
            logger.info(f"LLM completion with user-selected model: {resolved_model}")
            response = completion(
                model=resolved_model,
                messages=[{"role": "user", "content": message}],
                api_base=settings.OLLAMA_BASE_URL,
            )
            logger.info("User-selected LLM completion successful")
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"User-selected LLM completion failed: {e}")
            raise e

    try:
        logger.info("Attempting primary LLM completion (Gemini)")
        response = completion(
            model=DEFAULT_PRIMARY_MODEL,
            messages=[{"role": "user", "content": message}],
            api_key=settings.GEMINI_API_KEY,
        )
        logger.info("Primary LLM completion successful")
        return response.choices[0].message.content
    except Exception as e:
        logger.warning(f"Primary LLM completion failed: {e}. Attempting fallback (Ollama)")
        try:
            response = completion(
                model=DEFAULT_FALLBACK_MODEL,
                messages=[{"content": message, "role": "user"}],
                api_base=settings.OLLAMA_BASE_URL,
            )
            logger.info("Fallback LLM completion successful")
            return response.choices[0].message.content
        except Exception as fallback_error:
            logger.error(f"Fallback LLM completion failed: {fallback_error}")
            raise fallback_error


def get_completion_stream(messages: list[dict], model_name: Optional[str] = None):
    """
    Streaming version of get_completion. Yields content chunks as they arrive.
    Accepts a full messages list (system + history + user).
    Falls back from Gemini to Ollama if the primary model fails.
    """
    from litellm import completion

    resolved_model, is_ollama = _resolve_model(model_name)

    if is_ollama:
        try:
            logger.info(f"Streaming with user-selected model: {resolved_model}")
            _LAST_STREAM_META.set({"route": "user_selected_ollama"})
            response = completion(
                model=resolved_model,
                messages=messages,
                api_base=settings.OLLAMA_BASE_URL,
                stream=True,
            )
            for chunk in response:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content
            logger.info("User-selected streaming LLM completion finished")
            return
        except Exception as e:
            logger.error(f"User-selected streaming failed: {e}")
            _LAST_STREAM_META.set({"route": "user_selected_ollama_error", "error": str(e)})
            yield f"\n\nError with model {resolved_model}: {str(e)}"
            return

    try:
        logger.info("Attempting primary streaming LLM completion (Gemini)")
        _LAST_STREAM_META.set({"route": "gemini_primary"})
        response = completion(
            model=DEFAULT_PRIMARY_MODEL,
            messages=messages,
            api_key=settings.GEMINI_API_KEY,
            stream=True,
        )
        for chunk in response:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content
        logger.info("Primary streaming LLM completion finished")
    except Exception as e:
        logger.warning(f"Primary streaming failed: {e}. Attempting fallback (Ollama)")
        try:
            _LAST_STREAM_META.set({"route": "ollama_fallback", "primary_error": str(e)})
            response = completion(
                model=DEFAULT_FALLBACK_MODEL,
                messages=messages,
                api_base=settings.OLLAMA_BASE_URL,
                stream=True,
            )
            for chunk in response:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content
            logger.info("Fallback streaming LLM completion finished")
        except Exception as fallback_error:
            logger.error(f"Fallback streaming failed: {fallback_error}")
            _LAST_STREAM_META.set(
                {
                    "route": "stream_failed",
                    "primary_error": str(e),
                    "fallback_error": str(fallback_error),
                }
            )
            yield "\n\nI'm having trouble connecting to the AI model right now. Please try again in a moment."


def get_embeddings(text) -> list[float]:
    """Get embeddings for user text."""
    import numpy as np
    from litellm import embedding

    try:
        logger.info("Attempting primary embedding (Google GenAI - normalized 768)")
        if not genai_client:
            raise ValueError("GEMINI_API_KEY not configured")

        response = genai_client.models.embed_content(model="gemini-embedding-001", contents=text)
        logger.info("Primary embedding retrieval successful")

        raw_values = np.array(response.embeddings[0].values)
        truncated_values = raw_values[:768]

        norm = np.linalg.norm(truncated_values)
        normed_values = (truncated_values / norm) if norm > 0 else truncated_values
        logger.info(f"Generated normalized embedding with dimensionality: {len(normed_values)}")
        return normed_values.tolist()
    except Exception as e:
        logger.warning(f"Primary embedding failed: {e}. Attempting fallback (Ollama)")
        try:
            response = embedding(
                model="ollama/nomic-embed-text",
                input=[text],
                api_base=settings.OLLAMA_BASE_URL,
            )
            logger.info("Fallback embedding successful")

            result = response.data[0]
            if hasattr(result, "embedding"):
                return result.embedding
            return result["embedding"]
        except Exception as fallback_error:
            logger.error(f"Fallback embedding failed: {fallback_error}")
            raise fallback_error
