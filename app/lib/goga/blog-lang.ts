// app/lib/goga/blog-lang.ts
export type LangChoice = "ka" | "en";

export function normalizeLang(raw: string | undefined | null): LangChoice {
  return raw === "en" ? "en" : "ka";
}

/** Return the field for `lang`, falling back to the other language if empty. */
export function pickLang(ka: string, en: string, lang: LangChoice): string {
  const primary = lang === "ka" ? ka : en;
  const fallback = lang === "ka" ? en : ka;
  return primary && primary.trim().length > 0 ? primary : fallback;
}
