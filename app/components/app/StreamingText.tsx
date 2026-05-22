'use client';

import { useEffect, useRef, useState } from 'react';

// ChatGPT-style character reveal. Two modes:
//
//   1. **Catch-up (live streaming):** the parent grows `text` over time
//      (e.g. SSE chunks land in 100-char bursts). We always animate from
//      `shown.length` UP TO `text.length` at a steady cadence, so visual
//      output stays smooth regardless of network jitter.
//
//   2. **Full-reply reveal:** parent gets the whole text at once (a
//      single /api/chat fetch) and passes it in. We type it out at the
//      same cadence as if it had streamed.
//
// Either way: the user sees consistent character flow. When `streaming`
// flips to false AND we've caught up to text.length, we fire `onDone`
// so the parent can swap to a static render.

interface Props {
  text: string;
  /** True while more text might still arrive. False once final. */
  streaming?: boolean;
  /** Characters per second to reveal at. ChatGPT ≈ 35-60 cps. */
  charsPerSecond?: number;
  /** Show a blinking caret at the tail while revealing. */
  showCaret?: boolean;
  /** Fires once shown === text AND streaming === false. */
  onDone?: () => void;
  className?: string;
}

export function StreamingText({
  text,
  streaming = false,
  charsPerSecond = 50,
  showCaret = true,
  onDone,
}: Props) {
  // Seed with a few visible characters when text arrives so the very first
  // paint after the thinking indicator never shows a bare caret alone (that
  // was the flicker — a solid block "▍" with no text behind it). The rAF
  // ticker takes over from there.
  const [shown, setShown] = useState(() => Math.min(text.length, 3));
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    function tick(now: number) {
      const last = lastTickRef.current || now;
      const dt = (now - last) / 1000;
      lastTickRef.current = now;

      setShown((prev) => {
        if (prev >= text.length) return prev;
        const add = Math.max(1, Math.floor(dt * charsPerSecond));
        // Try to keep within ~3000 chars of the live tail so we don't
        // fall arbitrarily behind during long replies.
        const gap = text.length - prev;
        const accel = gap > 600 ? 2 : 1;
        return Math.min(text.length, prev + add * accel);
      });

      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = 0;
    };
  }, [text, charsPerSecond]);

  // Fire onDone exactly once when we've fully caught up and stream is closed.
  useEffect(() => {
    if (!streaming && shown >= text.length && onDoneRef.current) {
      const cb = onDoneRef.current;
      onDoneRef.current = undefined; // one-shot
      cb();
    }
  }, [shown, text.length, streaming]);

  const visible = text.slice(0, shown);
  const stillRevealing = shown < text.length || streaming;
  // Don't render the caret if there's nothing behind it — a bare block on
  // its own reads as a glitch. Wait until at least one character is visible.
  const caretShouldShow = showCaret && stillRevealing && shown > 0;

  return (
    <>
      {visible}
      {caretShouldShow && (
        <>
          <span className="ao-stream-caret" aria-hidden>▍</span>
          <style jsx>{`
            .ao-stream-caret {
              display: inline-block;
              margin-left: 1px;
              color: var(--ink-900, #0d0d0d);
              font-weight: 400;
              line-height: 1;
              transform: translateY(0.05em);
              /* Soft fade-in so the block doesn't appear mid-render
                 with a hard edge — ChatGPT's caret has a similar feel. */
              animation: ao-stream-caret-fade 600ms ease-out;
            }
            @keyframes ao-stream-caret-fade {
              0%   { opacity: 0; }
              60%  { opacity: 0.85; }
              100% { opacity: 1; }
            }
          `}</style>
        </>
      )}
    </>
  );
}
