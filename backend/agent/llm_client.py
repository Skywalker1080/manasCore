from backend.config import Settings
from logger.logger import get_logger
from google import genai

# litellm.turn_on_debug()
settings = Settings()
logger = get_logger()

# Initialize Google GenAI client
genai_client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None

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
                model="ollama/gemma3:4b",
                messages=[{"content": message, "role": "user"}],
                api_base=settings.OLLAMA_BASE_URL
            )
            logger.info("Fallback LLM completion successful")
            return response.choices[0].message.content
        except Exception as fallback_error:
            logger.error(f"Fallback LLM completion failed: {fallback_error}")
            raise fallback_error


def get_completion_stream(messages: list[dict]):
    """
    Streaming version of get_completion. Yields content chunks as they arrive.
    Accepts a full messages list (system + history + user).
    Falls back from Gemini to Ollama if the primary model fails.
    """
    from litellm import completion

    try:
        logger.info("Attempting primary streaming LLM completion (Gemini)")
        response = completion(
            model="gemini/gemini-3-flash-preview",
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
            response = completion(
                model="ollama/gemma3:4b",
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
            yield f"\n\n⚠️ I'm having trouble connecting to the AI model right now. Please try again in a moment."


def get_embeddings(text) -> list[float]:
    """Get the embeddings for the input user text"""
    from litellm import embedding
    import numpy as np

    try:
        logger.info("Attempting primary embedding (Google GenAI - Normalized 768)")
        if not genai_client:
            raise ValueError("GEMINI_API_KEY not configured")
            
        # Use gemini-embedding-001
        response = genai_client.models.embed_content(
            model="gemini-embedding-001",
            contents=text
        )
        logger.info("Primary embedding retrieval successful")
        
        # 1. Take the values (might be 3072 or 768 depending on environment)
        raw_values = np.array(response.embeddings[0].values)
        
        # 2. Truncate to 768 for the database
        truncated_values = raw_values[:768]
        
        # 3. Normalize for better accuracy as requested
        # Formula: normed_embedding = values / norm(values)
        norm = np.linalg.norm(truncated_values)
        if norm > 0:
            normed_values = truncated_values / norm
        else:
            normed_values = truncated_values
            
        logger.info(f"Generated normalized embedding with dimensionality: {len(normed_values)}")
        return normed_values.tolist()
        
    except Exception as e:
        logger.warning(f"Primary embedding failed: {e}. Attempting fallback (Ollama)")
        try:
            response = embedding(
                model="ollama/nomic-embed-text",
                input=[text],
                api_base=settings.OLLAMA_BASE_URL
            )
            logger.info("Fallback embedding successful")
            
            result = response.data[0]
            
            logger.info(f"Generated embedding with dimensionality: {len(result['embedding'])}")
            if hasattr(result, 'embedding'):
                return result.embedding
            return result['embedding']
        except Exception as fallback_error:
            logger.error(f"Fallback embedding failed: {fallback_error}")
            raise fallback_error
