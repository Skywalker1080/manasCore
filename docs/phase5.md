# Phase 5: Settings & Polish Implementation Plan

This is the final phase. It wires up user-facing configuration (API keys, Ollama URL, data export), adds a theme toggle, and polishes every page with a consistent sidebar layout, responsive design, micro-animations, and loading skeletons.

---

## Instructions for Claude

> Read this section before starting any work on Phase 5.

- Read `docs/implementation.md` for the overall project vision before touching any file.
- Read `docs/phase1.md` through `docs/phase4.md` to understand what was built in prior phases and avoid duplicating or breaking existing work.
- Explore the existing frontend pages (`frontend/src/app/`) and components (`frontend/src/components/`) before making any UI changes — understand what's already there first.
- The settings page should **never** store the Gemini API key in localStorage or anywhere client-side. It must be written to the `.env` file on disk via a backend endpoint.
- Data export must pull from the real database — do not mock or hard-code anything.
- Polish changes (animations, skeletons, responsive layout) should be applied to all existing pages, not just new ones. Read each page file before editing it.
- Prefer editing existing files over creating new ones. If a layout or component already exists, extend it rather than replacing it.
- Do not add dependencies without checking `pyproject.toml` (backend) and `frontend/package.json` (frontend) first to avoid duplicates.
- Keep the sidebar navigation in a single shared component so adding a new page only requires one file change.
- When implementing the theme toggle, check if a theme provider already exists in `frontend/src/app/layout.tsx` before adding one.

---

## 1. Backend: Settings & Export API

### 1.1 Settings Router (`backend/routers/settings.py`)
- `GET /settings` — return current values of `GEMINI_API_KEY` (masked, e.g. last 4 chars only) and `OLLAMA_BASE_URL` from the loaded settings object.
- `PUT /settings` — accept new values for `GEMINI_API_KEY` and `OLLAMA_BASE_URL`, write them to the `.env` file at the project root, and reload the settings singleton so changes take effect immediately without a server restart.
- Validate that the `.env` file path is always derived from `PROJECT_ROOT` (defined in `backend/config.py`) — never hardcode a relative path.
- Register the router in `backend/main.py`.

### 1.2 Export Router (`backend/routers/export.py`)
- `GET /export/json` — query all `journal_entries` joined with their `emotion_records` and return the full dataset as a downloadable JSON file (set `Content-Disposition: attachment` header).
- `GET /export/markdown` — format the same data as a human-readable Markdown document with each entry as a section, and return it as a downloadable `.md` file.
- Both endpoints should work correctly even if some entries have no `emotion_record` (nullable join).
- Register the router in `backend/main.py`.

---

## 2. Frontend: Settings Page

### 2.1 Settings Page (`frontend/src/app/settings/page.tsx`)
- Build the page with three sections inside shadcn/ui `Card` components: AI Configuration, Data Export, and Appearance.

### 2.2 AI Configuration Section
- Input field for Gemini API key (password type, masked). Show only the last 4 chars of the saved key fetched from `GET /settings`.
- Input field for Ollama base URL with the current value pre-filled.
- A "Save" button that calls `PUT /settings` and shows a success/error toast on completion.

### 2.3 Data Export Section
- "Export as JSON" button that triggers `GET /export/json` and prompts the browser file download.
- "Export as Markdown" button that triggers `GET /export/markdown` and prompts the browser file download.

### 2.4 Appearance Section
- Theme toggle (Light / Dark / System) that updates the active theme via the existing theme provider.
- If no theme provider exists in `layout.tsx` yet, add `next-themes` and wrap the app.

---

## 3. Frontend: Sidebar & Shared Layout

### 3.1 Sidebar Component (`frontend/src/components/sidebar.tsx`)
- Extract the navigation into a standalone reusable component if it isn't already.
- Links: Journal (home `/`), Dashboard (`/dashboard`), Profile (`/profile`), Settings (`/settings`).
- Highlight the active link using Next.js `usePathname`.
- Collapse to a bottom tab bar on mobile (responsive breakpoint).

### 3.2 Root Layout Update (`frontend/src/app/layout.tsx`)
- Import and render the `Sidebar` component so it appears on every page.
- Wrap page content in a two-column layout: sidebar on the left, page content fills the rest.
- Ensure the theme provider wraps the entire tree if it wasn't already there.

---

## 4. Frontend: Polish Across All Pages

### 4.1 Loading Skeletons
- Add `Skeleton` components (already installed from Phase 1) to the Journal page entry list, the Dashboard charts, and the Profile page content — shown while data is fetching.

### 4.2 Micro-animations
- Use Tailwind `transition` and `animate-` utilities for button hover states, card hover lifts, and page fade-ins.
- Add a subtle fade-in on the entry list when entries load for the first time.

### 4.3 Responsive Layout
- Verify all pages are usable on a 375px mobile viewport.
- Dashboard chart grid collapses to a single column on small screens.
- Profile tabs stack vertically on mobile if needed.

### 4.4 Empty States
- Ensure every page has a clear, friendly empty state when there is no data yet (Journal, Dashboard, Profile).

---

## 5. Tasks & Todo List

- [ ] **Backend: Settings Router** — GET and PUT endpoints with masked key display and `.env` file write.
- [ ] **Backend: Export Router** — JSON and Markdown download endpoints with proper headers.
- [ ] **Backend: Register Routers** — add settings and export routers to `main.py`.
- [ ] **Frontend: API Client** — add fetch functions for settings GET/PUT and both export endpoints.
- [ ] **Frontend: Settings Page** — build all three sections (AI config, export, appearance).
- [ ] **Frontend: Theme Toggle** — add `next-themes` if needed and wire up the toggle.
- [ ] **Frontend: Sidebar Component** — extract/create the shared sidebar with active link highlighting.
- [ ] **Frontend: Root Layout** — integrate sidebar and theme provider into the root layout.
- [ ] **Frontend: Skeletons** — add loading skeletons to Journal, Dashboard, and Profile pages.
- [ ] **Frontend: Animations** — apply hover transitions and page fade-ins across all pages.
- [ ] **Frontend: Responsive** — audit and fix layout on mobile viewports for all pages.
- [ ] **Frontend: Empty States** — verify every page handles zero data gracefully.

---

## 6. Verification

- [ ] **Settings Save**: Enter a Gemini API key in the settings page, save it, restart the backend, and confirm `GET /settings` returns the masked new key.
- [ ] **Live Reload**: Change the Ollama URL via the settings page and immediately create a journal entry — verify no server restart was needed for the change to take effect.
- [ ] **JSON Export**: Click "Export as JSON" and confirm the downloaded file contains all entries with their emotion records.
- [ ] **Markdown Export**: Click "Export as Markdown" and open the file — confirm each entry appears as a readable section.
- [ ] **Theme Toggle**: Switch between Light, Dark, and System — confirm preference persists across page refreshes.
- [ ] **Sidebar**: Navigate between all four pages and confirm the active link is highlighted correctly.
- [ ] **Mobile**: Open the app on a 375px viewport (or DevTools emulation) and confirm the sidebar collapses, charts reflow, and no content is clipped.
- [ ] **Skeletons**: Throttle the network in DevTools and confirm skeletons appear before data loads on all pages.
- [ ] **Full Loop**: With Gemini key configured, create an entry → view dashboard → export data → change settings → confirm nothing is broken end-to-end.
