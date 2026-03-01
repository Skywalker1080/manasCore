const API_BASE_URL = "http://localhost:8000";

// ---------------------------------------------------------------------------
// Journal types — matches the actual backend JournalEntryResponse schema
// ---------------------------------------------------------------------------

export interface JournalEntry {
  id: number;
  user_log: string;
  title: string | null;
  emotion: string | null;
  sentiment: number | null;
  mode: string | null;
  summary: string | null;
  actionable_insight: string | null;
  tags: string[] | null;
  date: string;
  updated_at: string;
  pending: boolean;
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

export interface ConfigData {
  gemini_api_key_masked: string;
  ollama_base_url: string;
  message?: string;
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

  // --- Profile Config ---

  async getConfig(): Promise<ConfigData> {
    const response = await fetch(`${API_BASE_URL}/profile/config`);
    if (!response.ok) throw new Error("Failed to fetch config");
    return response.json();
  },

  async updateConfig(data: { gemini_api_key?: string; ollama_base_url?: string }): Promise<ConfigData> {
    const response = await fetch(`${API_BASE_URL}/profile/config`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update config");
    return response.json();
  },

  // --- Processing Queue ---

  async getQueueStatus(): Promise<{ pending_count: number }> {
    const response = await fetch(`${API_BASE_URL}/entries/queue/status`);
    if (!response.ok) throw new Error("Failed to fetch queue status");
    return response.json();
  },

  async processQueue(): Promise<{ total: number; processed: number; failed: number }> {
    const response = await fetch(`${API_BASE_URL}/entries/queue/process`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to process queue");
    return response.json();
  },

  // --- Chat ---

  async sendChatMessage(
    message: string,
    history: ChatHistoryMessage[] = []
  ): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/chat/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });
    if (!response.ok) throw new Error("Failed to send chat message");
    return response.json();
  },

  async *streamChatMessage(
    message: string,
    history: ChatHistoryMessage[] = []
  ): AsyncGenerator<ChatStreamEvent> {
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) throw new Error("Failed to start chat stream");
    if (!response.body) throw new Error("No response body for streaming");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last potentially incomplete line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            yield data as ChatStreamEvent;
          } catch {
            // Skip malformed events
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim().startsWith("data: ")) {
      try {
        const data = JSON.parse(buffer.trim().slice(6));
        yield data as ChatStreamEvent;
      } catch {
        // Skip
      }
    }
  },
};

// ---------------------------------------------------------------------------
// Chat types
// ---------------------------------------------------------------------------

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSource {
  entry_id: number;
  summary: string | null;
  date: string | null;
  emotion: string | null;
  mode: string | null;
}

export interface ChatResponse {
  message: string;
  sources: ChatSource[];
}

export type ChatStreamEvent =
  | { type: "token"; content: string }
  | { type: "sources"; sources: ChatSource[] }
  | { type: "done" }
  | { type: "error"; content: string };

