# Phase 3: User Profile System Implementation Plan

This phase implements the "Cognitive" part of the journal—creating a persistent, AI-generated profile that tracks the user's personality, goals, and long-term vision based on their entries.

## 1. Backend: Profile Management

### 1.1 Profile Storage Strategy
- Store profiles as Markdown files in `backend/data/profiles/` for maximum portability and human-readability.
- Files: `personality.md`, `goals.md`, `vision.md`.

### 1.2 Profile Service (`backend/services/profile.py`)
- Implement utilities to read and write to the markdown files.
- Ensure the directory is created automatically on startup.

### 1.3 Profile Router (`backend/routers/profile.py`)
- `GET /profile/{filename}`: Retrieve the current content of a profile section.
- `PUT /profile/{filename}`: Manually update a profile section (User-in-the-loop).
- `POST /profile/generate`: 
    - Fetch recent journal entries.
    - Use LiteLLM (Gemini/Ollama) to synthesize entries into the requested profile section.
    - Return the draft for user approval.

---

## 2. Frontend: Profile Interface

### 2.1 Profile Page (`frontend/src/app/profile/page.tsx`)
- Implement a tabbed interface (Personality, Goals, Vision) using `shadcn/ui` Tabs.
- Use a split-view or toggle:
    - **View Mode**: Rendered Markdown preview.
    - **Edit Mode**: Rich `Textarea` for manual refinements.

### 2.2 AI Synthesis UX
- Add a "✨ Sync with Journal" button to each section.
- Implement a loading state (using the `Skeleton` component) while the AI analyzes the journal history.
- "Diff" View (Optional/Future): Show what the AI wants to change before saving.

---

## 3. Tasks & Todo List

- [ ] **Backend: Setup Directory** - Create `backend/data/profiles`.
- [ ] **Backend: CRUD Router** - Implement basic file read/write API endpoints.
- [ ] **Backend: Synthesis Logic** - Create the prompt engineering for "Profile Synthesis" (Phase 2 LLM integration required).
- [ ] **Frontend: Tabs & Editor** - Build the UI for switching between profile sections.
- [ ] **Frontend: Markdown Rendering** - Add a library (like `react-markdown`) to render the `.md` files beautifully.
- [ ] **Integration** - Connect the "Sync" button to the backend generation endpoint.

---

## 4. Verification

- [ ] **Persistence**: Edit `goals.md` in the UI → check `backend/data/profiles/goals.md` to ensure it's updated.
- [ ] **Context Injection**: Verify that the generated profile correctly references themes found in the journal entries.
