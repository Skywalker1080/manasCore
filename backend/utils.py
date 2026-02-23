import json
import re
import sqlite_vec

def parse_json_markdown(text: str) -> dict:
    """
    Extracts and parses JSON from a string that might contain markdown code blocks.
    """
    # Try to find JSON in a markdown code block
    pattern = r"```json\s*(.*?)\s*```"
    match = re.search(pattern, text, re.DOTALL)
    
    if match:
        json_content = match.group(1)
    else:
        # Fallback: if no code block, try to find anything between the first { and last }
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
            json_content = text[start:end+1]
        else:
            json_content = text
            
    try:
        return json.loads(json_content)
    except json.JSONDecodeError as e:
        # One last attempt: remove any potential stray comments or trailing commas
        # This is very basic; for a production app, you might want something more robust
        try:
            # Remove trailing commas before closing braces
            cleaned = re.sub(r',\s*([\]}])', r'\1', json_content)
            return json.loads(cleaned)
        except:
            raise ValueError(f"Failed to parse AI response as JSON: {text}") from e


def serialize_embedding(vector: list[float]) -> bytes:
    """
    Serializes a float vector into the byte format expected by sqlite-vec.
    """
    return sqlite_vec.serialize_float32(vector)
