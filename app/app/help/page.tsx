import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { ChromeBanner } from "@/app/components/app/ChromeBanner";
import { getServerT } from "@/app/lib/i18n/server";

export const metadata: Metadata = { title: "Help" };

interface Guide {
  href: string;
  titleKey:
    | "help.guide.import.title"
    | "help.guide.chat.title"
    | "help.guide.whatsapp.title"
    | "help.guide.calendar.title"
    | "help.guide.automations.title"
    | "help.guide.team.title";
  subKey:
    | "help.guide.import.sub"
    | "help.guide.chat.sub"
    | "help.guide.whatsapp.sub"
    | "help.guide.calendar.sub"
    | "help.guide.automations.sub"
    | "help.guide.team.sub";
}

const GUIDES: Guide[] = [
  {
    href: "/app/hotels/import",
    titleKey: "help.guide.import.title",
    subKey: "help.guide.import.sub",
  },
  {
    href: "/app",
    titleKey: "help.guide.chat.title",
    subKey: "help.guide.chat.sub",
  },
  {
    href: "/app/calendar",
    titleKey: "help.guide.calendar.title",
    subKey: "help.guide.calendar.sub",
  },
  {
    href: "/app/automations",
    titleKey: "help.guide.automations.title",
    subKey: "help.guide.automations.sub",
  },
  {
    href: "/app/integrations/whatsapp",
    titleKey: "help.guide.whatsapp.title",
    subKey: "help.guide.whatsapp.sub",
  },
  {
    href: "/app/organization",
    titleKey: "help.guide.team.title",
    subKey: "help.guide.team.sub",
  },
];

const SHORTCUTS: Array<
  [
    string,
    (
      | "help.kbd.palette"
      | "help.kbd.chat"
      | "help.kbd.sidebar"
      | "help.kbd.topbar"
      | "help.kbd.help"
      | "help.kbd.close"
    ),
  ]
> = [
  ["⌘ K", "help.kbd.palette"],
  ["⌘ /", "help.kbd.chat"],
  ["⌘ \\", "help.kbd.sidebar"],
  ["⌘ .", "help.kbd.topbar"],
  ["?", "help.kbd.help"],
  ["Esc", "help.kbd.close"],
];

export default async function Page() {
  const t = await getServerT();

  const REACH: Array<{
    href: string;
    titleKey:
      | "help.reach.email.title"
      | "help.reach.status.title"
      | "help.reach.changelog.title";
    subKey:
      | "help.reach.email.sub"
      | "help.reach.status.sub"
      | "help.reach.changelog.sub";
    cta: string;
  }> = [
    {
      href: "mailto:team@allonelabs.com?subject=GOGA%20Photography%20admin%20support",
      titleKey: "help.reach.email.title",
      subKey: "help.reach.email.sub",
      cta: "team@allonelabs.com",
    },
    {
      href: "/api/health",
      titleKey: "help.reach.status.title",
      subKey: "help.reach.status.sub",
      cta: t("help.reach.status.cta"),
    },
    {
      href: "/app/changelog",
      titleKey: "help.reach.changelog.title",
      subKey: "help.reach.changelog.sub",
      cta: t("help.reach.changelog.cta"),
    },
  ];

  return (
    <AppShell
      breadcrumb={[{ label: t("nav.help") }]}
      chatScope={{ level: "org" }}
      chatScopeLabel="help"
    >
      <ChromeBanner />
      <div className="mx-auto max-w-[760px] px-4 pb-24 pt-14 sm:px-10">
        {/* Hero */}
        <header>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-[var(--ink-500)]">
            {t("help.eyebrow")}
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
            {t("help.hero.title")}
          </h1>
          <p className="mt-2.5 max-w-[52ch] text-[13.5px] leading-[1.55] text-[var(--ink-500)]">
            {t("help.hero.sub")}
          </p>
        </header>

        {/* Chat hero strip */}
        <div className="mt-9 flex items-center gap-4 border-y border-[var(--allonce-line-soft)] py-4">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink-900)] text-white"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="text-[13.5px] text-[var(--ink-900)]"
              style={{ fontWeight: 500 }}
            >
              {t("help.chat_strip.title")}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--ink-500)]">
              {t("help.chat_strip.sub")}
            </p>
          </div>
          <kbd className="rounded-md bg-[var(--bg-surface-alt)] px-2 py-1 font-mono text-[11px] text-[var(--ink-900)]">
            ⌘ /
          </kbd>
        </div>

        {/* Guides */}
        <section className="mt-14">
          <h2 className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-[var(--ink-500)]">
            {t("help.guides.heading")}
          </h2>
          <ul className="mt-3 border-t border-[var(--allonce-line-soft)]">
            {GUIDES.map((g) => (
              <li key={g.href}>
                <Link
                  href={g.href}
                  className="group flex items-center gap-5 border-b border-[var(--allonce-line-soft)] py-4 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[13.5px] text-[var(--ink-900)] transition-colors group-hover:text-[var(--ao-accent)]"
                      style={{ fontWeight: 500 }}
                    >
                      {t(g.titleKey)}
                    </p>
                    <p className="mt-1 text-[12px] leading-[1.5] text-[var(--ink-500)]">
                      {t(g.subKey)}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="text-[var(--ink-300)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--ink-700)]"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Keyboard + Reach */}
        <section className="mt-14 grid gap-12 sm:grid-cols-2">
          <div>
            <h2 className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-[var(--ink-500)]">
              {t("help.keyboard.heading")}
            </h2>
            <ul className="mt-3 border-t border-[var(--allonce-line-soft)]">
              {SHORTCUTS.map(([k, key]) => (
                <li
                  key={k}
                  className="flex items-center justify-between border-b border-[var(--allonce-line-soft)] py-2.5"
                >
                  <span className="text-[12.5px] text-[var(--ink-700)]">
                    {t(key)}
                  </span>
                  <kbd className="rounded bg-[var(--bg-surface-alt)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--ink-900)]">
                    {k}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-[var(--ink-500)]">
              {t("help.reach.heading")}
            </h2>
            <ul className="mt-3 border-t border-[var(--allonce-line-soft)]">
              {REACH.map((r) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    className="group flex items-center justify-between gap-4 border-b border-[var(--allonce-line-soft)] py-3 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[13px] text-[var(--ink-900)] transition-colors group-hover:text-[var(--ao-accent)]"
                        style={{ fontWeight: 500 }}
                      >
                        {t(r.titleKey)}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-[var(--ink-500)]">
                        {t(r.subKey)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11.5px] text-[var(--ink-500)] transition-colors group-hover:text-[var(--ink-900)]">
                      {r.cta}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
