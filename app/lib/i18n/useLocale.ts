"use client";

import { useEffect, useState, useCallback } from "react";
import { translate, type Locale, type TranslationKey } from "./dict";

const STORAGE_KEY = "tp.locale";
const EVENT = "tp.locale.change";

// GOGA's studio works in Georgian, so the admin opens in Georgian until the
// operator picks English.
export const DEFAULT_LOCALE: Locale = "ka";

function readLocaleFromDocument(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  // Prefer <html data-locale> set by LocaleBoot (server cookie → SSR)
  const fromHtml = document.documentElement.dataset.locale;
  if (fromHtml === "en" || fromHtml === "ka") return fromHtml;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ka") return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(readLocaleFromDocument());
    function onChange(e: Event) {
      const next = (e as CustomEvent<{ locale: Locale }>).detail?.locale;
      if (next === "en" || next === "ka") setLocaleState(next);
    }
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    document.documentElement.dataset.locale = next;
    document.documentElement.lang = next;
    // 1-year cookie so server components can read it on next request
    document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { locale: next } }));
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );

  /** Inline pair for admin copy that has no dict key: tr("Save", "შენახვა"). */
  const tr = useCallback(
    (en: string, ka: string) => (locale === "ka" ? ka : en),
    [locale],
  );

  return { locale, setLocale, t, tr };
}
