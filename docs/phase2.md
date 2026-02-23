# Phase 2: AI Pipeline Implementation Plan

This phase adds the core AI capability — every journal entry submitted to the backend is automatically enriched with emotion data and a vector embedding. The AI writes directly back onto the existing `JournalEntry` row (updating `emotion`, `sentiment`, and `ai_summary`). Both steps are best-effort: if the LLM is unreachable or no API key is set, the entry still saves with those fields as null.

---

## Instructions for Claude

> Read this section before starting any work on Phase 2.

- Read `docs/implementation.md` for the full project vision before touching any file.
- There is only **one database table**: `journal_entries`. Do not create an `EmotionRecord` model or an `emotion_records` table. The AI fields (`emotion`, `sentiment`, `ai_summary`) are columns on `JournalEntry` and get updated in-place after extraction.
- `ai_summary` stores the AI-generated one-line text summary of the entry — it is not a vector. The embedding vector lives in the `vec_entries` sqlite-vec virtual table, separate from the ORM.
- The `vec_entries` table cannot be managed by SQLAlchemy ORM — create it with raw SQL via a `create_vec_table()` function in `database.py`, called from `main.py` after `Base.metadata.create_all()`.
- All LiteLLM calls go through `backend/agent/llm_client.py` only. Never call `litellm` directly from a router or extractor.
- Both the extraction and embedding steps in `POST /entries` must be wrapped in separate `try/except` blocks. A failure in either must not cause a 500 — the entry is already saved, just update what you can.
- Write tests after building each module. Tests live in `backend/tests/` and must mock all LiteLLM calls — no real API calls in tests.
- Use `uv add` to install new dependencies, never `pip install`.

---

## 1. Database Changes

### 1.1 vec_entries virtual table (`backend/database.py`)
- Add a `create_vec_table()` function that creates the sqlite-vec virtual table `vec_entries` with columns `entry_id` (primary key) and `embedding float[768]` using raw SQL with `IF NOT EXISTS` so it is safe to call on every startup.
- Call `create_vec_table()` in `backend/main.py` immediately after `Base.metadata.create_all()`.

### 1.2 JournalEntry model stays as-is
- No changes needed to `backend/models/journal.py`. The columns `emotion`, `sentiment`, and `ai_summary` are already nullable, which is exactly right — they start null and get filled in by the AI pipeline.

### 1.3 Slim down JournalEntryCreate schema (`backend/schemas/journal.py`)
- `JournalEntryCreate` should only accept `user_log`. Remove `emotion`, `sentiment`, and `ai_summary` from the create schema — the client never sends these, the AI fills them.
- `JournalEntryRead` stays as-is with all fields exposed.

---

## 2. Agent Module

### 2.1 Install LiteLLM
- Run `uv add litellm`.

### 2.2 LiteLLM client (`backend/agent/llm_client.py`)
- Create the `backend/agent/` package with an `__init__.py`.
- Implement `get_completion(messages)` — calls `litellm.completion()` with Gemini (`gemini/gemini-2.0-flash`) as primary, falls back to Ollama (`ollama/llama3.2`) on any exception. Requests JSON output format. Returns the raw response content string.
- Implement `get_embedding(text)` — calls `litellm.embedding()` with Gemini (`gemini/text-embedding-004`) as primary, falls back to Ollama (`ollama/nomic-embed-text`). Returns a `list[float]`.
- Read `OLLAMA_BASE_URL` from the `settings` singleton in `backend/config.py`.

### 2.3 Extraction prompt (`backend/agent/prompts.py`)
- Define a system prompt that instructs the LLM to return only valid JSON with exactly four fields: `emotion` (single word), `sentiment` (integer −1, 0, 1), `summary` (one concise sentence), and `tags` (array of up to 5 topic keywords).
- Implement `build_extraction_messages(content)` that wraps the system prompt and user text into the messages list format expected by `get_completion`.

### 2.4 Emotion extractor (`backend/agent/extractor.py`)
- Implement `extract_emotions(content) → ExtractionResult` where `ExtractionResult` is a Pydantic model with `emotion`, `sentiment`, `summary`, and `tags`.
- Parse the JSON response from `get_completion`, clamp `sentiment` to the −1.0–1.0 range, and return the validated model.

### 2.5 Embedding generator (`backend/agent/embedder.py`)
- Define `EMBEDDING_DIM = 768` as a module-level constant.
- Implement `generate_embedding(text) → list[float]` that delegates to `get_embedding`.
- Implement `serialize_embedding(vector) → bytes` using `sqlite_vec.serialize_float32()` to produce the byte format sqlite-vec expects on insert.

---

## 3. Wire AI Pipeline into POST /entries

### 3.1 Update `backend/routers/journal.py`
- The `POST /entries` handler should: save the `JournalEntry` with just `user_log` first, then in a `try/except` call `extract_emotions()` and update the entry's `emotion`, `sentiment`, and `ai_summary` columns in-place and commit, then in a second `try/except` call `generate_embedding()` + `serialize_embedding()` and insert into `vec_entries` via raw SQL.
- Refresh and return the entry after all steps so the response reflects any AI fields that were filled in.

---

## 4. Frontend Update

### 4.1 Update JournalEntryCreate call (`frontend/src/lib/api.ts`)
- The `createEntry` function already only sends `user_log`, so no change needed there.
- Confirm the `JournalEntry` interface still has `emotion`, `sentiment`, and `ai_summary` as nullable fields — it should already match.

### 4.2 Entry display is already wired (`frontend/src/app/page.tsx`)
- The existing badge rendering for `entry.emotion` and `entry.sentiment` is already in place from Phase 1. No changes needed — the fields will now be populated by AI instead of null.

---

## 5. Tests

### 5.1 Set up pytest (`backend/tests/`)
- Run `uv add --dev pytest pytest-mock`.
- Create `backend/tests/__init__.py` and `backend/tests/conftest.py`.
- `conftest.py` defines two shared fixtures: `test_engine` (in-memory SQLite with sqlite-vec extension loaded, ORM tables and `vec_entries` virtual table created) and `test_db` (a session bound to that engine).

### 5.2 LiteLLM client and prompt tests (`backend/tests/test_llm_client.py`)
- Test that `get_completion` returns the response content (mock `litellm.completion`).
- Test that `get_completion` falls back to Ollama when the primary call raises an exception.
- Test that `get_embedding` returns a list of the correct length (mock `litellm.embedding`).
- Test that `build_extraction_messages` returns two messages with correct roles and that the journal text appears in the user message.

### 5.3 Extractor tests (`backend/tests/test_extractor.py`)
- Test that `extract_emotions` returns an `ExtractionResult` with the expected fields (mock `get_completion` with a valid JSON string).
- Test that `sentiment` is clamped to 1.0 when the LLM returns a value above 1.
- Test that `sentiment` is clamped to −1.0 when the LLM returns a value below −1.

### 5.4 Embedder tests (`backend/tests/test_embedder.py`)
- Test that `generate_embedding` returns a float list of length `EMBEDDING_DIM` (mock `get_embedding`).
- Test that `serialize_embedding` returns bytes of length `EMBEDDING_DIM * 4`.

### 5.5 Router tests (`backend/tests/test_journal_router.py`)
- Override `get_db` with the `test_db` fixture via `app.dependency_overrides`.
- Test that `POST /entries` succeeds and returns the entry with null AI fields when both AI steps raise exceptions.
- Test that `POST /entries` returns `emotion`, `sentiment`, and `ai_summary` populated when `extract_emotions` returns a valid mocked result.
- Test that `GET /entries` returns the AI fields on entries that have them set.

---

## 6. Tasks & Todo List

- [ ] **vec_entries table** — add `create_vec_table()` to `database.py`, call it in `main.py`.
- [ ] **Slim JournalEntryCreate** — remove AI fields from the create schema in `schemas/journal.py`.
- [ ] **Install LiteLLM** — `uv add litellm`.
- [ ] **LiteLLM client** — create `backend/agent/llm_client.py` with completion + embedding + fallback.
- [ ] **Prompts** — create `backend/agent/prompts.py` with system prompt and message builder.
- [ ] **Extractor** — create `backend/agent/extractor.py`.
- [ ] **Embedder** — create `backend/agent/embedder.py`.
- [ ] **Update POST /entries** — wire extraction + embedding into the journal router.
- [ ] **Set up pytest** — `uv add --dev pytest pytest-mock`, create `conftest.py` with fixtures.
- [ ] **Write tests** — cover LiteLLM client, prompts, extractor, embedder, and router.

---

## 7. Verification

- [ ] **vec_entries created** — start the server and confirm `vec_entries` appears alongside `journal_entries` in `sqlite_master`.
- [ ] **No-key graceful degradation** — `POST /entries` with no `.env` returns `201` with `emotion`, `sentiment`, `ai_summary` all null.
- [ ] **Full AI pipeline** — add `GEMINI_API_KEY` to `.env`, submit an entry, confirm the response has `emotion`, `sentiment`, and `ai_summary` populated.
- [ ] **Embedding stored** — query `vec_entries` and confirm the entry ID is present.
- [ ] **Frontend display** — submit from `http://localhost:3000` and confirm the emotion and sentiment badges render on the entry card.
- [ ] **All tests pass** — `python -m pytest backend/tests/ -v` with no failures.
