"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { api, JournalEntry } from "@/lib/api";

export default function JournalPage() {
  const [content, setContent] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch entries on mount
  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    try {
      const data = await api.getEntries();
      setEntries(data);
    } catch (error) {
      console.error("Error fetching entries:", error);
    }
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await api.createEntry(content);
      setContent("");
      fetchEntries(); // Refresh list
    } catch (error) {
      console.error("Error creating entry:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteEntry(id);
      fetchEntries(); // Refresh list
    } catch (error) {
      console.error("Error deleting entry:", error);
    }
  }

  return (
    <main className="container mx-auto max-w-2xl p-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">API Test Interface</h1>
        <p className="text-muted-foreground">Test the frontend-to-backend loop and database population.</p>
      </header>

      <div className="space-y-4">
        <Textarea
          placeholder="What's on your mind? (Your user log...)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[150px] text-lg p-4"
        />
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !content.trim()}
          className="w-full h-12 text-lg"
        >
          {loading ? "Saving..." : "Save Entry"}
        </Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Recent Entries</h2>
        <div className="grid gap-4">
          {entries.length === 0 ? (
            <p className="text-muted-foreground italic">No entries found. Try creating one!</p>
          ) : (
            entries.map((entry) => (
              <Card key={entry.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    ID: {entry.id} — {new Date(entry.date).toLocaleString()}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)}>
                    Delete
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{entry.user_log}</p>
                  <div className="mt-2 flex gap-2">
                    {entry.emotion && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Emotion: {entry.emotion}
                      </span>
                    )}
                    {entry.sentiment !== null && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Sentiment: {entry.sentiment.toFixed(2)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
