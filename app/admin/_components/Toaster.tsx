"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Tone = "info" | "success" | "error";
type Toast = { id: number; text: string; tone: Tone };

interface ToastCtx {
  show: (text: string, tone?: Tone) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((text: string, tone: Tone = "info") => {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), text, tone }]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const oldest = toasts[0]!;
    const tid = setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== oldest.id)),
      3200,
    );
    return () => clearTimeout(tid);
  }, [toasts]);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[300] flex flex-col items-end gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto min-w-[220px] max-w-[360px] rounded-xl px-4 py-2.5 text-[13px] shadow-[0_10px_28px_rgba(0,0,0,0.18)] ring-1 ${
              t.tone === "success"
                ? "bg-slate-900 text-slate-900 ring-black/10"
                : t.tone === "error"
                  ? "bg-slate-200 text-slate-900 ring-black/10"
                  : "bg-white text-[var(--ink-900)] ring-black/10"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const v = useContext(Ctx);
  if (!v)
    return {
      show: (text: string) => {
        if (typeof window !== "undefined") console.log("[toast]", text);
      },
    };
  return v;
}
