from backend.config import Settings
from logger.logger import get_logger

# litellm.turn_on_debug()
settings = Settings()
logger = get_logger()

def get_completion(message: str) -> str:
    from litellm import completion
    try:
        logger.info("Attempting primary LLM completion (Gemini)")
        response = completion(
            model="gemini/gemini-3-flash-preview",
            messages=[{"role": "user", "content": message}],
            api_key=settings.GEMINI_API_KEY
        )
        logger.info("Primary LLM completion successful")
        return response.choices[0].message.content
    except Exception as e:
        logger.warning(f"Primary LLM completion failed: {e}. Attempting fallback (Ollama)")
        try:
            response = completion(
                model="ollama/gpt-oss:20b-cloud",
                messages=[{"content": message, "role": "user"}],
                api_base=settings.OLLAMA_BASE_URL
            )
            logger.info("Fallback LLM completion successful")
            return response.choices[0].message.content
        except Exception as fallback_error:
            logger.error(f"Fallback LLM completion failed: {fallback_error}")
            raise fallback_error


def get_embeddings(text) -> list[float]:
    """Get the embeddings for the input user text"""
    from litellm import embedding

    try:
        logger.info("Attempting primary embedding (Gemini)")
        response = embedding(
            model="gemini-embedding-001",
            input=[text],
        )
        logger.info("Primary embedding successful")
        return response.data[0].embedding
    except Exception as e:
        logger.warning(f"Primary embedding failed: {e}. Attempting fallback (Ollama)")
        try:
            response = embedding(
                model="ollama/nomic-embed-text",
                input=[text],
                api_base=settings.OLLAMA_BASE_URL
            )
            logger.info("Fallback embedding successful")
            return response.data[0]['embedding']
        except Exception as fallback_error:
            logger.error(f"Fallback embedding failed: {fallback_error}")
            raise fallback_error
