import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";

export const metadata: Metadata = { title: "Help" };
export const dynamic = "force-dynamic";

interface Guide {
  href: string;
  title: string;
  sub: string;
}

const GUIDES: Guide[] = [
  {
    href: "/app/leads",
    title: "Manage leads",
    sub: "Drag-and-drop kanban across 8 stages, autosave notes, link to bookings.",
  },
  {
    href: "/app/bookings",
    title: "Bookings + deposits",
    sub: "Status filter, search, deposit link via TBC, contract + delivery shortcuts.",
  },
  {
    href: "/app/calendar?view=week",
    title: "Calendar",
    sub: "Month, week, and day views over scheduled shoots.",
  },
  {
    href: "/app/contracts",
    title: "Contracts",
    sub: "EN+KA body editor, sign-link copy, Resend email send, void.",
  },
  {
    href: "/app/deliveries",
    title: "Client galleries",
    sub: "Password-protected galleries with view counts, favorites, downloads.",
  },
  {
    href: "/app/projects",
    title: "Portfolio projects",
    sub: "Drag-to-reorder, per-project gallery, set hero, captions + alt text.",
  },
  {
    href: "/app/studio",
    title: "Studio info",
    sub: "Contact, address, socials — feeds the public contact page + JSON-LD.",
  },
  {
    href: "/app/audit",
    title: "Audit log",
    sub: "Every consequential action, who/what/when, filter by entity or kind.",
  },
];

const SHORTCUTS: Array<[string, string]> = [
  ["⌘ K", "Command palette / global search"],
  ["⌘ /", "Open operator AI chat"],
  ["⌘ \\", "Toggle sidebar"],
  ["Esc", "Close any open panel or modal"],
];

export default async function HelpPage() {
  return (
    <AppShell
      breadcrumb={[{ label: "Help" }]}
      chatScope={{ level: "org" }}
      chatScopeLabel="help"
    >
      <div className="mx-auto max-w-[760px] px-4 pb-24 pt-14 sm:px-10">
        <header>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-[var(--ink-500)]">
            Operator handbook
          </p>
          <h1
            className="mt-3 text-[var(--ink-900)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              lineHeight: 1.15,
              letterSpacing: "-0.012em",
              fontWeight: 500,
            }}
          >
            Running the studio from here
          </h1>
          <p className="mt-2.5 max-w-[52ch] text-[13.5px] leading-[1.55] text-[var(--ink-500)]">
            Eight verticals, one workflow: lead → booking → contract → shoot →
            delivery. Everything you change here propagates to{" "}
            <a
              className="underline underline-offset-2"
              href="https://gogaphotography-next.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              the public site
            </a>{" "}
            within a minute.
          </p>
        </header>

        <section className="mt-12">
          <h2 className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-[var(--ink-500)]">
            Guides
          </h2>
          <ul className="mt-3 border-t border-black/5">
            {GUIDES.map((g) => (
              <li key={g.href}>
                <Link
                  href={g.href}
                  className="group flex items-baseline gap-5 border-b border-black/5 py-4 transition hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-[var(--ink-900)] transition group-hover:text-black">
                      {g.title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-[1.5] text-[var(--ink-500)]">
                      {g.sub}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="text-[var(--ink-400)] transition group-hover:translate-x-0.5 group-hover:text-[var(--ink-900)]"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-[var(--ink-500)]">
            Shortcuts
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-y-2 gap-x-6 border-t border-black/5 pt-3">
            {SHORTCUTS.map(([k, label]) => (
              <li
                key={k}
                className="flex items-center justify-between gap-2 text-[13px]"
              >
                <span className="text-[var(--ink-700)]">{label}</span>
                <kbd className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-[var(--ink-900)]">
                  {k}
                </kbd>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-[var(--ink-500)]">
            Reach out
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <a
              href="mailto:team@allonelabs.com?subject=GOGA%20Photography%20admin%20support"
              className="block rounded-xl bg-white p-4 ring-1 ring-black/5 hover:ring-black/10"
            >
              <p className="text-[13px] font-medium text-[var(--ink-900)]">
                Email Allone Labs
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--ink-500)]">
                For bug reports, feature requests, or studio-flow questions.
              </p>
              <p className="mt-1 font-mono text-[12px] text-[var(--ao-accent)]">
                team@allonelabs.com
              </p>
            </a>
            <a
              href="https://github.com/allonelabs/gogaphotography-bf"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-white p-4 ring-1 ring-black/5 hover:ring-black/10"
            >
              <p className="text-[13px] font-medium text-[var(--ink-900)]">
                Source on GitHub
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--ink-500)]">
                Admin codebase. Open an issue or PR.
              </p>
              <p className="mt-1 font-mono text-[12px] text-[var(--ao-accent)]">
                allonelabs/gogaphotography-bf
              </p>
            </a>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
