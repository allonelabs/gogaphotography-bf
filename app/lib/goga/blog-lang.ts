// app/lib/goga/blog-lang.ts
export type LangChoice = "ka" | "en" | "ru";

const LANGS: readonly LangChoice[] = ["ka", "en", "ru"];

export function normalizeLang(raw: string | undefined | null): LangChoice {
  return LANGS.includes(raw as LangChoice) ? (raw as LangChoice) : "ka";
}

/** One row's text in each language. The `_en`/`_ru` columns are nullable. */
export type LangFields = {
  ka: string | null;
  en: string | null;
  ru: string | null;
};

/**
 * Return the field for `lang`, falling back to Georgian (always authored by
 * hand) and then English. Named fields rather than positional arguments, so a
 * call site cannot quietly swap `en` and `ru`.
 */
export function pickLang(fields: LangFields, lang: LangChoice): string {
  for (const l of [lang, "ka", "en"] as const) {
    const value = fields[l];
    if (value && value.trim().length > 0) return value;
  }
  return "";
}
