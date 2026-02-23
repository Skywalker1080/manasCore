# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Cognitive Journal — a local-first FastAPI + Next.js app where users log emotions/thoughts. The backend auto-extracts mood, sentiment, and tags via LiteLLM (Gemini primary, Ollama fallback) and stores vector embeddings in sqlite-vec for future chat/RAG.

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

# Run tests
python -m pytest backend/tests/ -v
```

## Architecture

```
main.py              → Root entry point (starts uvicorn)
backend/
  __main__.py        → Enables `python -m backend`
  main.py            → FastAPI app setup, CORS, router registration, DB + vec table creation
  config.py          → Pydantic Settings (DATABASE_URL, API keys); defines PROJECT_ROOT and DATA_DIR
  database.py        → SQLAlchemy engine, session factory, sqlite-vec extension loading, create_vec_table()
  models/
    journal.py       → JournalEntry ORM model (user_log, emotion, sentiment, ai_summary, date, updated_at)
  schemas/
    journal.py       → JournalEntryCreate (user_log only) / JournalEntryRead (all fields including AI ones)
  routers/
    journal.py       → CRUD on /entries; POST auto-triggers AI extraction + embedding (best-effort)
    analytics.py     → GET /analytics/sentiment|tags|streak
    profile.py       → GET/PUT /profile/{filename}, POST /profile/generate
    settings.py      → GET/PUT /settings (masked API key display, writes to .env)
    export.py        → GET /export/json and /export/markdown (file downloads)
  agent/
    llm_client.py    → LiteLLM wrapper: get_completion() and get_embedding() with Gemini→Ollama fallback
    prompts.py       → Structured JSON extraction prompt template
    extractor.py     → extract_emotions(text) → ExtractionResult (mood, emotion, sentiment, summary, tags)
    embedder.py      → generate_embedding(text) → list[float]; serialize_embedding() for sqlite-vec
  services/
    profile.py       → File read/write helpers for personality.md, goals.md, vision.md
    analytics.py     → Query helpers for sentiment averages, emotion counts, tag counts, streak
  tests/
    conftest.py      → In-memory SQLite + sqlite-vec fixtures (test_engine, test_db)
    test_models.py   → ORM model and schema tests
    test_llm_client.py → LiteLLM client + prompt builder tests (all mocked)
    test_extractor.py  → Emotion extractor tests (mocked LLM)
    test_embedder.py   → Embedding generator + serialisation tests
    test_journal_router.py → Router integration tests (mocked AI, overridden DB)
data/
  journal.db         → SQLite database (auto-created); contains journal_entries, emotion_records, vec_entries
  profiles/
    personality.md   → AI-generated personality profile
    goals.md         → AI-generated goals profile
    vision.md        → AI-generated vision profile
logger/              → Standalone logging utility (file + console handlers)
frontend/
  src/app/
    page.tsx         → Journal entry page (write + list entries with emotion badges)
    dashboard/       → Visualization dashboard (sentiment chart, emotion chart, tag cloud, streak)
    profile/         → Tabbed markdown editor for personality/goals/vision profiles
    settings/        → API key config, Ollama URL, data export, theme toggle
  src/components/    → Shared UI components (shadcn/ui + chart sub-components)
  src/lib/api.ts     → Typed fetch wrapper for all backend endpoints
```

## Key Patterns

- **Path resolution**: All file paths (DB, logs, .env) resolve from `PROJECT_ROOT = Path(__file__).resolve().parent.parent` in `config.py` and `logger.py`. Never use hardcoded relative paths like `"./data"` — always derive from `PROJECT_ROOT` or `DATA_DIR`.
- **Relative imports within `backend/`**: Use `.module` for same-level, `..module` for parent-level (e.g., `from ..database import get_db`). Do not use absolute imports for intra-package references.
- **Dependency injection**: Database sessions are provided via FastAPI's `Depends(get_db)` pattern in routers.
- **Settings**: `backend/config.py` loads from environment variables and `.env` file at the project root via `pydantic_settings.BaseSettings`. Access via the singleton `settings` object.
- **sqlite-vec**: Loaded as a SQLite extension on every new connection via SQLAlchemy's `event.listens_for(engine, "connect")`. The `vec_entries` virtual table is created separately via `create_vec_table()` called on startup — SQLAlchemy ORM cannot manage virtual tables.
- **Single table**: There is only one ORM table — `journal_entries`. AI fields (`emotion`, `sentiment`, `ai_summary`) are nullable columns on `JournalEntry` that get updated in-place after extraction. There is no separate `EmotionRecord` table.
- **AI pipeline (best-effort)**: In `POST /entries`, emotion extraction and embedding generation are each wrapped in `try/except`. If the LLM is unavailable the entry is still saved with AI fields as null.
- **ai_summary**: Stores the AI-generated one-line text summary. The vector embedding lives in `vec_entries`, not in this column.
- **Test isolation**: Tests use an in-memory SQLite database with the sqlite-vec extension loaded. The FastAPI `get_db` dependency is overridden per test via `app.dependency_overrides`. LiteLLM calls are always mocked — never make real API calls in tests.

## Tech Stack

- Python 3.11+ / uv package manager
- FastAPI + Uvicorn
- SQLAlchemy 2.0+ with SQLite + sqlite-vec
- Pydantic v2 for validation and settings
- LiteLLM (Gemini `gemini-2.0-flash` + `text-embedding-004` primary; Ollama `llama3.2` + `nomic-embed-text` fallback)
- pytest + pytest-mock for backend testing
- Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- Recharts for dashboard visualizations
- next-themes for dark/light/system theme toggle
