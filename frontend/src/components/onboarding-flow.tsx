"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RefreshCcw } from "lucide-react";

const API_BASE_URL = "http://localhost:8000";

const TOTAL_STEPS = 5; // Welcome + Personality + Anti-Vision + Vision (AI) + Goals

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for each section
  const [personality, setPersonality] = useState("");
  const [visionAnswers, setVisionAnswers] = useState({
    q1: "",
    q2: "",
  });

  // AI-generated vision (from the flip)
  const [generatedVision, setGeneratedVision] = useState("");
  const [visionApproved, setVisionApproved] = useState(false);

  const [goalsAnswers, setGoalsAnswers] = useState({
    q1: "",
    q2: "",
    q3: "",
  });

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const saveProfile = async (section: string, content: string) => {
    const response = await fetch(`${API_BASE_URL}/profile/${section}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error(`Failed to save ${section}`);
  };

  const markOnboardingComplete = async () => {
    const response = await fetch(`${API_BASE_URL}/profile/onboarding/complete`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to mark onboarding complete");
  };

  const handleSkip = async () => {
    try {
      await markOnboardingComplete();
      onComplete();
    } catch (err: any) {
      setError(err.message || "Failed to skip onboarding.");
    }
  };

  /**
   * Calls the backend to flip the anti-vision into a positive vision.
   * Combines both anti-vision answers into a single block of text.
   */
  const flipVision = async () => {
    const antiVisionText = [
      visionAnswers.q1.trim(),
      visionAnswers.q2.trim(),
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!antiVisionText) {
      setError("Please fill in at least one anti-vision question before continuing.");
      return false;
    }

    setIsFlipping(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/profile/vision/flip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anti_vision: antiVisionText }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to generate vision");
      }
      const data = await response.json();
      setGeneratedVision(data.vision);
      setVisionApproved(false);
      return true;
    } catch (err: any) {
      setError(err.message || "Something went wrong while generating your vision.");
      return false;
    } finally {
      setIsFlipping(false);
    }
  };

  const handleNext = async () => {
    setError(null);

    // When leaving the Anti-Vision step (step 2), trigger the AI flip
    if (step === 2) {
      const success = await flipVision();
      if (!success) return;
    }

    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleFinish = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Build and save personality.md
      const personalityMd = `# AI Personality\n\n${personality.trim() || "No personality defined yet."}\n`;
      await saveProfile("personality", personalityMd);

      // Build and save vision.md with anti-vision + AI-generated vision
      const visionMd = [
        "# Vision",
        "",
        "## Anti-Vision",
        "",
        "### What I dislike, complain about, and want to avoid:",
        visionAnswers.q1.trim() || "_Not answered_",
        "",
        "### Worst-case 5–10+ years if nothing changes:",
        visionAnswers.q2.trim() || "_Not answered_",
        "",
        "## My Vision",
        "",
        generatedVision.trim() || "_No vision generated_",
        "",
      ].join("\n");
      await saveProfile("vision", visionMd);

      // Build and save goals.md from goals questionnaire
      const goalsMd = [
        "# Goals",
        "",
        "### What is the single most important thing you want to achieve this year?",
        goalsAnswers.q1.trim() || "_Not answered_",
        "",
        "### What does a successful week look like for you?",
        goalsAnswers.q2.trim() || "_Not answered_",
        "",
        "### What skills or areas do you want to develop?",
        goalsAnswers.q3.trim() || "_Not answered_",
        "",
      ].join("\n");
      await saveProfile("goals", goalsMd);

      // Mark onboarding as done
      await markOnboardingComplete();
      onComplete();
    } catch (err: any) {
      setError(err.message || "Something went wrong while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateVision = async () => {
    await flipVision();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-border animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="space-y-3 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-extrabold tracking-tight">
              {step === 0 && "Welcome to AI Cognitive Journal"}
              {step === 1 && "Step 1: Personalize your AI Journal experience."}
              {step === 2 && "Step 2: Anti-Vision Creation"}
              {step === 3 && "Step 3: Your Vision"}
              {step === 4 && "Step 4: Goals"}
            </CardTitle>
            <span className="text-xs text-muted-foreground font-mono">
              {step + 1}/{TOTAL_STEPS}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <CardDescription>
            {step === 0 && "Let's set up your cognitive profile. This helps the AI understand you better. You can always redo this from the Profile page."}
            {step === 1 && "Define the personality of your AI assistant. How should it talk to you? What tone should it use?"}
            {step === 2 && "Imagine your worst-case future. The \"anti-vision\" is the future you want to avoid."}
            {step === 3 && "We flipped your anti-vision into a positive vision. Review it below — edit anything you want, then hit Next to lock it in."}
            {step === 4 && "Reverse-engineer your vision into concrete goals. This becomes your north star."}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-6">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <p className="text-muted-foreground leading-relaxed">
                This short onboarding will ask you to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>Define your AI&apos;s personality</strong> — how should the assistant communicate with you?</li>
                <li><strong>Explore your anti-vision</strong> — what future do you want to avoid?</li>
                <li><strong>AI generates your vision</strong> — your anti-vision gets flipped into motivating &quot;I&quot; statements.</li>
                <li><strong>Set your goals</strong> — reverse-engineer your vision into actionable goals.</li>
              </ul>
              <p className="text-sm text-muted-foreground italic">
                You can update all of these later from the Profile page.
              </p>
            </div>
          )}

          {/* Step 1: Personality */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label htmlFor="personality-input" className="text-base font-medium">
                  AI Personality Description
                </Label>
                <Textarea
                  id="personality-input"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  className="min-h-[200px] text-sm leading-relaxed"
                  placeholder={`Example:\nYou are a calm, thoughtful assistant. You speak concisely but with warmth. You challenge me when I'm being complacent, but always with empathy. You prefer bullet points over long paragraphs. You remember that I value honesty over comfort.`}
                />
              </div>
            </div>
          )}

          {/* Step 2: Anti-Vision */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label htmlFor="vision-q1" className="text-sm font-medium leading-relaxed">
                  List everything you hate/dislike/complain about in your current/past life. 
                  Observe societal &quot;default&quot; paths (mediocrity, breaking down, dead inside).
                </Label>
                <Textarea
                  id="vision-q1"
                  value={visionAnswers.q1}
                  onChange={(e) => setVisionAnswers({ ...visionAnswers, q1: e.target.value })}
                  className="min-h-[100px] text-sm"
                  placeholder="Habits, relationships, work, societal defaults..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vision-q2" className="text-sm font-medium leading-relaxed">
                  Project the above worst-case 5–10+ years ahead if unchanged.
                </Label>
                <Textarea
                  id="vision-q2"
                  value={visionAnswers.q2}
                  onChange={(e) => setVisionAnswers({ ...visionAnswers, q2: e.target.value })}
                  className="min-h-[100px] text-sm"
                  placeholder="Where does this path lead in a decade?"
                />
              </div>
            </div>
          )}

          {/* Step 3: Vision (AI-generated, editable) */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              {isFlipping ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
                  </div>
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Flipping your anti-vision into your ideal life...
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="generated-vision" className="text-sm font-medium">
                        Your AI-Generated Vision
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRegenerateVision}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-2"
                      >
                        <RefreshCcw className="h-3 w-3" />
                        Regenerate
                      </Button>
                    </div>
                    <Textarea
                      id="generated-vision"
                      value={generatedVision}
                      onChange={(e) => {
                        setGeneratedVision(e.target.value);
                        setVisionApproved(false);
                      }}
                      className="min-h-[200px] text-sm leading-relaxed"
                      placeholder="Your vision will appear here after processing..."
                    />
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    ✏️ Feel free to edit, add, or remove any bullet points. This is <strong>your</strong> vision — make it resonate.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Step 4: Goals */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label htmlFor="goals-q1" className="text-sm font-medium">
                  What is the single most important thing you want to achieve this year?
                </Label>
                <Textarea
                  id="goals-q1"
                  value={goalsAnswers.q1}
                  onChange={(e) => setGoalsAnswers({ ...goalsAnswers, q1: e.target.value })}
                  className="min-h-[80px] text-sm"
                  placeholder="Your #1 priority..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goals-q2" className="text-sm font-medium">
                  What does a successful week look like for you?
                </Label>
                <Textarea
                  id="goals-q2"
                  value={goalsAnswers.q2}
                  onChange={(e) => setGoalsAnswers({ ...goalsAnswers, q2: e.target.value })}
                  className="min-h-[80px] text-sm"
                  placeholder="Describe a great week..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goals-q3" className="text-sm font-medium">
                  What skills or areas do you want to develop?
                </Label>
                <Textarea
                  id="goals-q3"
                  value={goalsAnswers.q3}
                  onChange={(e) => setGoalsAnswers({ ...goalsAnswers, q3: e.target.value })}
                  className="min-h-[80px] text-sm"
                  placeholder="Skills, habits, knowledge..."
                />
              </div>
              <p className="text-xs text-muted-foreground italic">
                ⚠️ These are placeholder questions. The final questionnaire will be updated soon.
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 0 || isFlipping}
              >
                Back
              </Button>
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                Skip for now
              </Button>
            </div>
            {step < TOTAL_STEPS - 1 ? (
              <Button onClick={handleNext} disabled={isFlipping}>
                {step === 0 ? "Get Started" : isFlipping ? "Processing..." : "Next"}
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={isSaving}>
                {isSaving ? "Saving..." : "Complete Setup"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
