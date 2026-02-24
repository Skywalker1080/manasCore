"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { remark } from "remark";
import html from "remark-html";
import OnboardingFlow from "@/components/onboarding-flow";

const API_BASE_URL = "http://localhost:8000";

interface ProfileData {
  filename: string;
  content: string;
}

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
    // Trigger a re-fetch of all profile sections
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      {showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} />}
      <div className="container mx-auto py-10 max-w-4xl px-4 md:px-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight">Cognitive Profile</h1>
            <p className="text-muted-foreground text-lg">
              Manage your AI's understanding of your personality, goals, and long-term vision.
            </p>
          </div>
          <Button variant="outline" onClick={handleRetakeOnboarding} className="shrink-0">
            Retake Onboarding
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-12 shadow-sm rounded-lg">
            <TabsTrigger value="personality" className="text-sm md:text-base font-semibold">Personality</TabsTrigger>
            <TabsTrigger value="goals" className="text-sm md:text-base font-semibold">Goals</TabsTrigger>
            <TabsTrigger value="vision" className="text-sm md:text-base font-semibold">Vision</TabsTrigger>
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
        </Tabs>
      </div>
    </>
  );
}

