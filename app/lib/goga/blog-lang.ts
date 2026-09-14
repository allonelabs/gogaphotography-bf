// app/lib/goga/blog-lang.ts
export type LangChoice = "ka" | "en" | "ru";

/** Offer order in the switcher: Georgian first, it is the studio's own language. */
export const LANGS: readonly LangChoice[] = ["ka", "en", "ru"];

/** Endonyms — a reader looking for Russian scans for "Русский", not "Russian". */
export const LANG_LABEL: Record<LangChoice, string> = {
  ka: "ქართული",
  en: "English",
  ru: "Русский",
};

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

/**
 * URL for `path` in `lang`, carrying `keep` (the active category/tag filter)
 * through the switch so changing language never drops the reader's filter.
 *
 * Georgian is the default, so it is expressed as the *absence* of `lang` —
 * one canonical URL per page instead of two that serve identical bytes.
 */
export function langHref(
  path: string,
  lang: LangChoice,
  keep: Record<string, string | undefined> = {},
): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(keep)) if (v) qs.set(k, v);
  if (lang !== "ka") qs.set("lang", lang);
  const query = qs.toString();
  return query ? `${path}?${query}` : path;
}
