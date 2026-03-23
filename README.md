# manasCore - Your Inner Journal

![manasCore Banner Placeholder](https://placehold.co/1200x320/0f172a/e2e8f0?text=manasCore+Banner)

![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
![Release](https://img.shields.io/badge/release-v0.1.0-informational?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![LiteLLM](https://img.shields.io/badge/LiteLLM-111111?style=for-the-badge)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

## About The Project

manasCore is a local-first AI journaling app designed to help users reflect clearly, build consistent self-awareness, and track growth over time with private journaling workflows that can run on-device while still supporting cloud AI when needed.

## Key Features

- Local-first design
- Fall-back mechanism
- Optimized for low-parameter local models
- Complete data privacy with local storage
- You own your journal

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
   ollama run gemma3:4b
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
