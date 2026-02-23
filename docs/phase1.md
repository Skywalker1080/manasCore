# Phase 1: Scaffolding & Database Implementation Plan

This phase focuses on setting up the foundational local-first architecture using FastAPI and Next.js, with a unified SQLite database for relational and vector data.

## 1. Backend Scaffolding (FastAPI)

### 1.1 Environment & Dependencies
- Initialize a Python virtual environment.
- Create `backend/requirements.txt` with:
    - `fastapi`, `uvicorn`, `pydantic-settings`, `sqlalchemy`
    - `sqlite-vec` (for vector search support)
    - `python-multipart`

### 1.2 Configuration (`backend/config.py`)
- Define `Settings` class using `pydantic-settings`:
    - `DATABASE_URL`: `sqlite:///./data/journal.db`
    - `GEMINI_API_KEY`: (String, optional for now)
    - `OLLAMA_BASE_URL`: (Default: `http://localhost:11434`)

### 1.3 Database Setup (`backend/database.py`)
- Configure SQLAlchemy engine.
- **Critical:** Implement a listener to load the `sqlite-vec` extension when the SQLite connection is opened.
- Setup `SessionLocal` and `Base` declarative class.

### 1.4 Models (`backend/models/`)
- `journal.py`: `JournalEntry` with `id`, `date`, `emotion`, `sentiment`, `user_log`, `ai_summary` (vector embedding), `updated_at`.

### 1.5 Schemas (`backend/schemas/`)
- Pydantic models for `JournalEntryCreate` and `JournalEntryRead`.

### 1.6 Journal Router (`backend/routers/journal.py`)
- `POST /entries`: Create journal entry (AI fields stubbed for Phase 2).
- `GET /entries`: List entries ordered by date (descending).
- `GET /entries/{id}`: Fetch single entry.
- `DELETE /entries/{id}`: Delete entry.

### 1.7 Main Entry Point (`backend/main.py`)
- Initialize FastAPI app.
- Setup CORS for `http://localhost:3000`.
- Include `journal` router.
- Create `./data/` directory if it doesn't exist.

---

## 2. Frontend Scaffolding (Next.js)

### 2.1 Project Initialization
- Initialize Next.js 15 with TypeScript, Tailwind CSS, and App Router in `frontend/`.
- Install `shadcn/ui` and initialize.
- Add necessary components: `Button`, `Textarea`, `Card`, `Skeleton`.

### 2.2 Theme & Layout (`frontend/src/app/layout.tsx`)
- Implement a dark-mode first layout.
- Setup `Inter` or `Geist` font.
- Create a basic sidebar navigation structure.

### 2.3 API Client (`frontend/src/lib/api.ts`)
- Create a lightweight fetch wrapper to handle requests to `http://localhost:8000`.

### 2.4 Journal Page (`frontend/src/app/page.tsx`)
- Build a clean, distraction-free writing interface.
- Implement a simple "Recent Entries" list below the input.

---

## 3. Verification & Milestones

- [x] **DB Check:** Run `main.py` and verify `journal.db` is created in `backend/data/`.
- [x] **Extension Check:** Confirm `sqlite-vec` loads without errors (via a simple `SELECT vec_version()` test).
- [x] **API Check:** Verify `POST /entries` via Swagger UI (`/docs`).
- [x] **Full Loop:** Submit a journal entry from the Next.js frontend and see it appear in the "Recent Entries" list.
