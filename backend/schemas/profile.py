from pydantic import BaseModel

class ProfileUpdateRequest(BaseModel):
    content: str
