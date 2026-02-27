# manasCore - Your Inner Journal

A reflective AI journaling experience for solitude and self-discovery, powered by RAG and dual AI models (Gemini + Ollama fallback).

## Key Features

- **AI Journaling & Chat:** Log your thoughts and chat with your journal using a personalized AI.
- **RAG Powered:** The AI remembers your past entries and aligns advice with your goals and vision.
- **Dual AI Resiliency:** Uses Gemini Flash by default, with an automatic fallback to local Ollama if offline.
- **Rich Analytics:** Visualizes your emotional patterns and habits over time.

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

## How to Run

1. **Start the Backend** (from the root folder):

   ```bash
   uv run main.py
   ```

   _Runs on http://localhost:8000_

2. **Start the Frontend** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   _Runs on http://localhost:3000_

Open `http://localhost:3000` in your browser to begin your journaling journey!
