# Phase 3: User Profile System Implementation Plan

This phase implements the "Cognitive" part of the journal—using a persistent profile that tracks the user's personality, goals, and long-term vision, manually provided by the user via an onboarding form, and used by the AI as context.

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

---

## 2. Frontend: Profile Interface

### 2.1 Profile Page (`frontend/src/app/profile/page.tsx`)

- Implement a tabbed interface (Personality, Goals, Vision) using `shadcn/ui` Tabs.
- Use a split-view or toggle:
  - **View Mode**: Rendered Markdown preview.
  - **Edit Mode**: Rich `Textarea` for manual refinements.

### 2.2 Profile Onboarding UX

- User onboarding form where users can construct their personality, goals, and vision manually.
- Editor tab to refine the text freely within the application.

---

## 3. Tasks & Todo List

- [x] **Backend: Setup Directory** - Create `backend/data/profiles`.
- [x] **Backend: CRUD Router** - Implement basic file read/write API endpoints.
- [x] **Frontend: Tabs & Editor** - Build the UI for switching between profile sections.
- [x] **Frontend: Markdown Rendering** - Add a library (like `remark`/`remark-html`) to render the `.md` files beautifully.
- [x] **Frontend: Onboarding** - Build the initial setup form for goals, vision, and AI personality.

---

## 4. Verification

- [ ] **Persistence**: Edit `goals.md` in the UI → check `backend/data/profiles/goals.md` to ensure it's updated.
- [ ] **Context Injection**: Verify that the manually provided profile traits are correctly loaded into LLM prompts later in chat/analysis logic.
