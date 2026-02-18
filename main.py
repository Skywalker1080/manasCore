"""
Entry point for the AI Cognitive Journal API.

Run from the project root:
    uvicorn backend.main:app --reload
    python -m backend.main
    python main.py
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
