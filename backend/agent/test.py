from litellm import completion, embedding
from backend.config import Settings

settings =Settings()


response = embedding(
            model = "gemini-embedding-001",
            input = [text]
        )
print(response.data[0].embedding)