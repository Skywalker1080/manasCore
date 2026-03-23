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

## Setting Up the AI Models

You can set up your API keys and models directly from the **Profile > Settings** page inside the application, or by editing the `.env` file.

### 1. Primary Model: Google Gemini

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **"Get API key"** and create a new key.
4. Paste this key into the application settings.

### 2. Fallback Model: Local Ollama (Offline)

1. Download and install [Ollama](https://ollama.com/download).
2. Open your terminal and pull the recommended model:
   ```bash
   ollama pull gemma3:4b
   ```
3. Ensure Ollama is running in the background.

## Prerequisites

### 1. Install `uv` (Fast Python Package Manager)

`uv` is required to manage the backend dependencies.

- **macOS & Linux:**
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```

- **Windows:**
  ```powershell
  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
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
