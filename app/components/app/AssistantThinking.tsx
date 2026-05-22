'use client';

import { useEffect, useState } from 'react';

// Multi-state thinking indicator. Cycles through stage labels with a
// soft cross-fade and a pulsing accent dot. Used in:
//   - shell-zone /app/spawn (assistant bubble while waiting for first token)
//   - shell-zone AppChatPane (assistant placeholder while /api/chat resolves)
//
// Stages are deliberately generic since we don't have hooks into which
// real phase the model is in mid-flight. When we later thread per-stage
// signals (tool_use, tool_executed, etc.) we can pass `stage` explicitly.

const DEFAULT_STAGES = [
  'Thinking',
  'Reading context',
  'Composing',
  'Reviewing',
];

interface Props {
  /** Optional explicit stage label. When set, the cycle stops and this
   *  is shown instead — useful once we know "Saving post" / "Adding
   *  contact" / "Deploying" etc. from a tool_use signal. */
  stage?: string;
  /** Override the rotation set. */
  stages?: string[];
  /** Ms per stage. */
  intervalMs?: number;
  className?: string;
}

export function AssistantThinking({
  stage,
  stages = DEFAULT_STAGES,
  intervalMs = 1400,
  className = '',
}: Props) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (stage) return; // pinned label, no rotation
    const t = setInterval(() => setI((x) => (x + 1) % stages.length), intervalMs);
    return () => clearInterval(t);
  }, [stage, stages.length, intervalMs]);

  const label = stage ?? stages[i] ?? '';

  return (
    <span
      className={`inline-flex items-center gap-2 text-[14.5px] leading-[1.6] text-[var(--ink-500)] ${className}`}
      aria-live="polite"
      aria-label={`Assistant: ${label}`}
    >
      <span className="ao-thinking-dot inline-block h-2 w-2 flex-shrink-0 rounded-full bg-[var(--ink-500)]" />
      <span key={label} className="ao-thinking-label">
        {label}
        <span className="ao-thinking-ellipsis">…</span>
      </span>
      <style jsx>{`
        .ao-thinking-dot {
          animation: ao-thinking-pulse 1.2s ease-in-out infinite;
        }
        @keyframes ao-thinking-pulse {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50%      { opacity: 0.9;  transform: scale(1.18); }
        }
        .ao-thinking-label {
          display: inline-block;
          animation: ao-thinking-fade-in 220ms ease-out;
        }
        @keyframes ao-thinking-fade-in {
          from { opacity: 0; transform: translateY(1px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ao-thinking-ellipsis {
          display: inline-block;
          animation: ao-thinking-dots 1.2s steps(4, end) infinite;
          width: 1ch;
          overflow: hidden;
          vertical-align: bottom;
        }
        @keyframes ao-thinking-dots {
          0%, 25%   { width: 0;    }
          50%       { width: 0.4ch; }
          75%       { width: 0.7ch; }
          100%      { width: 1ch;  }
        }
      `}</style>
    </span>
  );
}
