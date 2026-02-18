# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Cognitive Journal — a FastAPI backend that lets users log emotions/thoughts, with AI processing for sentiment extraction and vector embeddings via sqlite-vec.

## Commands

```bash
# Install dependencies (uses uv package manager)
uv sync

# Run the dev server (always from project root)
python main.py                          # entry point with auto-reload
python -m backend                       # via __main__.py
uvicorn backend.main:app --reload       # direct uvicorn

# Add a dependency
uv add <package>
```

No test framework is configured yet.

## Architecture

```
main.py              → Root entry point (starts uvicorn)
backend/
  __main__.py        → Enables `python -m backend`
  main.py            → FastAPI app setup, CORS, router registration, DB table creation
  config.py          → Pydantic Settings (DATABASE_URL, API keys); defines PROJECT_ROOT and DATA_DIR
  database.py        → SQLAlchemy engine, session factory, sqlite-vec extension loading
  models/            → SQLAlchemy ORM models (JournalEntry)
  schemas/           → Pydantic request/response schemas
  routers/           → FastAPI route handlers (CRUD on /entries)
logger/              → Standalone logging utility (file + console handlers)
data/                → SQLite database storage (auto-created)
```

## Key Patterns

- **Path resolution**: All file paths (DB, logs, .env) resolve from `PROJECT_ROOT = Path(__file__).resolve().parent.parent` in `config.py` and `logger.py`. Never use hardcoded relative paths like `"./data"` — always derive from `PROJECT_ROOT` or `DATA_DIR`.
- **Relative imports within `backend/`**: Use `.module` for same-level, `..module` for parent-level (e.g., `from ..database import get_db`). Do not use absolute imports for intra-package references.
- **Dependency injection**: Database sessions are provided via FastAPI's `Depends(get_db)` pattern in routers.
- **Settings**: `backend/config.py` loads from environment variables and `.env` file via `pydantic_settings.BaseSettings`. Access via the singleton `settings` object.
- **sqlite-vec**: Loaded as a SQLite extension on every new connection via SQLAlchemy's `event.listens_for(engine, "connect")`.

## Tech Stack

- Python 3.11+ / uv package manager
- FastAPI + Uvicorn
- SQLAlchemy 2.0+ with SQLite + sqlite-vec
- Pydantic v2 for validation and settings
