from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base, create_vec_table, SessionLocal, migrate_db
from backend.routers import journal, profile, analytics, chat, models
from backend.config import settings, DATA_DIR
from backend.services.profile import ProfileService
from backend.services.queue import process_pending_entries
from logger.logger import get_logger

logger = get_logger()

# Create data directory if it doesn't exist
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Initialize profiles
ProfileService.ensure_profiles_setup()

# Create database tables
# In a real project, we'd use Alembic for migrations
Base.metadata.create_all(bind=engine)
create_vec_table()
migrate_db()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle for the FastAPI app."""
    # --- Startup: process any pending entries from previous runs ---
    logger.info("Startup: Checking for pending journal entries…")
    db = SessionLocal()
    try:
        result = process_pending_entries(db)
        if result["total"] > 0:
            logger.info(f"Startup: Queue processing result — {result}")
        else:
            logger.info("Startup: No pending entries.")
    except Exception as e:
        logger.warning(f"Startup: Queue processing encountered an error: {e}")
    finally:
        db.close()

    yield

    # --- Shutdown ---
    logger.info("Shutdown: Application shutting down.")


app = FastAPI(title="AI Cognitive Journal", lifespan=lifespan)

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
app.include_router(chat.router)
app.include_router(models.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Cognitive Journal API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
