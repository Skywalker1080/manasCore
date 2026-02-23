from backend.schemas.journal import JournalEntryCreate, ExtractorResponse
from backend.agent.llm_client import get_completion, get_embeddings
from backend.agent.prompts import JOURNAL_ANALYSIS_PROMPT
from backend.utils import parse_json_markdown
from logger.logger import get_logger

logger = get_logger()

class Agent():
    def extract(self, message: JournalEntryCreate) -> ExtractorResponse:
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

        # 2. Get raw completion from LLM
        raw_response = get_completion(formatted_prompt)

        # 3. Safely parse JSON from response
        try:
            parsed_data = parse_json_markdown(raw_response)
        except Exception as e:
            logger.error(f"AI response parsing failed: {e}")
            raise ValueError(f"AI response parsing failed: {str(e)}")

        # 4. Construct response
        logger.info("Extraction successful")
        return ExtractorResponse(**parsed_data)

    def embedder(self, content: str) -> list[float]:
        logger.info(f"Generating embedding for content: {content[:50]}...")
        embeddings = get_embeddings(content)
        logger.info("Embedding generation successful")
        return embeddings

