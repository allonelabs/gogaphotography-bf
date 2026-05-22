// Server-side locale helpers for Next.js Server Components.
// Reads the `tp.locale` cookie (set on toggle by `useLocale`) and returns
// the active locale + a bound t() helper that translates against the dict.

import { cookies } from "next/headers";
import { translate, type Locale, type TranslationKey } from "./dict";

const COOKIE_NAME = "tp.locale";

export async function getServerLocale(): Promise<Locale> {
  try {
    const c = await cookies();
    const v = c.get(COOKIE_NAME)?.value;
    if (v === "en" || v === "ka") return v;
  } catch {
    /* cookies() throws outside request scope — fall through */
  }
  return "en";
}

/** Server-side t() bound to the request locale. */
export async function getServerT(): Promise<
  (key: TranslationKey, vars?: Record<string, string | number>) => string
> {
  const locale = await getServerLocale();
  return (key, vars) => translate(locale, key, vars);
}
