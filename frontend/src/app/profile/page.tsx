"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { remark } from "remark";
import html from "remark-html";
import OnboardingFlow from "@/components/onboarding-flow";
import { api, type ConfigData } from "@/lib/api";
import { CheckCircle2, XCircle, Key, Server } from "lucide-react";

const API_BASE_URL = "http://localhost:8000";

interface ProfileData {
  filename: string;
  content: string;
}

type ConfigNotification = {
  type: "success" | "error";
  message: string;
} | null;

// ---------------------------------------------------------------------------
// ProfileSection — existing component, untouched
// ---------------------------------------------------------------------------

function ProfileSection({ section, title, description, refreshKey }: { section: string; title: string; description: string; refreshKey: number }) {
  const [content, setContent] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [section, refreshKey]);

  useEffect(() => {
    const processMarkdown = async () => {
      if (!content) {
        setHtmlContent("<p>No content available.</p>");
        return;
      }
      try {
        const file = await remark().use(html).process(content);
        setHtmlContent(String(file));
      } catch (err) {
        console.error("Error processing markdown", err);
        setHtmlContent("<p>Error rendering markdown.</p>");
      }
    };
    processMarkdown();
  }, [content]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/profile/${section}`);
      if (!response.ok) throw new Error("Failed to fetch profile");
      const data: ProfileData = await response.json();
      setContent(data.content || "");
    } catch (err: any) {
      setError(err.message || "An error occurred fetching the profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/profile/${section}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("Failed to save profile");
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-start justify-between space-y-0.5 pb-4">
        <div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="mt-1 flex items-center gap-2">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-20 w-full mt-6" />
          </div>
        ) : isEditing ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm leading-relaxed"
              placeholder={`Write your ${title.toLowerCase()} here in Markdown...`}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                fetchProfile();
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div 
              className="prose prose-zinc dark:prose-invert max-w-none border rounded-lg p-6 bg-muted/10 min-h-[300px] shadow-sm font-sans"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
            <div className="flex justify-end">
               <Button onClick={() => setIsEditing(true)}>
                Edit {title}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AIConfigSection — new component for Phase 5
// ---------------------------------------------------------------------------

function AIConfigSection() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<ConfigNotification>(null);

  // Form state
  const [maskedKey, setMaskedKey] = useState("Not set");
  const [newApiKey, setNewApiKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("");

  useEffect(() => {
    fetchConfig();
  }, []);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const data: ConfigData = await api.getConfig();
      setMaskedKey(data.gemini_api_key_masked);
      setOllamaUrl(data.ollama_base_url);
    } catch (err) {
      console.error("Failed to load config:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setNotification(null);
    try {
      const payload: { gemini_api_key?: string; ollama_base_url?: string } = {};
      if (newApiKey.trim()) payload.gemini_api_key = newApiKey.trim();
      if (ollamaUrl.trim()) payload.ollama_base_url = ollamaUrl.trim();

      const result = await api.updateConfig(payload);
      setMaskedKey(result.gemini_api_key_masked);
      setOllamaUrl(result.ollama_base_url);
      setNewApiKey(""); // Clear the raw key field after save
      setNotification({ type: "success", message: "Configuration saved successfully ✓" });
    } catch (err) {
      console.error("Failed to save config:", err);
      setNotification({ type: "error", message: "Failed to save configuration. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Server className="h-5 w-5 text-muted-foreground" />
          AI Configuration
        </CardTitle>
        <CardDescription>
          Manage your AI provider settings. The API key is stored securely on disk and never exposed to the browser.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Inline notification */}
        {notification && (
          <div
            className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 mb-6 text-sm ${
              notification.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-300"
                : "border-red-500/20 bg-red-500/[0.08] text-red-600 dark:text-red-300"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Gemini API Key */}
            <div className="space-y-2">
              <Label htmlFor="gemini-api-key" className="flex items-center gap-2 text-sm font-medium">
                <Key className="h-3.5 w-3.5 text-muted-foreground" />
                Gemini API Key
              </Label>
              <Input
                id="gemini-api-key"
                type="password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder={maskedKey !== "Not set" ? `Current: ${maskedKey}` : "Enter your Gemini API key"}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground/60">
                {maskedKey !== "Not set"
                  ? `Saved key: ${maskedKey} — leave blank to keep the current key.`
                  : "No API key configured. Enter one to enable Gemini as your AI provider."}
              </p>
            </div>

            {/* Ollama Base URL */}
            <div className="space-y-2">
              <Label htmlFor="ollama-url" className="flex items-center gap-2 text-sm font-medium">
                <Server className="h-3.5 w-3.5 text-muted-foreground" />
                Ollama Base URL
              </Label>
              <Input
                id="ollama-url"
                type="url"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground/60">
                Local Ollama instance URL. Used as a fallback when Gemini is unavailable.
              </p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                <strong>Recommended:</strong> Ollama models with 4B parameters or more (e.g., <code>gemma3:4b</code>, <code>llama3.1:8b</code>, <code>llama2:7b</code>) for best results.
              </p>
            </div>

            {/* Save button */}
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ProfilePage — updated with 4 tabs
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("personality");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRetakeOnboarding = async () => {
    try {
      await fetch(`${API_BASE_URL}/profile/onboarding/reset`, { method: "POST" });
      setShowOnboarding(true);
    } catch (err) {
      console.error("Failed to reset onboarding:", err);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      {showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} />}
      <div className="mx-auto pt-24 pb-10 max-w-4xl px-6 md:px-10">
        <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-serif text-3xl tracking-tight text-foreground/90 md:text-4xl">Cognitive Profile</h1>
            <p className="text-muted-foreground text-sm">
              Manage your AI's understanding of your personality, goals, and long-term vision.
            </p>
          </div>
          <Button variant="outline" onClick={handleRetakeOnboarding} className="shrink-0">
            Retake Onboarding
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-12 shadow-sm rounded-lg">
            <TabsTrigger value="personality" className="text-sm font-semibold">Personality</TabsTrigger>
            <TabsTrigger value="goals" className="text-sm font-semibold">Goals</TabsTrigger>
            <TabsTrigger value="vision" className="text-sm font-semibold">Vision</TabsTrigger>
            <TabsTrigger value="config" className="text-sm font-semibold">AI Config</TabsTrigger>
          </TabsList>
          <TabsContent value="personality">
            <ProfileSection 
              section="personality" 
              title="AI Personality" 
              description="How the Assistant should perceive you and what tone it should use to communicate."
              refreshKey={refreshKey}
            />
          </TabsContent>
          <TabsContent value="goals">
            <ProfileSection 
              section="goals" 
              title="Goals" 
              description="Your short-term, medium-term, and immediately actionable objectives."
              refreshKey={refreshKey}
            />
          </TabsContent>
          <TabsContent value="vision">
            <ProfileSection 
              section="vision" 
              title="Vision" 
              description="Your long-term aspirations, values, and broader life vision."
              refreshKey={refreshKey}
            />
          </TabsContent>
          <TabsContent value="config">
            <AIConfigSection />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
