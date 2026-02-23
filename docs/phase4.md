# Phase 4: Visualization Dashboard Implementation Plan

This phase brings the journal data to life by exposing aggregated analytics from the backend and rendering them as interactive charts on a dedicated dashboard page.

---

## Instructions for Claude

> Read this section before starting any work on Phase 4.

- Read `docs/implementation.md` for the overall project vision and `docs/phase2.md` specifically — the analytics queries depend on `emotion_records` being populated by the Phase 2 AI pipeline.
- Explore `backend/models/emotion.py` and `backend/models/journal.py` before writing any queries — understand the exact column names and relationships so the SQL joins are correct.
- The `tags` column in `emotion_records` is stored as a JSON string, not an array. Any tag frequency query must deserialise it first — account for this in the analytics service logic.
- All analytics endpoints must return gracefully when the database is empty. Never let a missing row cause a 500 error.
- The `range` query parameter should default to `30d` if not provided. Support at minimum `7d` and `30d`.
- Before installing `recharts` or `date-fns`, check `frontend/package.json` to confirm they are not already present.
- Read the existing `frontend/src/app/page.tsx` and any shared layout files before touching the sidebar navigation — understand what navigation structure already exists before adding to it.
- Each chart should be its own self-contained component in `frontend/src/components/` rather than everything inline in the dashboard page.
- Do not reach for a third-party tag cloud library — use shadcn/ui `Badge` components as specified.

---

## 1. Backend: Analytics API

### 1.1 Analytics Service (`backend/services/analytics.py`)
- Create a service layer that holds all the query logic so the router stays thin.
- Implement a helper that accepts a `range` parameter (e.g. `7d`, `30d`) and converts it to a `datetime` cutoff for filtering.
- Implement individual query functions for each analytics type: daily sentiment averages, emotion frequency counts, tag frequency counts, and journaling streak calculation.
- Streak logic: count consecutive calendar days (ending today) that have at least one journal entry.

### 1.2 Analytics Router (`backend/routers/analytics.py`)
- Register the router under the `/analytics` prefix in `backend/main.py`.
- `GET /analytics/sentiment?range=7d` — returns a list of `{ date, average_sentiment }` objects for each day in the range that has entries.
- `GET /analytics/emotions?range=30d` — returns a list of `{ emotion, count }` objects sorted by frequency.
- `GET /analytics/tags` — returns a list of `{ tag, count }` objects across all entries, sorted by frequency.
- `GET /analytics/streak` — returns `{ current_streak, longest_streak, total_entries }`.
- All endpoints should return an empty/zero result gracefully if no entries exist yet.

### 1.3 Register Models and Router
- Ensure `EmotionRecord` is imported so SQLAlchemy can resolve the join to `emotion_records`.
- Add the analytics router to the router list in `backend/main.py`.

---

## 2. Frontend: Dashboard Page

### 2.1 Install Recharts
- Add `recharts` to the frontend dependencies via `npm install recharts`.
- Add `date-fns` for date formatting in chart labels (`npm install date-fns`).

### 2.2 API Client Extensions (`frontend/src/lib/api.ts`)
- Add TypeScript interfaces for each analytics response shape: `SentimentPoint`, `EmotionCount`, `TagCount`, `StreakData`.
- Add fetch functions for each of the four new endpoints, mirroring the existing pattern.

### 2.3 Dashboard Page (`frontend/src/app/dashboard/page.tsx`)
- Create the page as a client component that fetches all four analytics endpoints on mount.
- Show a loading skeleton while data is being fetched.
- Lay out the page in a two-column responsive grid using Tailwind, each chart inside a `Card` from shadcn/ui.

### 2.4 Sentiment Over Time Chart
- Use a Recharts `AreaChart` with a smooth curve.
- X-axis: date labels formatted as `MMM d`.
- Y-axis: sentiment value from −1 to 1, with a reference line at 0.
- Show a friendly empty state message if fewer than 2 data points exist.

### 2.5 Emotion Breakdown Chart
- Use a Recharts `BarChart` (horizontal bars work well here).
- X-axis: count. Y-axis: emotion label.
- Limit to the top 8 emotions to keep the chart readable.

### 2.6 Topic Tag Cloud
- Use a simple flex-wrap layout of `Badge` components from shadcn/ui rather than a third-party tag cloud library.
- Scale the badge font size based on relative tag frequency (small/medium/large tiers).
- Cap at 30 tags to avoid visual clutter.

### 2.7 Journaling Streak Card
- Display `current_streak`, `longest_streak`, and `total_entries` as three stat numbers inside a single `Card`.
- No chart needed — large typographic numbers with labels are sufficient.

### 2.8 Sidebar Navigation
- Add a "Dashboard" link to the sidebar or nav (whichever navigation component exists from Phase 1/3) pointing to `/dashboard`.

---

## 3. Tasks & Todo List

- [ ] **Backend: Analytics Service** — implement query helpers for sentiment, emotions, tags, and streak.
- [ ] **Backend: Analytics Router** — wire up the four endpoints, register in `main.py`.
- [ ] **Frontend: Dependencies** — install `recharts` and `date-fns`.
- [ ] **Frontend: API Client** — add interfaces and fetch functions for all analytics endpoints.
- [ ] **Frontend: Dashboard Page** — create the page shell with loading state and grid layout.
- [ ] **Frontend: Sentiment Chart** — implement the `AreaChart` component.
- [ ] **Frontend: Emotion Chart** — implement the `BarChart` component.
- [ ] **Frontend: Tag Cloud** — implement the badge-based tag display.
- [ ] **Frontend: Streak Card** — implement the stat card.
- [ ] **Frontend: Navigation** — add the Dashboard link to the sidebar.

---

## 4. Verification

- [ ] **Empty State**: Start with a fresh DB and open the dashboard — all charts should render a friendly empty state without crashing.
- [ ] **Sentiment Chart**: Add 5+ entries over multiple days with Gemini key set, then verify the area chart shows the correct daily averages.
- [ ] **Emotion Chart**: Confirm the bar chart matches the emotion distribution visible in the raw entries.
- [ ] **Tag Cloud**: Verify tags from `emotion_records` appear and that higher-frequency tags render larger.
- [ ] **Streak**: Create entries on consecutive days and verify `current_streak` increments correctly; skip a day and verify it resets.
- [ ] **Range Filter**: Call `/analytics/sentiment?range=7d` vs `?range=30d` and confirm the returned data window differs.
