import type { Metadata } from "next";
import { AppShell } from "@/app/components/app/AppShell";
import { ChromeBanner } from "@/app/components/app/ChromeBanner";
import { getServerT } from "@/app/lib/i18n/server";
import type { TranslationKey } from "@/app/lib/i18n/dict";

export const metadata: Metadata = { title: "Changelog" };

interface Entry {
  date: string;
  version: string;
  categoryKey:
    | "changelog.cat.feature"
    | "changelog.cat.infra"
    | "changelog.cat.fix";
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}

const ENTRIES: Entry[] = [
  {
    date: "2026-05-22",
    version: "v0.10",
    categoryKey: "changelog.cat.feature",
    titleKey: "changelog.e.10.title",
    bodyKey: "changelog.e.10.body",
  },
  {
    date: "2026-05-22",
    version: "v0.9",
    categoryKey: "changelog.cat.feature",
    titleKey: "changelog.e.9.title",
    bodyKey: "changelog.e.9.body",
  },
  {
    date: "2026-05-22",
    version: "v0.8",
    categoryKey: "changelog.cat.feature",
    titleKey: "changelog.e.8.title",
    bodyKey: "changelog.e.8.body",
  },
  {
    date: "2026-05-22",
    version: "v0.7",
    categoryKey: "changelog.cat.feature",
    titleKey: "changelog.e.7.title",
    bodyKey: "changelog.e.7.body",
  },
  {
    date: "2026-05-22",
    version: "v0.6",
    categoryKey: "changelog.cat.infra",
    titleKey: "changelog.e.6.title",
    bodyKey: "changelog.e.6.body",
  },
  {
    date: "2026-05-22",
    version: "v0.5",
    categoryKey: "changelog.cat.feature",
    titleKey: "changelog.e.5.title",
    bodyKey: "changelog.e.5.body",
  },
  {
    date: "2026-05-22",
    version: "v0.4",
    categoryKey: "changelog.cat.feature",
    titleKey: "changelog.e.4.title",
    bodyKey: "changelog.e.4.body",
  },
  {
    date: "2026-05-22",
    version: "v0.3",
    categoryKey: "changelog.cat.feature",
    titleKey: "changelog.e.3.title",
    bodyKey: "changelog.e.3.body",
  },
  {
    date: "2026-05-22",
    version: "v0.2",
    categoryKey: "changelog.cat.feature",
    titleKey: "changelog.e.2.title",
    bodyKey: "changelog.e.2.body",
  },
  {
    date: "2026-05-21",
    version: "v0.1",
    categoryKey: "changelog.cat.feature",
    titleKey: "changelog.e.1.title",
    bodyKey: "changelog.e.1.body",
  },
];

function categoryTone(key: string): string {
  switch (key) {
    case "changelog.cat.feature":
      return "bg-emerald-100/60 text-emerald-900 border-emerald-200/60";
    case "changelog.cat.infra":
      return "bg-sky-100/60 text-sky-900 border-sky-200/60";
    case "changelog.cat.fix":
      return "bg-amber-100/60 text-amber-900 border-amber-200/60";
    default:
      return "bg-slate-100/60 text-slate-900 border-slate-200/60";
  }
}

export default async function Page() {
  const t = await getServerT();
  return (
    <AppShell
      breadcrumb={[
        { label: t("nav.help"), href: "/app/help" },
        { label: t("changelog.title") },
      ]}
      chatScope={{ level: "org" }}
      chatScopeLabel="changelog"
    >
      <ChromeBanner />
      <div className="mx-auto max-w-[820px] px-4 pb-24 pt-14 sm:px-10">
        <header>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-[var(--ink-500)]">
            {t("changelog.eyebrow")}
          </p>
          <h1
            className="mt-3 text-[var(--ink-900)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "26px",
              lineHeight: 1.15,
              letterSpacing: "-0.012em",
              fontWeight: 500,
            }}
          >
            {t("changelog.title")}
          </h1>
          <p className="mt-2.5 max-w-[60ch] text-[13.5px] leading-[1.55] text-[var(--ink-500)]">
            {t("changelog.subtitle")}
          </p>
        </header>

        <ul className="mt-10 space-y-8">
          {ENTRIES.map((e) => (
            <li
              key={e.version}
              className="border-l-2 border-[var(--allonce-line)] pl-5"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${categoryTone(e.categoryKey)}`}
                >
                  {t(e.categoryKey)}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-[var(--ink-500)]">
                  {e.version} · {e.date}
                </span>
              </div>
              <h3
                className="mt-2 text-[var(--ink-900)]"
                style={{ fontWeight: 500, fontSize: "15.5px" }}
              >
                {t(e.titleKey)}
              </h3>
              <p className="mt-1.5 text-[13px] leading-[1.6] text-[var(--ink-700)]">
                {t(e.bodyKey)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
