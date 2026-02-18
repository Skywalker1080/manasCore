const API_BASE_URL = "http://localhost:8000";

export interface JournalEntry {
  id: number;
  user_log: string;
  emotion: string | null;
  sentiment: number | null;
  ai_summary: string | null;
  date: string;
  updated_at: string;
}

export const api = {
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
};
