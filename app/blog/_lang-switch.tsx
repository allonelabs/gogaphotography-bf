// app/blog/_lang-switch.tsx
import Link from "next/link";
import {
  LANGS,
  LANG_LABEL,
  langHref,
  type LangChoice,
} from "@/app/lib/goga/blog-lang";

/**
 * Three-way KA/EN/RU switch for the public blog.
 *
 * Shows the two-letter code rather than the endonym so the row never wraps
 * beside the title on a phone; the endonym stays as the accessible name.
 */
export function BlogLangSwitch({
  path,
  current,
  keep,
}: {
  /** Page to stay on, e.g. `/blog` or `/blog/some-slug`. */
  path: string;
  current: LangChoice;
  /** Filters to carry across the switch, e.g. the active category or tag. */
  keep?: Record<string, string | undefined>;
}) {
  return (
    <nav
      aria-label="Language"
      className="flex items-center gap-0.5 rounded-full border p-0.5 text-sm"
    >
      {LANGS.map((l) => {
        const active = l === current;
        return (
          <Link
            key={l}
            href={langHref(path, l, keep)}
            hrefLang={l}
            lang={l}
            aria-label={LANG_LABEL[l]}
            title={LANG_LABEL[l]}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "rounded-full bg-neutral-900 px-3 py-1 font-medium uppercase text-white"
                : "rounded-full px-3 py-1 uppercase text-neutral-600 transition hover:bg-neutral-100"
            }
          >
            {l}
          </Link>
        );
      })}
    </nav>
  );
}
