"use client";

import { useEffect } from "react";

// Reads `tp.locale` from localStorage on first render and applies to <html>
// so the useLocale() hook can pick it up. Cookie was set when the operator
// last toggled locale; this script ensures localStorage also tracks it for
// fast initial client renders.

const KEY = "tp.locale";

export function LocaleBoot() {
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(KEY);
      if (stored === "en" || stored === "ka") {
        document.documentElement.dataset.locale = stored;
        document.documentElement.lang = stored;
      }
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
