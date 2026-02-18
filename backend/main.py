import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import journal
from .config import settings

# Create data directory if it doesn't exist
os.makedirs("backend/data", exist_ok=True)

# Create database tables
# In a real project, we'd use Alembic for migrations
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Cognitive Journal")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(journal.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Cognitive Journal API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
