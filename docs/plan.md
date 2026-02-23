**Project Title:** AI Cognitive Journal

**Core Problem:**
Manual journaling is tedious, unorganized, and fails to extract meaningful insights. Users often lie to themselves in manual journaling, missing emotional patterns and actionable feedback.

**Philosophy:**
"The fastest way to change is to obsessively reflect on what you do every day and do not lie to yourself about what kind of life that is creating."

**Objective:**
Build a full-stack application that automates journaling, extracts emotional patterns, and provides actionable insights based on user logs.

---

**Application Workflow:**

1. **User Input:**
   - Users log emotions, thoughts, or any content at any time.
   - The AI agent processes the logs in real-time.

2. **AI Agent Processing:**
   - Extracts structured data: mood, exact emotion, sentiment, and meaning.
   - Stores the processed data in a structured format (e.g., date, emotion type, sentiment, extracted sentiment).
   - Storage options: local database or markdown (.md) files.
   - The app is open-source, allowing users to run it locally with offline LLMs or use APIs (internet required only for LLM).

3. **User Profile:**
   - Onboarding or anytime profile completion includes three essential .md files:
     - **Personality.md:** AI-determined user personality based on interactions.
     - **Goals.md:** Long-term and short-term goals, hierarchy, and priorities.
     - **Vision.md/Values.md:** Core values, life vision, and long-term aspirations.
   - The AI agent uses these files to provide context-aware responses and actionable steps.

4. **User Interaction:**
   - Chat interface for users to ask questions like:
     - "What are my emotional patterns this week?"
     - "What actionable steps should I take next according to my goals?"
   - AI agent answers based on the user's profile and logged data.

5. **Data Visualization:**
   - Sentiment graphs to visualize emotional trends (e.g., positive vs. negative days).
   - Systematic visualization of logs for better insights.

---

**Key Features:**
- **AI-Driven Insights:** Extracts emotional patterns and provides actionable feedback.
- **Context-Aware Responses:** AI agent builds user context from profile files.
- **Offline Capability:** Open-source design for local use with offline LLMs.
- **Structured Data Storage:** Logs stored in a structured format (database or .md files).
- **Visualization:** Graphs and visualizations for emotional trends and insights.

---

**Tech Stack Requirements:**
- Backend: Python (preferred).
- Frontend: Open to suggestions.
- Database: Local storage options (e.g., SQLite, PostgreSQL) or markdown files.
- AI/ML: Local LLMs or API-based solutions for sentiment analysis and emotional pattern extraction.
- Visualization: Tools for graphing and visualizing emotional trends.

---

**Deliverable:**
A comprehensive document detailing the exact implementation of the AI Cognitive Journal, including:
- Architecture and workflow.
- Tech stack recommendations.
- Data storage and processing methods.
- AI agent design and functionality.
- User interface and interaction design.
- Visualization tools and techniques.