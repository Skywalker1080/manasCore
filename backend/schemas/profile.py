from pydantic import BaseModel
from typing import Optional


class ProfileUpdateRequest(BaseModel):
    content: str


class VisionFlipRequest(BaseModel):
    anti_vision: str


class ConfigResponse(BaseModel):
    gemini_api_key_masked: str
    ollama_base_url: str


class ConfigUpdateRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    ollama_base_url: Optional[str] = None

