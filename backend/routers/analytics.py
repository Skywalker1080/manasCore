"""
Analytics router — exposes aggregated journal data for the dashboard.

Endpoints:
  GET /analytics/sentiment?range=30d
  GET /analytics/emotions?range=30d
  GET /analytics/tags
  GET /analytics/streak
  GET /analytics/modes?range=30d
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.analytics import (
    get_sentiment_over_time,
    get_emotion_frequency,
    get_tag_frequency,
    get_streak_data,
    get_mode_frequency,
    get_hero_insight,
)
from logger.logger import get_logger

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = get_logger()


@router.get("/insight")
def insight(range: str = Query("30d", description="Time range for context"), model_name: str | None = Query(None, description="Optional model to use"), db: Session = Depends(get_db)):
    """Generates a hero insight card based on recent trends."""
    logger.info(f"Fetching hero insight for range={range}")
    return get_hero_insight(db, range, model_name)


@router.get("/sentiment")
def sentiment(range: str = Query("30d", description="Time range, e.g. 7d or 30d"), db: Session = Depends(get_db)):
    """Daily average sentiment values within the requested range."""
    logger.info(f"Fetching sentiment analytics for range={range}")
    return get_sentiment_over_time(db, range)

@router.get("/emotions")
def emotions(range: str = Query("30d", description="Time range"), refresh: bool = Query(False, description="Force refresh insights"), model_name: str | None = Query(None, description="Optional model to use"), db: Session = Depends(get_db)):
    """Emotion frequency counts within the requested range."""
    logger.info(f"Fetching emotion analytics for range={range}")
    return get_emotion_frequency(db, range, refresh, model_name)


@router.get("/tags")
def tags(range: str = Query("30d", description="Time range"), refresh: bool = Query(False, description="Force refresh insights"), model_name: str | None = Query(None, description="Optional model to use"), db: Session = Depends(get_db)):
    """Tag frequency counts and insights."""
    logger.info("Fetching tag analytics")
    return get_tag_frequency(db, range, refresh, model_name)


@router.get("/streak")
def streak(db: Session = Depends(get_db)):
    """Current streak, longest streak, and total entries."""
    logger.info("Fetching streak analytics")
    return get_streak_data(db)


@router.get("/modes")
def modes(range: str = Query("30d", description="Time range"), db: Session = Depends(get_db)):
    """Mode/category frequency counts within the requested range."""
    logger.info(f"Fetching mode analytics for range={range}")
    return get_mode_frequency(db, range)
