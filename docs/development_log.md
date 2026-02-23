# Development Log — AI Cognitive Journal

This log tracks the architectural decisions, features implemented, and technical challenges encountered during the development of the AI Cognitive Journal.

---

## [2026-02-18] Session 1: Scaffolding & Database Consolidation

### 🎯 Goals
- Set up the initial FastAPI backend structure.
- Configure SQLite with `sqlite-vec` for local-first vector search.
- Define the core data models for journal entries.

### ✨ Features Added
- **FastAPI Scaffolding**: Created the basic directory structure (`models/`, `schemas/`, `routers/`, `data/`).
- **Configuration System**: Implemented `pydantic-settings` for environment-based configuration.
- **SQLite-vec Integration**: Configured a custom SQLAlchemy connection listener to automatically load the `sqlite-vec` extension.
- **Journal API**: Built initial CRUD endpoints (`POST`, `GET`, `DELETE`) for journal entries.
- **Next.js 15 Frontend**: Initialized a dedicated `frontend/` directory using TypeScript, Tailwind CSS, and the App Router.
- **shadcn/ui Integration**: Successfully initialized `shadcn/ui` with Tailwind v4 and added foundational components (`Button`, `Textarea`, `Card`, `Skeleton`).
- **Testing UI & API Client**: Implemented a dedicated `api.ts` fetch wrapper and a main `page.tsx` with a testing interface to verify the full frontend-to-backend loop and database population.

### 🧠 Technical Decisions
- **Model Consolidation**: Initially planned for separate `JournalEntry` and `EmotionRecord` tables. Decided to consolidate these into a single `JournalEntry` model.
    - **Rationale**: Simplifies the initial schema and reflects the user-centric view where a log and its AI metadata are inherently linked. This reduces JOIN overhead for the primary "Recent Entries" view.
- **Field Mapping**:
    - `user_log`: Stores the raw, untouched user input.
    - `emotion` / `sentiment`: Extracted AI metadata.
    - `ai_summary`: Specifically designated for vector embeddings (to be implemented via virtual tables in Phase 2).
- **Local-First Vector Search**: Chose `sqlite-vec` over external vector DBs (like Qdrant or Pinecone) to ensure the application remains a single, portable file without external dependencies.

### 🛠️ Challenges & Solutions
- **SQLite Extension Loading**: Loading C-extensions like `sqlite-vec` in SQLAlchemy requires intercepting the low-level `pysqlite` connection.
    - **Solution**: Used the `@event.listens_for(engine, "connect")` decorator to call `enable_load_extension(True)` and `sqlite_vec.load(dbapi_connection)` immediately upon connection.

### ⏭️ Next Steps
- Initialize the Next.js 15 frontend.
- Implement the AI Pipeline (Phase 2): Integrating LiteLLM for emotion extraction and embedding generation.
- Create the `vec0` virtual table for high-performance vector similarity search.
