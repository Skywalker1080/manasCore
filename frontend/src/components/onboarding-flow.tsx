"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { JournalInput } from "@/components/journal-input";
import { api, type JournalEntry } from "@/lib/api";
import { Loader2, Sun, Cloud, CloudRain, Lightbulb, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { StreakCard } from "@/components/streak-card";
import { EmotionChart } from "@/components/emotion-chart";
import { useRouter } from "next/navigation";

const API_BASE_URL = "http://localhost:8000";
const POLL_INTERVAL_MS = 3000;

// ─── Types ─────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
  isTyping?: boolean;
  /** Special "widget" messages rendered as something other than text */
  widget?: "journal-input" | "entry-card" | "mock-dashboard";
  entry?: JournalEntry;
  isSad?: boolean;
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

// ─── Typewriter hook ───────────────────────────────────────────────────
function useTypewriter(
  addMessage: (msg: ChatMessage) => void,
  delayBetween = 500,
  typeDuration = 28
) {
  const queueRef = useRef<{ lines: string[]; onDone?: () => void } | null>(null);
  const runningRef = useRef(false);

  const enqueue = useCallback(
    (lines: string[], onDone?: () => void) => {
      queueRef.current = { lines, onDone };
      if (!runningRef.current) flush();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const flush = useCallback(async () => {
    runningRef.current = true;
    while (queueRef.current) {
      const { lines, onDone } = queueRef.current;
      queueRef.current = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const id = `ai-${Date.now()}-${i}`;
        addMessage({ id, role: "ai", text: "", isTyping: true });

        const chars = line.split("");
        for (let c = 0; c < chars.length; c++) {
          await wait(typeDuration);
          addMessage({ id, role: "ai", text: line.slice(0, c + 1), isTyping: c < chars.length - 1 });
        }
        addMessage({ id, role: "ai", text: line, isTyping: false });

        if (i < lines.length - 1) await wait(delayBetween);
      }
      onDone?.();
    }
    runningRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return enqueue;
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main component ───────────────────────────────────────────────────
export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userName, setUserName] = useState("");
  const [inputValue, setInputValue] = useState("");
  // step-0 simple text input
  const [waitingForNameInput, setWaitingForNameInput] = useState(false);
  // step-1 journal input widget visible
  const [showJournalInput, setShowJournalInput] = useState(false);
  // step-2 personality options visible
  const [showPersonalityOptions, setShowPersonalityOptions] = useState(false);
  const [selectedPersonality, setSelectedPersonality] = useState<string>("");
  const [customPersonality, setCustomPersonality] = useState("");
  
  // step-4 anti-vision visible
  const [waitingForAntiVisionInput, setWaitingForAntiVisionInput] = useState(false);
  const [antiVisionText, setAntiVisionText] = useState("");
  const [flippedVision, setFlippedVision] = useState<string | null>(null);
  const [isFlippingVision, setIsFlippingVision] = useState(false);

  // step-5 vision editor
  const [showVisionEditor, setShowVisionEditor] = useState(false);
  const [visionEditorMode, setVisionEditorMode] = useState<"view" | "edit" | "regenerate">("view");
  const [editedVision, setEditedVision] = useState("");
  const [regeneratePrompt, setRegeneratePrompt] = useState("");

  // step-6 goals
  const [showGoalsEditor, setShowGoalsEditor] = useState(false);
  const [goals, setGoals] = useState([
    { id: 1, text: "" }
  ]);

  // step-7 final step
  const [showFinalActions, setShowFinalActions] = useState(false);

  const [showNext, setShowNext] = useState(false);
  const [processingEntry, setProcessingEntry] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const PERSONALITY_OPTIONS = [
    { id: "direct", label: "Direct and challenging", desc: "(push me to think harder)" },
    { id: "warm", label: "Warm and supportive", desc: "(be my cheerleader)" },
    { id: "curious", label: "Curious and exploratory", desc: "(ask me questions)" },
    { id: "calm", label: "Calm and reflective", desc: "(help me slow down)" },
  ];

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasStartedRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Message management ────────────────────────────────────────────
  const addOrUpdateMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = msg;
        return copy;
      }
      return [...prev, msg];
    });
  }, []);

  const enqueue = useTypewriter(addOrUpdateMessage);

  // ── Cleanup poll on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Auto-scroll to bottom ──────────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, showJournalInput, showNext]);

  // ── Focus name input when waiting ─────────────────────────────────
  useEffect(() => {
    if (waitingForNameInput) inputRef.current?.focus();
  }, [waitingForNameInput]);

  // ── Step 0: Initial greeting ───────────────────────────────────────
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    enqueue(
      [
        "\"The fastest way to change is to obsessively reflect back on your life and do not lie to yourself of what life it is creating.\"",
        "~ Dan Koe",
        "Welcome to manasCore.",
        "In the moments ahead, you will shape this journal to reflect your nature — your ambitions, your fears, the future you seek to forge.",
        "But first, a name. What shall I call you, seeker?",
      ],
      () => setWaitingForNameInput(true)
    );
  }, [enqueue]);

  // ── Handle name submit ────────────────────────────────────────────
  const handleNameSubmit = () => {
    const name = inputValue.trim();
    if (!name) return;
    setUserName(name);
    setWaitingForNameInput(false);
    setInputValue("");
    addOrUpdateMessage({ id: `user-name-${Date.now()}`, role: "user", text: name });

    setTimeout(() => {
      enqueue(
        [
          `So it begins, ${name}.`,
          "Ready to see how this works?",
        ],
        () => setShowNext(true)
      );
    }, 400);
  };

  // ── Step 1 → 2 transition ─────────────────────────────────────────
  const handleNext = () => {
    if (step === 0) {
      setStep(1);
      setShowNext(false);
      setTimeout(() => {
        enqueue(
          [
            "Let's try something quick.",
            "Tell me about one thing on your mind today just a sentence or two.",
          ],
          () => setShowJournalInput(true)
        );
      }, 300);
    } else if (step === 1) {
      setStep(2);
      setShowNext(false);
      setTimeout(() => {
        enqueue(
          [
            "When you're journaling, how do you want me to respond?"
          ],
          () => setShowPersonalityOptions(true)
        );
      }, 300);
    } else if (step === 2) {
      setStep(3);
      setShowNext(false);
      setTimeout(() => {
        enqueue(
          [
            "Here's what your journal could look like in 2 weeks..."
          ],
          () => {
            // Add mock dashboard widget
            addOrUpdateMessage({
              id: `widget-mock-dashboard-${Date.now()}`,
              role: "ai",
              text: "",
              widget: "mock-dashboard"
            });

            setTimeout(() => {
              enqueue(
                [
                  "This is just the beginning.",
                  "Want to make it truly yours? Let's keep going."
                ],
                () => setShowNext(true)
              );
            }, 1000);
          }
        );
      }, 300);
    } else if (step === 3) {
      setStep(4);
      setShowNext(false);
      setTimeout(() => {
        enqueue(
          [
            "Let's talk about what you don't want your future to look like.",
            "What's a version of your life 5 years from now that would make you feel disappointed or stuck?"
          ],
          () => setWaitingForAntiVisionInput(true)
        );
      }, 300);
    } else if (step === 4) {
      setStep(5);
      setShowNext(false);
      
      const showFlipped = () => {
        // Enqueue the AI asking to review the vision
        setTimeout(() => {
          enqueue(
            [
              "Here's what I came up with based on what you shared. Does this feel right?"
            ],
            () => {
              setEditedVision(flippedVision || "I will continue to grow, remain present, and build a meaningful path forward.");
              setShowVisionEditor(true);
            }
          );
        }, 300);
      };

      if (isFlippingVision) {
        // If API is still running (slow LLM response), wait for it to finish
        const checkInterval = setInterval(() => {
          if (!isFlippingVision) {
            clearInterval(checkInterval);
            showFlipped();
          }
        }, 500);
      } else {
        showFlipped();
      }
    } else if (step === 5) {
      setStep(6);
      setShowNext(false);
      
      const showGoals = () => {
        setTimeout(() => {
          enqueue(
            [
              "Based on your vision, let's set some goals to help you get there:"
            ],
            () => {
              setShowGoalsEditor(true);
              // after rendering goals editor, prompt the user
              setTimeout(() => {
                enqueue([
                  "Write down a few goals you want to focus on."
                ], () => setShowNext(true));
              }, 1000);
            }
          );
        }, 300);
      };
      
      showGoals();
    } else if (step === 6) {
      setStep(7);
      setShowNext(false);
      
      const firstGoal = goals.find(g => g.text.trim())?.text || "grow and reflect";
      const cleanGoal = firstGoal.replace(/^[A-Z]/, c => c.toLowerCase()).replace(/\.$/, "");

      setTimeout(() => {
        enqueue(
          [
            `You're all set, ${userName}!`,
            `Your journal is now personalized to help you ${cleanGoal}.`,
            "Want to write your first real entry now?"
          ],
          () => setShowFinalActions(true)
        );
      }, 300);
    }
  };

  // ── Handle journal entry submit from JournalInput ─────────────────
  const handleJournalSubmit = useCallback(async (content: string, modelName?: string) => {
    setShowJournalInput(false);
    setProcessingEntry(true);
    setError(null);

    // Show what the user wrote as a user message
    addOrUpdateMessage({ id: `user-journal-${Date.now()}`, role: "user", text: content });

    // Show "thinking" AI message
    const thinkingId = `ai-thinking-${Date.now()}`;
    addOrUpdateMessage({ id: thinkingId, role: "ai", text: "Thinking...", isTyping: true });

    try {
      const created = await api.createEntry(content, modelName);

      // Poll until processed
      pollRef.current = setInterval(async () => {
        try {
          const updated = await api.getEntry(created.id);
          if (!updated.pending) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setProcessingEntry(false);

            // Remove thinking message, show entry card
            setMessages((prev) => prev.filter((m) => m.id !== thinkingId));

            // Add the entry preview card into the chat stream
            addOrUpdateMessage({
              id: `widget-entry-${updated.id}`,
              role: "ai",
              text: "",
              widget: "entry-card",
              entry: updated,
            });

            // Build AI reflection based on entry data
            const reflection = buildReflection(updated);
            setTimeout(() => {
              enqueue(reflection, () => setShowNext(true));
            }, 600);
          }
        } catch {
          // transient error — keep polling
        }
      }, POLL_INTERVAL_MS);
    } catch (err: any) {
      clearInterval(pollRef.current!);
      setProcessingEntry(false);
      setMessages((prev) => prev.filter((m) => m.id !== thinkingId));
      setError(err.message || "Something went wrong. Please try again.");
    }
  }, [addOrUpdateMessage, enqueue]);

  // ── Handle skip journal step ──────────────────────────────────────
  const handleSkipJournal = () => {
    setShowJournalInput(false);
    addOrUpdateMessage({ id: `user-skip-journal-${Date.now()}`, role: "user", text: "I'll skip this for now." });
    
    setTimeout(() => {
      enqueue(["No problem. You can start journaling whenever you're ready."], () => setShowNext(true));
    }, 400);
  };

  // ── Build AI reflection from the processed entry ──────────────────
  const buildReflection = (entry: JournalEntry): string[] => {
    const lines: string[] = [];

    if (entry.summary) {
      // Empathetic reflection based on sentiment
      if (entry.sentiment !== null) {
        if (entry.sentiment > 0.2) {
          lines.push(`It sounds like there's something genuinely positive pulling at you right now.`);
        } else if (entry.sentiment < -0.2) {
          lines.push(`It sounds like you're carrying something heavy — and that's worth acknowledging.`);
        } else {
          lines.push(`It sounds like you're sitting in that in-between space — not great, not terrible.`);
        }
      }
      lines.push(`What about this is weighing on you most right now?`);
    } else {
      lines.push("I see your thought. I'm still processing it fully — but I'm here.");
    }

    return lines;
  };

  // ── Handle personality submit ───────────────────────────────────────
  const handlePersonalitySubmit = async () => {
    setShowPersonalityOptions(false);
    setError(null);
    setIsSaving(true);

    let personalityText = "";
    if (selectedPersonality === "custom") {
      personalityText = customPersonality.trim();
    } else {
      const opt = PERSONALITY_OPTIONS.find((o) => o.id === selectedPersonality);
      personalityText = opt ? `You are ${opt.label.toLowerCase()}. You ${opt.desc.replace(/[()]/g, "")}.` : "";
    }

    if (!personalityText) {
      setIsSaving(false);
      return;
    }

    const userMsg = selectedPersonality === "custom" 
      ? customPersonality.trim() 
      : PERSONALITY_OPTIONS.find(o => o.id === selectedPersonality)?.label;
      
    addOrUpdateMessage({ id: `user-personality-${Date.now()}`, role: "user", text: userMsg || "" });

    try {
      // Create markdown structure expected by the personality profile
      const personalityContent = `# AI Personality\n\n${personalityText}\n`;
      // Use the generic saveProfile, which needs to be defined
      await saveProfile("personality", personalityContent);
      setIsSaving(false);

      let aiResponse = "I hear you. I'll adapt to your style.";
      if (selectedPersonality === "direct") aiResponse = "Got it. I won't sugarcoat things. Let's dig in.";
      else if (selectedPersonality === "warm") aiResponse = "I'm here to support you every step of the way.";
      else if (selectedPersonality === "curious") aiResponse = "Perfect. We'll explore the why behind everything.";
      else if (selectedPersonality === "calm") aiResponse = "Understood. We'll take it one step at a time.";

      setTimeout(() => {
        enqueue([aiResponse], () => setShowNext(true));
      }, 400);

    } catch (err: any) {
      setIsSaving(false);
      setError(err.message || "Failed to save personality.");
      setShowPersonalityOptions(true);
    }
  };

  // ── Handle skip personality step ──────────────────────────────────
  const handleSkipPersonality = () => {
    setShowPersonalityOptions(false);
    addOrUpdateMessage({ id: `user-skip-personality-${Date.now()}`, role: "user", text: "Skip this for now." });
    
    setTimeout(() => {
      enqueue(["That's fine. I'll stick to my default style for now.", "What's next?"], () => setShowNext(true));
    }, 400);
  };

  // ── Handle Anti-Vision ───────────────────────────────────────
  const handleAntiVisionSubmit = async () => {
    const text = antiVisionText.trim();
    if (!text) return;

    setWaitingForAntiVisionInput(false);
    setError(null);
    setIsFlippingVision(true);

    addOrUpdateMessage({ id: `user-antivision-${Date.now()}`, role: "user", text, isSad: true });

    // Asynchronously call the vision flip API
    fetch(`${API_BASE_URL}/profile/vision/flip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anti_vision: text }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Failed to flip vision");
      const data = await res.json();
      setFlippedVision(data.vision);
    }).catch((err) => {
      console.error("Vision flip failed:", err);
      // Fallback vision mapping 
      setFlippedVision("I will embrace opportunities, challenge my comfort zone, and actively cultivate a life of purpose and intention.");
    }).finally(() => {
      setIsFlippingVision(false);
    });

    setTimeout(() => {
      enqueue([
        "Thank you for sharing that. That takes courage.",
        "Let me flip this into something powerful..."
      ], () => setShowNext(true));
    }, 400);
  };

  const handleSkipAntiVision = () => {
    setWaitingForAntiVisionInput(false);
    setFlippedVision("I will focus on growth, stay present in my journey, and embrace the challenges ahead.");
    addOrUpdateMessage({ id: `user-skip-antivision-${Date.now()}`, role: "user", text: "I'd rather not think about that right now.", isSad: true });
    
    setTimeout(() => {
      enqueue(["That's completely fine. We can always explore it later.", "Let's move on..."], () => setShowNext(true));
    }, 400);
  };

  // ── Handle Vision Editing (Step 5) ───────────────────────────────────
  const handleVisionAccept = async () => {
    setShowVisionEditor(false);
    setIsSaving(true);
    addOrUpdateMessage({ id: `user-vision-accept-${Date.now()}`, role: "user", text: "Yes, this feels right." });

    try {
      await saveProfile("vision", editedVision);
      setIsSaving(false);
      
      setTimeout(() => {
        enqueue([
          "Vision saved.",
          "Hold on to this. Every entry you write is a step toward this vision."
        ], () => setShowNext(true));
      }, 400);
    } catch (err: any) {
      setIsSaving(false);
      setError(err.message || "Failed to save vision.");
      setShowVisionEditor(true);
    }
  };

  const handleVisionRegenerate = async () => {
    if (!regeneratePrompt.trim()) return;
    
    setVisionEditorMode("view");
    setShowVisionEditor(false);
    setIsFlippingVision(true);

    const userPrompt = regeneratePrompt.trim();
    addOrUpdateMessage({ id: `user-regen-${Date.now()}`, role: "user", text: `Make it feel ${userPrompt}.` });

    // Inform backend to adapt the vision to the feeling requested
    const overrideAntiVision = `Original anti-vision context: ${antiVisionText}\n\nPlease regenerate the flipped vision to evoke this feeling: ${userPrompt}`;
    
    fetch(`${API_BASE_URL}/profile/vision/flip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anti_vision: overrideAntiVision }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Failed to flip vision");
      const data = await res.json();
      setFlippedVision(data.vision);
      setEditedVision(data.vision);
    }).catch((err) => {
      console.error("Vision flip failed:", err);
      // Basic fallback
      setFlippedVision(editedVision + `\n\n(Tone adjusted for: ${userPrompt})`);
      setEditedVision(editedVision + `\n\n(Tone adjusted for: ${userPrompt})`);
    }).finally(() => {
      setIsFlippingVision(false);
      setRegeneratePrompt("");
      setTimeout(() => {
        enqueue(["Here is the updated version. Does this feel better?"], () => setShowVisionEditor(true));
      }, 400);
    });
  };

  // ── Handle Goals (Step 6) ───────────────────────────────────────────
  const handleSaveGoals = async () => {
    setShowGoalsEditor(false);
    setIsSaving(true);
    addOrUpdateMessage({ id: `user-goals-accept-${Date.now()}`, role: "user", text: "These goals look great." });

    try {
      const goalsContent = `# Goals\n\n${goals.map(g => `- ${g.text}`).join('\n')}\n`;
      await saveProfile("goals", goalsContent);
      setIsSaving(false);
      
      setTimeout(() => {
        enqueue([
          "Goals are set! Now we have a solid foundation."
        ], () => setShowNext(true));
      }, 400);
    } catch (err: any) {
      setIsSaving(false);
      setError(err.message || "Failed to save goals.");
      setShowGoalsEditor(true);
    }
  };

  const updateGoal = (id: number, text: string) => {
    setGoals(goals.map(g => g.id === id ? { ...g, text } : g));
  };

  const removeGoal = (id: number) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const addGoal = () => {
    const newId = goals.length > 0 ? Math.max(...goals.map(g => g.id)) + 1 : 1;
    setGoals([...goals, { id: newId, text: "" }]);
  };

  // ── Backend helpers ───────────────────────────────────────────────
  const saveProfile = async (section: string, content: string) => {
    const response = await fetch(`${API_BASE_URL}/profile/${section}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error(`Failed to save ${section}`);
  };

  const markOnboardingComplete = async () => {
    const response = await fetch(`${API_BASE_URL}/profile/onboarding/complete`, { method: "POST" });
    if (!response.ok) throw new Error("Failed to mark onboarding complete");
  };

  const handleSkip = async () => {
    try { await markOnboardingComplete(); onComplete(); }
    catch (err: any) { setError(err.message || "Failed to skip onboarding."); }
  };

  const handleFinish = async () => {
    try {
      setIsSaving(true);
      await markOnboardingComplete();
      router.push("/");
      onComplete();
    } catch (err: any) {
      setIsSaving(false);
      setError(err.message || "Failed to finish onboarding.");
    }
  };

  const handleStartLater = async () => {
    try {
      setIsSaving(true);
      await markOnboardingComplete();
      router.push("/dashboard");
      onComplete();
    } catch (err: any) {
      setIsSaving(false);
      setError(err.message || "Failed to finish onboarding.");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed -top-32 -left-32 h-[420px] w-[420px] rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(circle, oklch(0.6 0.118 184.704), transparent 70%)" }}
      />

      {/* Skip */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleSkip}
          className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          Skip for now
        </button>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 sm:px-12 md:px-0">
        <div className="mx-auto max-w-2xl space-y-1 py-8">
          {messages.map((msg) => {
            if (msg.widget === "entry-card" && msg.entry) {
              return <EntryPreviewCard key={msg.id} entry={msg.entry} />;
            }
            if (msg.widget === "mock-dashboard") {
              return <MockDashboardWidget key={msg.id} />;
            }
            return msg.role === "ai"
              ? <AiMessageLine key={msg.id} text={msg.text} isTyping={msg.isTyping} />
              : <UserMessageLine key={msg.id} text={msg.text} isSad={msg.isSad} />;
          })}

          {/* Journal input rendered inline in the chat */}
          {showJournalInput && (
            <div className="pt-4 pb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <JournalInput onSubmit={handleJournalSubmit} />
              <div className="mt-3 flex justify-end pr-4">
                <button
                  onClick={handleSkipJournal}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  Skip this step
                </button>
              </div>
            </div>
          )}

          {/* Personality Options inline in chat */}
          {showPersonalityOptions && (
            <div className="pt-4 pb-2 pl-4 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-md">
              <div className="flex flex-col gap-3">
                {PERSONALITY_OPTIONS.map((opt) => (
                  <label 
                    key={opt.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedPersonality === opt.id ? 'bg-chart-2/10 border-chart-2/50' : 'border-white/5 hover:bg-white/5'}`}
                    onClick={() => setSelectedPersonality(opt.id)}
                  >
                    <div className="mt-0.5 flex shrink-0 items-center justify-center w-4 h-4 rounded-full border border-muted-foreground/50">
                      {selectedPersonality === opt.id && <div className="w-2 h-2 rounded-full bg-chart-2" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{opt.label}</span>
                      <span className="text-xs text-muted-foreground">{opt.desc}</span>
                    </div>
                  </label>
                ))}
                
                <label 
                  className={`flex flex-col gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${selectedPersonality === 'custom' ? 'bg-chart-2/10 border-chart-2/50' : 'border-white/5 hover:bg-white/5'}`}
                  onClick={() => {
                    setSelectedPersonality("custom");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex shrink-0 items-center justify-center w-4 h-4 rounded-full border border-muted-foreground/50">
                      {selectedPersonality === 'custom' && <div className="w-2 h-2 rounded-full bg-chart-2" />}
                    </div>
                    <span className="text-sm font-medium text-foreground">Other (type your own)</span>
                  </div>
                  {selectedPersonality === "custom" && (
                    <input
                      type="text"
                      value={customPersonality}
                      onChange={(e) => setCustomPersonality(e.target.value)}
                      placeholder="e.g. Sarcastic but helpful..."
                      className="mt-2 w-full bg-transparent border-b border-border/50 py-1.5 text-sm text-foreground focus:outline-none focus:border-chart-2"
                      autoFocus
                    />
                  )}
                </label>

                <div className="mt-4 flex items-center justify-end gap-6">
                  <button
                    onClick={handleSkipPersonality}
                    className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    Skip this step
                  </button>
                  <button
                    onClick={handlePersonalitySubmit}
                    disabled={!selectedPersonality || (selectedPersonality === "custom" && !customPersonality.trim())}
                    className="rounded-full border border-border px-6 py-2 text-sm font-mono text-foreground transition-all duration-200 hover:bg-accent hover:border-foreground/20 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Processing indicator when waiting for AI analysis */}
          {(processingEntry || isSaving || isFlippingVision) && (
            <div className="flex items-center gap-2 pl-4 py-2 text-sm text-muted-foreground animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-chart-2" />
              <span className="font-mono text-xs">
                {isFlippingVision ? "Manas is flipping your vision…" : isSaving ? "Saving…" : "Manas is thinking…"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="mx-auto w-full max-w-2xl px-6 sm:px-12 md:px-0 pb-10">
        {error && (
          <div className="mb-3 rounded-md bg-destructive/15 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Name input (Step 0 only) */}
        {waitingForNameInput && (
          <div className="group relative">
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-chart-2/60" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleNameSubmit(); }}
              placeholder="Write here…"
              className="w-full bg-transparent pl-4 pr-4 py-2 text-[17px] text-foreground placeholder:text-muted-foreground/30 font-system-serif outline-none caret-chart-2 transition-colors duration-200"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        )}

        {/* Anti-Vision Input (Step 4) */}
        {waitingForAntiVisionInput && (
          <div className="group relative animate-in fade-in slide-in-from-bottom-2 duration-500 mb-6 max-w-xl">
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-slate-800" />
            <textarea
              autoFocus
              value={antiVisionText}
              onChange={(e) => setAntiVisionText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAntiVisionSubmit();
                }
              }}
              placeholder="A life where I didn't take any chances..."
              className="w-full bg-slate-950/20 pl-4 pr-4 py-3 text-[16px] text-slate-500 placeholder:text-slate-700 font-system-serif outline-none focus:bg-slate-900/40 border border-transparent focus:border-slate-800 rounded-r-lg resize-none caret-slate-600 transition-all duration-300 min-h-[100px]"
              autoComplete="off"
              spellCheck="false"
            />
            
            <div className="mt-3 flex items-center justify-end gap-6 pr-4">
              <button
                onClick={handleSkipAntiVision}
                className="text-xs font-mono text-slate-600 hover:text-slate-400 transition-colors duration-200"
              >
                Skip this step
              </button>
              <button
                onClick={handleAntiVisionSubmit}
                disabled={!antiVisionText.trim()}
                className="rounded-full border border-slate-800 bg-slate-950 px-6 py-2 text-sm font-mono text-slate-500 transition-all duration-200 hover:bg-slate-900 hover:text-slate-400 hover:border-slate-700 disabled:opacity-30 disabled:hover:bg-slate-950"
              >
                Reflect
              </button>
            </div>
          </div>
        )}

        {/* Vision Editor (Step 5) */}
        {showVisionEditor && (
          <div className="group relative animate-in fade-in slide-in-from-bottom-2 duration-500 mb-6 max-w-xl pl-4">
            
            {/* View Mode */}
            {visionEditorMode === "view" && (
              <div className="rounded-xl border border-white/10 bg-[oklch(0.13_0.005_260/0.55)] p-5 backdrop-blur-md shadow-xl">
                <div className="prose prose-invert max-w-none text-sm font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {editedVision.split('\n').map((line, i) => <p key={i} className="my-1">{line}</p>)}
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button onClick={handleVisionAccept} className="flex items-center gap-2 rounded-full bg-chart-2/20 text-chart-2 border border-chart-2/30 px-4 py-2 text-xs font-medium hover:bg-chart-2/30 transition-colors">
                    ✅ Accept
                  </button>
                  <button onClick={() => setVisionEditorMode("edit")} className="flex items-center gap-2 rounded-full bg-white/5 text-foreground border border-white/10 px-4 py-2 text-xs font-medium hover:bg-white/10 transition-colors">
                    ✏️ Edit inline
                  </button>
                  <button onClick={() => setVisionEditorMode("regenerate")} className="flex items-center gap-2 rounded-full bg-white/5 text-foreground border border-white/10 px-4 py-2 text-xs font-medium hover:bg-white/10 transition-colors">
                    🔄 Regenerate
                  </button>
                </div>
              </div>
            )}

            {/* Edit Mode */}
            {visionEditorMode === "edit" && (
              <div className="rounded-xl border border-white/20 bg-[oklch(0.13_0.005_260/0.75)] p-2 backdrop-blur-md shadow-2xl">
                <textarea
                  value={editedVision}
                  onChange={(e) => setEditedVision(e.target.value)}
                  className="w-full bg-transparent p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/30 outline-none resize-none min-h-[150px] leading-relaxed"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-3 p-3 border-t border-white/10 mt-2">
                  <button onClick={() => { setEditedVision(flippedVision || ""); setVisionEditorMode("view"); }} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => setVisionEditorMode("view")} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-mono text-foreground transition-colors hover:bg-white/20">
                    Save Edits
                  </button>
                </div>
              </div>
            )}

            {/* Regenerate Mode */}
            {visionEditorMode === "regenerate" && (
              <div className="rounded-xl border border-white/10 bg-[oklch(0.13_0.005_260/0.55)] p-5 backdrop-blur-md shadow-xl">
                <p className="font-system-serif text-foreground/90 text-sm mb-3">
                  What's the feeling you want to have when you read this vision?
                </p>
                <input
                  type="text"
                  value={regeneratePrompt}
                  onChange={(e) => setRegeneratePrompt(e.target.value)}
                  placeholder="e.g. Energized, Calm, Confident..."
                  className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-chart-2/50 transition-colors mb-4"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleVisionRegenerate(); }}
                />
                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => setVisionEditorMode("view")} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleVisionRegenerate} disabled={!regeneratePrompt.trim()} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-mono text-foreground transition-colors hover:bg-white/20 disabled:opacity-30">
                    Regenerate
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Goals Editor (Step 6) */}
        {showGoalsEditor && (
          <div className="group relative animate-in fade-in slide-in-from-bottom-2 duration-500 mb-6 max-w-xl pl-4">
            <div className="rounded-xl border border-white/10 bg-[oklch(0.13_0.005_260/0.55)] p-5 backdrop-blur-md shadow-xl flex flex-col gap-3">
              {goals.map((goal, idx) => (
                <div key={goal.id} className="flex items-start gap-3 group/goal">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-chart-1/10 text-chart-1/80 text-xs font-mono font-bold mt-1">
                    {idx + 1}
                  </div>
                  <div className="flex-1 relative">
                    <textarea 
                      value={goal.text}
                      onChange={(e) => updateGoal(goal.id, e.target.value)}
                      placeholder="Type a solid goal..."
                      className="w-full bg-transparent p-2 text-sm font-system-serif text-foreground placeholder:text-muted-foreground/30 outline-none resize-none min-h-[44px] leading-relaxed border border-transparent focus:border-white/10 rounded-md transition-colors caret-chart-1"
                    />
                  </div>
                  <button 
                    onClick={() => removeGoal(goal.id)}
                    className="mt-2 shrink-0 p-1.5 text-muted-foreground/30 hover:text-rose-400 opacity-0 group-hover/goal:opacity-100 transition-all rounded-md hover:bg-white/5"
                    aria-label="Remove goal"
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              <div className="pt-2 mt-2 border-t border-white/5">
                <button 
                  onClick={addGoal}
                  className="flex items-center gap-2 text-xs font-mono tracking-wider text-muted-foreground hover:text-chart-1 transition-colors px-2 py-1"
                >
                  <span className="text-[14px] leading-none">+</span> Add another goal
                </button>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handleSaveGoals}
                  disabled={goals.length === 0 || goals.some(g => !g.text.trim())}
                  className="rounded-full bg-chart-1/20 border border-chart-1/30 px-6 py-2 text-sm font-medium text-chart-1 hover:bg-chart-1/30 transition-colors disabled:opacity-30"
                >
                  Save Goals
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Final Actions (Step 8) */}
        {showFinalActions && (
          <div className="mt-6 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
            <button
              onClick={handleFinish}
              disabled={isSaving}
              className="group relative flex w-full max-w-sm items-center justify-center gap-3 overflow-hidden rounded-full bg-chart-1 px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl transition-all hover:bg-chart-1/90 disabled:opacity-50"
            >
              Let's do it
            </button>
            <button
              onClick={handleStartLater}
              disabled={isSaving}
              className="text-xs font-mono tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              I'll start later
            </button>
          </div>
        )}

        {/* Next button */}
        {showNext && !showFinalActions && (
          <div className="mt-6 flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
            <button
              onClick={handleNext}
              className="rounded-full border border-border px-8 py-2.5 text-sm font-mono text-foreground transition-all duration-200 hover:bg-accent hover:border-foreground/20"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function AiMessageLine({ text, isTyping }: { text: string; isTyping?: boolean }) {
  return (
    <div className="relative pl-4 py-0.5 animate-in fade-in duration-500">
      <div className="absolute left-0 top-0 bottom-0 w-[1.5px] bg-chart-2/30" />
      <p className="text-[20px] leading-snug text-foreground/90 font-system-serif tracking-tight">
        {text}
        {isTyping && (
          <span className="ml-1 inline-block h-[18px] w-[2px] bg-chart-2 animate-pulse align-middle" />
        )}
      </p>
    </div>
  );
}

function UserMessageLine({ text, isSad }: { text: string; isSad?: boolean }) {
  return (
    <div className="py-0.5 mt-1 mb-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <p className={`text-[17px] leading-normal font-system-serif pl-4 ${isSad ? 'text-slate-500 italic' : 'text-foreground'}`}>
        {text}
      </p>
    </div>
  );
}

// ─── Entry preview card (mirrors previous-entries card style) ────────────
function EntryPreviewCard({ entry }: { entry: JournalEntry }) {
  const sentiment =
    entry.sentiment === null ? "neutral"
    : entry.sentiment > 0.2 ? "positive"
    : entry.sentiment < -0.2 ? "negative"
    : "neutral";

  const sentimentConfig = {
    positive: { icon: Sun, label: "Bright", pill: "bg-amber-500/10 border-amber-500/20 text-amber-400/80", iconColor: "text-amber-400" },
    neutral:  { icon: Cloud, label: "Still", pill: "bg-slate-500/10 border-slate-500/20 text-slate-400/80", iconColor: "text-slate-400" },
    negative: { icon: CloudRain, label: "Heavy", pill: "bg-rose-900/20 border-rose-700/20 text-rose-400/70", iconColor: "text-rose-400/80" },
  };
  const cfg = sentimentConfig[sentiment];
  const SentimentIcon = cfg.icon;

  const title = entry.title || entry.user_log.split(/[.!?]/)[0]?.trim().split(" ").slice(0, 5).join(" ") || "Untitled";
  const timestamp = new Date(entry.date);

  return (
    <div className="ml-4 mt-3 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 mb-1.5 pl-0.5">
        Here's what I captured —
      </p>
      <article className="rounded-xl border border-white/5 bg-[oklch(0.13_0.005_260/0.55)] backdrop-blur-xl transition-all">
        {/* Top row */}
        <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
          <span className="flex-1 truncate font-mono text-xs font-semibold tracking-wide text-white">
            {title}
          </span>
          {entry.pending ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-chart-1/30 bg-chart-1/10 px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-chart-1/80 animate-pulse">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              Processing
            </span>
          ) : entry.emotion ? (
            <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground/50 bg-white/5 px-2 py-0.5 rounded-full">
              {entry.emotion}
            </span>
          ) : null}
          <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground/35">
            {format(timestamp, "MMM d")}
          </span>
        </div>

        {/* Content + sentiment */}
        <div className="flex items-center gap-3 px-4 pb-3.5">
          <p className="flex-1 truncate font-mono text-[11px] leading-relaxed text-muted-foreground/45">
            {entry.user_log}
          </p>
          {!entry.pending && (
            <span className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide ${cfg.pill}`}>
              <SentimentIcon className={`h-2.5 w-2.5 ${cfg.iconColor}`} />
              {cfg.label}
            </span>
          )}
        </div>

        {/* AI summary — shown once processed */}
        {!entry.pending && entry.summary && (
          <div className="px-4 pb-4 border-t border-white/5 pt-3">
            <p className="text-[11px] leading-relaxed text-muted-foreground/50 font-mono">
              {entry.summary}
            </p>
          </div>
        )}
      </article>
    </div>
  );
}

// ─── Mock Dashboard widget (Step 4) ──────────────────────────────────────
function MockDashboardWidget() {
  const MOCK_STREAK = { current_streak: 12, longest_streak: 12, total_entries: 24 };
  const MOCK_EMOTIONS = [
    { emotion: "reflective", count: 10 },
    { emotion: "hopeful", count: 6 },
    { emotion: "anxious", count: 4 },
    { emotion: "focused", count: 4 },
  ];

  return (
    <div className="ml-4 mt-6 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 max-w-xl">
        {/* Streak */}
        <div className="sm:col-span-2">
           <StreakCard data={MOCK_STREAK} />
        </div>

        {/* Emotion Chart */}
        <div className="flex">
           <div className="w-full">
             <EmotionChart data={MOCK_EMOTIONS} />
           </div>
        </div>

        {/* AI Insight & Recent Summary */}
        <div className="flex flex-col gap-3">
          {/* AI Generated Insight */}
          <article className="flex-1 rounded-xl border border-white/5 bg-[oklch(0.13_0.005_260/0.55)] backdrop-blur-xl p-4 flex flex-col justify-center transition-all hover:border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-chart-2/80" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/60">Insight</span>
            </div>
            <p className="font-system-serif text-[15px] leading-snug text-foreground/80">
              "You journal most on Sundays when you're planning your week. It seems to clear your mind for Monday."
            </p>
          </article>

          {/* Recent Entry Summary */}
          <article className="flex-1 rounded-xl border border-white/5 bg-[oklch(0.13_0.005_260/0.55)] backdrop-blur-xl p-4 flex flex-col justify-center transition-all hover:border-white/10">
             <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-chart-1/80" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/60">Recent</span>
            </div>
            <p className="font-mono text-xs leading-relaxed text-muted-foreground/60">
              Felt a bit overwhelmed today, but breaking down my tasks helped me find my center.
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}

