from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base, create_vec_table
from backend.routers import journal, profile, analytics
from backend.config import settings, DATA_DIR
from backend.services.profile import ProfileService

# Create data directory if it doesn't exist
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Initialize profiles
ProfileService.ensure_profiles_setup()

# Create database tables
# In a real project, we'd use Alembic for migrations
Base.metadata.create_all(bind=engine)
create_vec_table()

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
app.include_router(profile.router)
app.include_router(analytics.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Cognitive Journal API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
