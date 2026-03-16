"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE_URL = "http://localhost:8000";

// ─── Total onboarding steps (Welcome + 6 future steps) ────────────────
const TOTAL_STEPS = 7;

// ─── Types ─────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
  /** Whether this AI line is still being "typed" */
  isTyping?: boolean;
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

// ─── Typewriter hook ───────────────────────────────────────────────────
/**
 * Queues an array of AI messages line-by-line with a typewriter reveal.
 * Each line appears after `delayBetween` ms, and each character within a
 * line is revealed over `typeDuration` ms total.
 */
function useTypewriter(
  addMessage: (msg: ChatMessage) => void,
  delayBetween = 600,
  typeDuration = 40 // ms per character
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

        // Add a "typing" placeholder
        addMessage({ id, role: "ai", text: "", isTyping: true });

        // Reveal characters one by one
        const chars = line.split("");
        for (let c = 0; c < chars.length; c++) {
          await wait(typeDuration);
          addMessage({
            id,
            role: "ai",
            text: line.slice(0, c + 1),
            isTyping: c < chars.length - 1,
          });
        }

        // Mark complete
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
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasStartedRef = useRef(false);

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

  // ── Auto-scroll to bottom ──────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // ── Focus input when waiting ───────────────────────────────────────
  useEffect(() => {
    if (waitingForInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [waitingForInput]);

  // ── Step 0: Initial greeting ───────────────────────────────────────
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    enqueue(
      [
        "The The fastest way to change is to obsessively reflect back on your life and do not lie to yourself of what life it is creating.",
        "~ Dan Koe",
        "Welcome to manasCore",
        "In the moments ahead, you will shape this journal to reflect your nature your ambitions, your fears, the future you seek to forge.",
        "But first, a name. What shall I call you, seeker?"
      ],
      () => setWaitingForInput(true)
    );
  }, [enqueue]);

  // ── Handle user submitting their name ──────────────────────────────
  const handleNameSubmit = () => {
    const name = inputValue.trim();
    if (!name) return;

    setUserName(name);
    setWaitingForInput(false);
    setInputValue("");

    // Add user message bubble
    const userMsgId = `user-${Date.now()}`;
    addOrUpdateMessage({ id: userMsgId, role: "user", text: name });

    // AI follows up
    setTimeout(() => {
      enqueue(
        [
          `So it begins bearer of the name ${name}.`,
          "Ready to see how this works?",
        ],
        () => setShowNext(true)
      );
    }, 400);
  };

  // ── Backend helpers (preserved from original) ──────────────────────
  const saveProfile = async (section: string, content: string) => {
    const response = await fetch(`${API_BASE_URL}/profile/${section}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error(`Failed to save ${section}`);
  };

  const markOnboardingComplete = async () => {
    const response = await fetch(
      `${API_BASE_URL}/profile/onboarding/complete`,
      { method: "POST" }
    );
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

  const handleNext = () => {
    // For now only Step 0 is implemented.
    // Future steps will extend this switch.
    if (step === 0) {
      setStep(1);
      setShowNext(false);
      // TODO: Step 1 conversation will be triggered here
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* ── Ambient glow (top-left) ─────────────────────────────────── */}
      <div
        className="pointer-events-none fixed -top-32 -left-32 h-[420px] w-[420px] rounded-full opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle, oklch(0.6 0.118 184.704), transparent 70%)",
        }}
      />

      {/* ── Skip link (top-right) ───────────────────────────────────── */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleSkip}
          className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          Skip for now
        </button>
      </div>

      {/* ── Chat area ───────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 sm:px-12 md:px-0"
      >
        <div className="mx-auto max-w-2xl space-y-1 py-8">
          {messages.map((msg) =>
            msg.role === "ai" ? (
              <AiMessageLine key={msg.id} text={msg.text} isTyping={msg.isTyping} />
            ) : (
              <UserMessageLine key={msg.id} text={msg.text} />
            )
          )}
        </div>
      </div>

      {/* ── Input area / Next button ─────────────────────────────────── */}
      <div className="mx-auto w-full max-w-2xl px-6 sm:px-12 md:px-0 pb-10">
        {error && (
          <div className="mb-3 rounded-md bg-destructive/15 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {waitingForInput && (
          <div className="group relative">
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-chart-2/60" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSubmit();
              }}
              placeholder="Write here…"
              className="w-full bg-transparent pl-4 pr-4 py-2 text-[17px] text-foreground placeholder:text-muted-foreground/30 font-system-serif outline-none caret-chart-2 transition-colors duration-200"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        )}

        {showNext && (
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

function AiMessageLine({
  text,
  isTyping,
}: {
  text: string;
  isTyping?: boolean;
}) {
  return (
    <div className="relative pl-4 py-0.5 animate-in fade-in duration-500">
      {/* Teal left accent bar */}
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

function UserMessageLine({ text }: { text: string }) {
  return (
    <div className="py-0.5 mt-1 mb-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <p className="text-[17px] leading-normal text-foreground font-system-serif pl-4">
        {text}
      </p>
    </div>
  );
}
