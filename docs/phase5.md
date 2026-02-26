# Phase 5: Profile & Polish Implementation Plan

This is the final phase. It wires up user-facing configuration (API keys, Ollama URL) directly into the existing Profile page, adds a theme toggle, and polishes every page with a consistent sidebar layout and loading skeletons.

---

## Instructions for Claude

> Read this section before starting any work on Phase 5.

- Read `docs/implementation.md` for the overall project vision before touching any file.
- Read `docs/phase1.md` through `docs/phase4.md` to understand what was built in prior phases and avoid duplicating or breaking existing work.
- Explore the existing frontend pages (`frontend/src/app/`) and components (`frontend/src/components/`) before making any UI changes — understand what's already there first.
- The profile page (which now acts as settings) should **never** store the Gemini API key in localStorage or anywhere client-side. It must be written to the `.env` file on disk via a backend endpoint.
- Polish changes (skeletons and layout) should be applied to all existing pages, not just new ones. Read each page file before editing it.
- Prefer editing existing files over creating new ones. If a layout or component already exists, extend it rather than replacing it.
- Do not add dependencies without checking `pyproject.toml` (backend) and `frontend/package.json` (frontend) first to avoid duplicates.
- Keep the sidebar navigation in a single shared component so adding a new page only requires one file change.
- When implementing the theme toggle, check if a theme provider already exists in `frontend/src/app/layout.tsx` before adding one.
- Note: Responsive design and micro-animations are explicitly NOT required for this project.

---

## 1. Backend: Settings API (Integrated into Profile)

### 1.1 Configuration Endpoints (`backend/routers/profile.py`)

- `GET /profile/config` — return current values of `GEMINI_API_KEY` (masked, e.g. last 4 chars only) and `OLLAMA_BASE_URL` from the loaded settings object.
- `PUT /profile/config` — accept new values for `GEMINI_API_KEY` and `OLLAMA_BASE_URL`, write them to the `.env` file at the project root, and reload the settings singleton so changes take effect immediately without a server restart.
- Validate that the `.env` file path is always derived from `PROJECT_ROOT` (defined in `backend/config.py`) — never hardcode a relative path.

---

## 2. Frontend: Profile Page Enhancements

### 2.1 Profile Page (`frontend/src/app/profile/page.tsx`)

- Enhance the existing Profile page by adding an "AI Configuration" section or tab.
- Build the new section inside a shadcn/ui `Card` component.

### 2.2 AI Configuration Section

- Input field for Gemini API key (password type, masked). Show only the last 4 chars of the saved key fetched from `GET /profile/config`.
- Input field for Ollama base URL with the current value pre-filled.
- A "Save" button that calls `PUT /profile/config` and shows a success/error toast on completion.

---

## 3. Frontend: Sidebar & Shared Layout

### 3.1 Sidebar Component (`frontend/src/components/sidebar.tsx`)

- Extract the navigation into a standalone reusable component if it isn't already.
- Links: Journal (home `/`), Dashboard (`/dashboard`), Profile (`/profile`).
- Highlight the active link using Next.js `usePathname`.

### 3.2 Root Layout Update (`frontend/src/app/layout.tsx`)

- Import and render the `Sidebar` component so it appears on every page.
- Wrap page content in a two-column layout: sidebar on the left, page content fills the rest.
- Ensure the theme provider wraps the entire tree if it wasn't already there.
- Add Theme toggle (Light / Dark / System) that updates the active theme via the existing theme provider (can be in the sidebar).

---

## 4. Frontend: Polish Across All Pages

### 4.1 Loading Skeletons

- Add `Skeleton` components (already installed from Phase 1) to the Journal page entry list, the Dashboard charts, and the Profile page content — shown while data is fetching.

### 4.2 Empty States

- Ensure every page has a clear, friendly empty state when there is no data yet (Journal, Dashboard, Profile).

---

## 5. Tasks & Todo List

- [ ] **Backend: Profile Config Endpoints** — GET and PUT endpoints with masked key display and `.env` file write.
- [ ] **Frontend: API Client** — add fetch functions for config GET/PUT.
- [ ] **Frontend: Profile Page** — add AI configuration section.
- [ ] **Frontend: Theme Toggle** — add `next-themes` if needed and wire up the toggle.
- [ ] **Frontend: Sidebar Component** — extract/create the shared sidebar with active link highlighting.
- [ ] **Frontend: Root Layout** — integrate sidebar and theme provider into the root layout.
- [ ] **Frontend: Skeletons** — add loading skeletons to Journal, Dashboard, and Profile pages.
- [ ] **Frontend: Empty States** — verify every page handles zero data gracefully.

---

## 6. Verification

- [ ] **Settings Save**: Enter a Gemini API key in the profile page, save it, restart the backend, and confirm `GET /profile/config` returns the masked new key.
- [ ] **Live Reload**: Change the Ollama URL via the profile page and immediately create a journal entry — verify no server restart was needed for the change to take effect.
- [ ] **Theme Toggle**: Switch between Light, Dark, and System — confirm preference persists across page refreshes.
- [ ] **Sidebar**: Navigate between all three pages and confirm the active link is highlighted correctly.
- [ ] **Skeletons**: Throttle the network in DevTools and confirm skeletons appear before data loads on all pages.
- [ ] **Full Loop**: With Gemini key configured, create an entry → view dashboard → view profile config → confirm nothing is broken end-to-end.
