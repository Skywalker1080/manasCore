const API_BASE_URL = "http://localhost:8000";

// ---------------------------------------------------------------------------
// Journal types — matches the actual backend JournalEntryResponse schema
// ---------------------------------------------------------------------------

export interface JournalEntry {
  id: number;
  user_log: string;
  emotion: string | null;
  sentiment: number | null;
  mode: string | null;
  summary: string | null;
  actionable_insight: string | null;
  tags: string[] | null;
  date: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Analytics types
// ---------------------------------------------------------------------------

export interface SentimentPoint {
  date: string;
  average_sentiment: number;
}

export interface EmotionCount {
  emotion: string;
  count: number;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface ModeCount {
  mode: string;
  count: number;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_entries: number;
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const api = {
  // --- Journal CRUD ---

  async getEntries(): Promise<JournalEntry[]> {
    const response = await fetch(`${API_BASE_URL}/entries/`);
    if (!response.ok) throw new Error("Failed to fetch entries");
    return response.json();
  },

  async createEntry(user_log: string): Promise<JournalEntry> {
    const response = await fetch(`${API_BASE_URL}/entries/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_log }),
    });
    if (!response.ok) throw new Error("Failed to create entry");
    return response.json();
  },

  async deleteEntry(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/entries/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete entry");
  },

  // --- Analytics ---

  async getSentiment(range: string = "30d"): Promise<SentimentPoint[]> {
    const response = await fetch(`${API_BASE_URL}/analytics/sentiment?range=${range}`);
    if (!response.ok) throw new Error("Failed to fetch sentiment data");
    return response.json();
  },

  async getEmotions(range: string = "30d"): Promise<EmotionCount[]> {
    const response = await fetch(`${API_BASE_URL}/analytics/emotions?range=${range}`);
    if (!response.ok) throw new Error("Failed to fetch emotion data");
    return response.json();
  },

  async getTags(): Promise<TagCount[]> {
    const response = await fetch(`${API_BASE_URL}/analytics/tags`);
    if (!response.ok) throw new Error("Failed to fetch tag data");
    return response.json();
  },

  async getStreak(): Promise<StreakData> {
    const response = await fetch(`${API_BASE_URL}/analytics/streak`);
    if (!response.ok) throw new Error("Failed to fetch streak data");
    return response.json();
  },

  async getModes(range: string = "30d"): Promise<ModeCount[]> {
    const response = await fetch(`${API_BASE_URL}/analytics/modes?range=${range}`);
    if (!response.ok) throw new Error("Failed to fetch mode data");
    return response.json();
  },
};
