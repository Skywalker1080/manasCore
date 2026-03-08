from backend.schemas.journal import JournalEntryCreate, ExtractorResponse
from backend.agent.llm_client import get_completion, get_embeddings
from backend.agent.prompts import JOURNAL_ANALYSIS_PROMPT, VISION_FLIP_PROMPT
from backend.utils import parse_json_markdown
from logger.logger import get_logger
from typing import Optional

logger = get_logger()

class Agent():
    def extract(self, message: JournalEntryCreate, model_name: Optional[str] = None) -> ExtractorResponse:
        """
        Takes a user journal entry, processes it via LLM to extract metadata,
        and returns a structured ExtractorResponse.
        """
        logger.info(f"Extracting metadata for user log: {message.user_log[:50]}...")
        if not message.user_log:
            logger.error("User log is empty")
            raise ValueError("User log cannot be empty")

        # 1. Prepare formatted prompt
        formatted_prompt = JOURNAL_ANALYSIS_PROMPT.format(log=message.user_log)

        # 2. Get raw completion from LLM (with optional user-selected model)
        raw_response = get_completion(formatted_prompt, model_name=model_name)

        # 3. Safely parse JSON from response
        try:
            parsed_data = parse_json_markdown(raw_response)
        except Exception as e:
            logger.error(f"AI response parsing failed: {e}")
            raise ValueError(f"AI response parsing failed: {str(e)}")

        # 4. Construct response
        logger.info("Extraction successful")
        return ExtractorResponse(**parsed_data)

    def flip_vision(self, anti_vision: str, model_name: Optional[str] = None) -> str:
        """
        Takes the user's anti-vision text and flips it into a positive vision
        using the Dan Koe-style VISION_FLIP_PROMPT.

        Returns:
            A string of bullet-point "I" statements (the user's generated vision).
        """
        logger.info("Flipping anti-vision to vision...")
        if not anti_vision or not anti_vision.strip():
            logger.error("Anti-vision text is empty")
            raise ValueError("Anti-vision text cannot be empty")

        formatted_prompt = VISION_FLIP_PROMPT.format(anti_vision=anti_vision.strip())
        raw_response = get_completion(formatted_prompt, model_name=model_name)

        # The response should be a clean bullet list — strip any stray whitespace
        vision = raw_response.strip()
        logger.info("Vision flip successful")
        return vision

    def embedder(self, content: str) -> list[float]:
        logger.info(f"Generating embedding for content: {content[:50]}...")
        embeddings = get_embeddings(content)
        logger.info("Embedding generation successful")
        return embeddings
