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
  context?: string;
}

export interface EmotionCount {
  emotion: string;
  count: number;
  trend?: "up" | "down" | "stable";
  trend_percent?: number;
  insight?: string;
}

export interface TagCount {
  tag: string;
  count: number;
  days_active: number;
  total_days: number;
}

export interface TagDataResponse {
  top_tags: TagCount[];
  insight: {
    emerging: string;
    dormant: string;
  };
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

export interface OllamaModel {
  name: string;
  size: number | null;
  parameter_size: string | null;
  family: string | null;
  quantization_level: string | null;
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const api = {
  // --- Journal CRUD ---

  async getEntries(skip: number = 0, limit: number = 5): Promise<JournalEntry[]> {
    const response = await fetch(`${API_BASE_URL}/entries/?skip=${skip}&limit=${limit}`);
    if (!response.ok) throw new Error("Failed to fetch entries");
    return response.json();
  },

  async createEntry(user_log: string, model_name?: string): Promise<JournalEntry> {
    const body: Record<string, string> = { user_log };
    if (model_name) body.model_name = model_name;

    const response = await fetch(`${API_BASE_URL}/entries/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("Failed to create entry");
    return response.json();
  },

  async getEntry(id: number): Promise<JournalEntry> {
    const response = await fetch(`${API_BASE_URL}/entries/${id}`);
    if (!response.ok) throw new Error("Failed to fetch entry");
    return response.json();
  },

  async deleteEntry(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/entries/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete entry");
  },

  // --- Ollama Models ---

  async getOllamaModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/models/ollama`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.models ?? [];
    } catch {
      // Ollama not running or backend unreachable — silently return empty
      return [];
    }
  },

  // --- Analytics ---

  async getInsight(range: string = "30d", model_name?: string): Promise<{ insight: string }> {
    const url = new URL(`${API_BASE_URL}/analytics/insight`);
    url.searchParams.append("range", range);
    if (model_name) {
      url.searchParams.append("model_name", model_name);
    }
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("Failed to fetch insight");
    return response.json();
  },

  async getSentiment(range: string = "30d"): Promise<SentimentPoint[]> {
    const response = await fetch(`${API_BASE_URL}/analytics/sentiment?range=${range}`);
    if (!response.ok) throw new Error("Failed to fetch sentiment data");
    return response.json();
  },

  async getEmotions(range: string = "30d", refresh: boolean = false, model_name?: string): Promise<EmotionCount[]> {
    const url = new URL(`${API_BASE_URL}/analytics/emotions`);
    url.searchParams.append("range", range);
    if (refresh) url.searchParams.append("refresh", "true");
    if (model_name) url.searchParams.append("model_name", model_name);
    
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("Failed to fetch emotion data");
    return response.json();
  },

  async getTags(range: string = "30d", refresh: boolean = false, model_name?: string): Promise<TagDataResponse> {
    const url = new URL(`${API_BASE_URL}/analytics/tags`);
    url.searchParams.append("range", range);
    if (refresh) url.searchParams.append("refresh", "true");
    if (model_name) url.searchParams.append("model_name", model_name);

    const response = await fetch(url.toString());
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
    history: ChatHistoryMessage[] = [],
    model_name?: string
  ): Promise<ChatResponse> {
    const body: Record<string, unknown> = { message, history };
    if (model_name) body.model_name = model_name;

    const response = await fetch(`${API_BASE_URL}/chat/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("Failed to send chat message");
    return response.json();
  },

  async *streamChatMessage(
    message: string,
    history: ChatHistoryMessage[] = [],
    model_name?: string
  ): AsyncGenerator<ChatStreamEvent> {
    const body: Record<string, unknown> = { message, history };
    if (model_name) body.model_name = model_name;

    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  async *streamEntryChatMessage(
    message: string,
    entry: {
      entry_log: string;
      entry_summary?: string | null;
      entry_insight?: string | null;
      entry_sentiment?: number | null;
      entry_emotion?: string | null;
      entry_mode?: string | null;
    },
    history: ChatHistoryMessage[] = [],
    model_name?: string
  ): AsyncGenerator<ChatStreamEvent> {
    const body: Record<string, unknown> = {
      message,
      history,
      entry_log: entry.entry_log,
      entry_summary: entry.entry_summary ?? null,
      entry_insight: entry.entry_insight ?? null,
      entry_sentiment: entry.entry_sentiment ?? null,
      entry_emotion: entry.entry_emotion ?? null,
      entry_mode: entry.entry_mode ?? null,
    };
    if (model_name) body.model_name = model_name;

    const response = await fetch(`${API_BASE_URL}/chat/entry/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error("Failed to start entry chat stream");
    if (!response.body) throw new Error("No response body for streaming");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
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

    if (buffer.trim().startsWith("data: ")) {
      try {
        const data = JSON.parse(buffer.trim().slice(6));
        yield data as ChatStreamEvent;
      } catch {
        // Skip
      }
    }
  },

  // --- Dev RAG Lab ---

  async getRagTraceSummaries(limit: number = 50, status?: string): Promise<RagTraceSummary[]> {
    const url = new URL(`${API_BASE_URL}/dev/rag/traces`);
    url.searchParams.append("limit", String(limit));
    if (status) {
      url.searchParams.append("status", status);
    }
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("Failed to fetch RAG traces");
    return response.json();
  },

  async getRagTraceDetail(traceId: string): Promise<RagTraceDetail> {
    const response = await fetch(`${API_BASE_URL}/dev/rag/traces/${traceId}`);
    if (!response.ok) throw new Error("Failed to fetch trace detail");
    return response.json();
  },

  async getRagEvalSummary(windowDays: number = 14): Promise<RagEvalSummary> {
    const response = await fetch(`${API_BASE_URL}/dev/rag/eval/summary?window_days=${windowDays}`);
    if (!response.ok) throw new Error("Failed to fetch eval summary");
    return response.json();
  },

  async getRagEvalCases(): Promise<RagEvalCase[]> {
    const response = await fetch(`${API_BASE_URL}/dev/rag/eval/cases`);
    if (!response.ok) throw new Error("Failed to fetch eval cases");
    return response.json();
  },

  async runRagEval(input: { include_inactive?: boolean; use_llm_judge?: boolean; model_name?: string } = {}): Promise<RagEvalRunResult> {
    const response = await fetch(`${API_BASE_URL}/dev/rag/eval/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("Failed to run RAG eval");
    return response.json();
  },

  async saveManualRagJudgment(input: {
    trace_id: string;
    groundedness?: number;
    faithfulness?: number;
    helpfulness?: number;
    citation_adequacy?: number;
    safety_tone?: number;
    trust_answer?: boolean;
    rationale?: string;
  }): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/dev/rag/judge/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("Failed to save manual judgment");
    return response.json();
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
  distance?: number | null;
  retrieval_method?: string | null;
}

export interface ChatResponse {
  message: string;
  sources: ChatSource[];
  trace_id?: string | null;
}

export type ChatStreamEvent =
  | { type: "token"; content: string }
  | { type: "sources"; sources: ChatSource[]; trace_id?: string }
  | { type: "done" }
  | { type: "error"; content: string };

// ---------------------------------------------------------------------------
// RAG Lab (dev observability) types
// ---------------------------------------------------------------------------

export interface RagTraceSummary {
  trace_id: string;
  created_at: string;
  query: string;
  model_route: string | null;
  status: string;
  retrieval_mode: string | null;
  temporal_detected: number;
  returned_count: number | null;
  distance_p50: number | null;
  total_ms: number | null;
  llm_total_ms: number | null;
  error_text: string | null;
}

export interface RagTraceDetail {
  run: Record<string, unknown>;
  retrieval_items: Array<Record<string, unknown>>;
  judgments: Array<Record<string, unknown>>;
}

export interface RagEvalSummary {
  window_days: number;
  runs: Record<string, number | null>;
  eval: Record<string, number | null>;
}

export interface RagEvalCase {
  id: number;
  name: string;
  query: string;
  case_type: "temporal" | "semantic" | "mixed";
  expected_json?: string;
  expected: Record<string, unknown>;
  active: number;
  created_at: string;
}

export interface RagEvalRunResult {
  eval_run_id: string;
  results: Array<{
    case_id: number;
    name: string;
    case_type: string;
    trace_id: string;
    notes?: string | null;
    metrics: Record<string, number | boolean | null>;
  }>;
  summary: Record<string, number | null>;
}

