"use client";

import { useEffect } from "react";

// Reads `allonce.prefs` from localStorage on first render and applies the
// values (accent color, density, theme, chat side) to <html>. Mounted once
// in AppShell so every dashboard page picks them up.

const KEY = "allonce.prefs";

interface Prefs {
  theme?: string;
  density?: string;
  chatSide?: string;
  accent?: string;
}

export function PreferencesBoot() {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as Prefs;
      const root = document.documentElement;
      if (typeof p.accent === "string") root.style.setProperty("--ao-accent", p.accent);
      if (typeof p.density === "string") root.dataset.density = p.density;
      if (typeof p.theme === "string") root.dataset.theme = p.theme;
      if (typeof p.chatSide === "string") root.dataset.chatSide = p.chatSide;
    } catch { /* ignore */ }
  }, []);
  return null;
}
