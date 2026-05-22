"use client";

// Full-screen voice-conversation overlay (ChatGPT voice-mode equivalent).
// Renders a pulsing orb driven by mic audio level, the live transcript, and
// the last assistant response. Closes via X or Esc.

import { useEffect } from "react";
import type { AgentState } from "@/app/lib/voice/useVoiceAgent";

interface VoiceOverlayProps {
  open: boolean;
  state: AgentState;
  transcript: string;
  lastReply: string;
  audioLevel: number;
  error: string | null;
  onClose: () => void;
  onToggleListen: () => void;
}

const STATE_LABEL: Record<AgentState, string> = {
  idle: "Tap to talk",
  listening: "Listening…",
  processing: "Thinking…",
  speaking: "Speaking…",
};

export function VoiceOverlay({
  open,
  state,
  transcript,
  lastReply,
  audioLevel,
  error,
  onClose,
  onToggleListen,
}: VoiceOverlayProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const orbScale =
    state === "listening"
      ? 1 + Math.min(audioLevel * 1.4, 0.4)
      : state === "speaking"
        ? 1.08
        : state === "processing"
          ? 1.04
          : 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-[var(--bg-app)] px-6 py-10 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Voice conversation"
    >
      <header className="flex w-full max-w-2xl items-center justify-between">
        <span className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-[var(--ink-400)]">
          Voice mode
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close voice mode"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-500)] transition hover:bg-[var(--bg-surface-alt)] hover:text-[var(--ink-900)]"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <button
          type="button"
          onClick={onToggleListen}
          aria-label={state === "listening" ? "Stop listening" : "Talk"}
          className="group relative flex h-44 w-44 items-center justify-center rounded-full focus:outline-none"
        >
          <span
            className="absolute inset-0 rounded-full bg-[var(--ink-900)] opacity-90 transition-transform duration-150 ease-out"
            style={{ transform: `scale(${orbScale.toFixed(3)})` }}
            aria-hidden
          />
          <span
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow:
                state === "listening"
                  ? `0 0 ${40 + audioLevel * 120}px rgba(10,10,10,0.35)`
                  : state === "speaking"
                    ? "0 0 60px rgba(10,10,10,0.25)"
                    : "0 0 18px rgba(10,10,10,0.12)",
              transition: "box-shadow 200ms ease",
            }}
            aria-hidden
          />
          {state === "listening" && (
            <span
              className="absolute inset-[-8px] animate-ping rounded-full border border-[var(--ink-900)] opacity-30"
              aria-hidden
            />
          )}
        </button>

        <p
          className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-[var(--ink-500)]"
          aria-live="polite"
        >
          {STATE_LABEL[state]}
        </p>

        <div
          className="min-h-[3.5rem] max-w-xl text-center text-[15px] leading-relaxed text-[var(--ink-900)]"
          aria-live="polite"
        >
          {state === "speaking" && lastReply ? lastReply : transcript || ""}
        </div>

        {error && (
          <p className="max-w-md text-center text-[12.5px] text-[var(--allonce-err)]">
            {error}
          </p>
        )}
      </div>

      <footer className="text-center text-[11px] text-[var(--ink-400)]">
        Esc to close · Tap the orb to start / stop
      </footer>
    </div>
  );
}
