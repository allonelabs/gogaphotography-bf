"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/app/lib/i18n/useLocale";
import { LOCALES, LOCALE_LABEL, type Locale } from "@/app/lib/i18n/dict";

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDocClick);
    return () => window.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Language"
        title="Language"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium uppercase text-[var(--ink-700)] transition hover:bg-[var(--bg-sunken)]"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
        </svg>
        <span className="tracking-wider">{locale}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[140px] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--allonce-line)] bg-white shadow-[var(--shadow-md)]">
          {LOCALES.map((l: Locale) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition hover:bg-[var(--bg-sunken)] ${
                locale === l
                  ? "font-semibold text-[var(--ink-900)]"
                  : "text-[var(--ink-700)]"
              }`}
            >
              <span>{LOCALE_LABEL[l]}</span>
              <span className="font-mono text-[10px] uppercase text-[var(--ink-400)]">
                {l}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
