<p align="center">
  <img src="https://placehold.co/1200x320/0f172a/e2e8f0?text=manasCore+Banner" alt="manasCore Banner Placeholder" />
</p>

<h1 align="center">manasCore - Your Inner Journal</h1>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/release-v0.1.0-informational?style=for-the-badge" alt="Release" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/LiteLLM-111111?style=for-the-badge" alt="LiteLLM" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
</p>

## About The Project

manasCore is a local-first AI journaling app designed to help users reflect clearly, build consistent self-awareness, and track growth over time with private journaling workflows that can run on-device while still supporting cloud AI when needed.

- Chat with your journal using local RAG for context-aware, memory-backed reflections.
- Local-first architecture that keeps the core journaling experience reliable on your machine.
- Intelligent fallback mechanism that maintains continuity across local and cloud model routes.
- Optimized runtime for low-parameter local models to keep performance practical on everyday hardware.
- Complete privacy-first storage with journal data persisted locally by default.
- Full ownership of your journal data, with no forced external dependency for your core experience.

## Philosophy & Vision

I became deeply obsessed with journaling because I believed in this idea: _"The fastest way to change is to obsessively reflect back on your life and do not lie to yourself about what life it is creating."_ ~ Dan Koe.

But I learned that writing consistently is only one part of the problem. Journaling was easy to start, yet often overwhelming to continue. I struggled to articulate what I truly felt, and even when emotions were loud in my head, I could not turn them into action. Over time, my journal became messier, and the same question kept returning: what now, and where is the feedback loop?

I looked for AI journaling products, but most charged around $20 a month (about ₹9,000 in some plans) for features powered by expensive API usage. At the same time, open-source models were rapidly improving and becoming practical even on low-end machines. That shift inspired manasCore: a local-first journal that brings powerful AI reflection, pattern detection, and actionable feedback without locking users behind recurring AI pricing.

This app was born from my own emotional struggle. I was not good at expressing what I felt, and I often felt emotionally weak. Studying emotional intelligence gave me a way forward. While trying to fix my own life, I built manasCore, and it helped me understand myself, see patterns I kept repeating, take action, and track real progress. The vision is simple: make deep, honest self-reflection private, practical, and accessible to everyone.

## Product Showcase

| Home Page | Chat with Journal | Dashboard |
| --- | --- | --- |
| ![Home Page Placeholder](https://placehold.co/640x360/f8fafc/0f172a?text=Home+Page+Screenshot) | ![Chat with Journal Placeholder](https://placehold.co/640x360/ecfeff/0f172a?text=Chat+with+Journal+Screenshot) | ![Dashboard Placeholder](https://placehold.co/640x360/f0fdf4/0f172a?text=Dashboard+Screenshot) |
| The home page is your focused entry point to capture thoughts quickly and start daily reflection without friction. | The chat page lets you talk to your journal with local RAG-backed context, so responses stay relevant to your own history. | The dashboard gives you a clear view of mood patterns, consistency, and long-term progress across your journaling journey. |

## Quick Start

1. **Download and install Ollama** from [ollama.com/download](https://ollama.com/download).
2. **Pull the recommended local model (`gemma3:4b`)**:
   ```bash
   ollama pull gemma3:4b
   ```
3. **Ensure Ollama is running** in the background.
4. **Install `uv`** (required for backend dependencies):
   - macOS/Linux:
     ```bash
     curl -LsSf https://astral.sh/uv/install.sh | sh
     ```
   - Windows:
     ```powershell
     powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
     ```
5. **Install app dependencies** from the project root:
   ```bash
   npm run install:all
   ```
6. **Run the app**:
   - Development:
     ```bash
     npm run dev
     ```
   - Production:
     ```bash
     npm start
     ```

## How to Run

1. **Install dependencies** (from the project root):

   ```bash
   npm run install:all
   ```

2. **Start the full app in development (frontend + backend)**:

   ```bash
   npm run dev
   ```

3. **Start the full app in production (recommended)**:

   ```bash
   npm start
   ```

Both unified commands start:
- **Frontend (Next.js):** http://localhost:3000
- **Backend (FastAPI):** http://localhost:8000

Open `http://localhost:3000` in your browser to begin your journaling journey!

## System Architecture

manasCore is a Next.js + FastAPI local-first system where journal entries are written immediately to SQLite, processed asynchronously for AI metadata and embeddings, and then reused through a hybrid RAG chat pipeline (temporal + semantic retrieval) with LiteLLM-based model routing between Gemini and local Ollama.

- `frontend/src/lib/api.ts` is the typed API contract for journal CRUD, chat streaming (SSE), analytics, profile/config, and dev RAG lab endpoints.
- `backend/routers/*` exposes domain APIs (`/entries`, `/chat`, `/analytics`, `/profile`, `/models`, `/dev/rag`).
- `backend/services/queue.py` runs async post-processing: extract title/emotion/sentiment/tags + generate/store embeddings.
- `backend/services/chat.py` performs hybrid retrieval from `journal_entries` + `vec_entries` and builds grounded chat context.
- `backend/agent/llm_client.py` handles model routing and fallback (`Gemini -> Ollama`) for generation, streaming, and embeddings.
- Data is local by default: SQLite (`journal_entries`, `vec_entries`) plus local markdown profile files in `data/profiles`.

```mermaid
flowchart LR
    U[User] --> FE[Next.js Frontend]

    subgraph API[FastAPI Backend]
      JR[/entries router/]
      CR[/chat router/]
      AR[/analytics router/]
      PR[/profile router/]
      MR[/models router/]
      RR[/dev rag router/]
      QS[Queue Service]
      CS[Chat Service\nHybrid RAG]
      AG[Agent + LiteLLM Client]
    end

    FE --> JR
    FE --> CR
    FE --> AR
    FE --> PR
    FE --> MR
    FE --> RR

    JR -->|create pending entry| DB[(SQLite\njournal_entries)]
    JR -->|background task| QS
    QS --> AG
    QS -->|store metadata| DB
    QS -->|store vectors| VDB[(SQLite vec_entries)]

    CR --> CS
    CS --> DB
    CS --> VDB
    CS --> AG
    AG -->|primary| G[Gemini]
    AG -->|fallback / local| O[Ollama gemma3:4b]

    PR --> PF[(data/profiles/*.md + .env)]
    AR --> DB
    RR --> DB
```
