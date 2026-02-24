"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
    <main className="min-h-screen relative flex flex-col items-center pt-32 px-4 pb-48 bg-background">
      {/* Top Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0" />

      {/* Main input area */}
      <div className="w-full max-w-2xl shrink-0 flex flex-col gap-6 relative z-10">
        <h1 className="text-4xl font-light text-center text-foreground/80 mb-2 tracking-wide">
          Log your thoughts
        </h1>
        <div className="relative group">
          <Textarea
            placeholder="What's on your mind today?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[220px] text-lg p-6 bg-secondary/10 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all resize-none rounded-3xl shadow-sm backdrop-blur-md placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="flex justify-end mt-2">
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !content.trim()}
            size="lg"
            className="rounded-full px-8 text-base shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            {loading ? "Logging..." : "Log Entry"}
          </Button>
        </div>
      </div>

      {/* Entries Section */}
      <div className="w-full max-w-2xl mt-16 space-y-6 relative z-10 pb-16">
        <div className="flex items-center justify-between ml-2">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">Previous Entries</h2>
        </div>
        
        <div className="grid gap-6">
          {entries.length === 0 ? (
            <p className="text-muted-foreground/50 italic ml-2 mt-4 text-center">Your journal is waiting for its first entry.</p>
          ) : (
            entries.map((entry) => (
              <Card key={entry.id} className="bg-secondary/5 border-border/40 backdrop-blur-md rounded-3xl transition-all duration-300 hover:bg-secondary/10 group">
                <CardContent className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-xs tracking-wider text-muted-foreground uppercase opacity-80">
                      {new Date(entry.date).toLocaleString(undefined, {
                        weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    <button 
                      onClick={() => handleDelete(entry.id)}
                      className="text-xs text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-lg text-foreground/90 leading-relaxed whitespace-pre-wrap font-light mb-6">
                    {entry.user_log}
                  </p>
                  
                  {(entry.emotion || entry.sentiment !== null) && (
                    <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border/20">
                      {entry.emotion && (
                        <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20 bg-opacity-50 font-medium">
                          {entry.emotion}
                        </span>
                      )}
                      {entry.sentiment !== null && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-full border border-emerald-500/20 font-medium tracking-wide">
                          Sentiment: {entry.sentiment.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Bottom transparency gradient to hide ending of scroll */}
      <div className="fixed bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-30" />
    </main>
  );
}
