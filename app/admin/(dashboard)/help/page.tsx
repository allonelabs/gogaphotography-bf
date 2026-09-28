import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { getServerTr } from "@/app/lib/i18n/server";

export const metadata: Metadata = { title: "Help" };
export const dynamic = "force-dynamic";

interface Guide {
  href: string;
  title: string;
  sub: string;
}

function getGuides(tr: (en: string, ka: string) => string): Guide[] {
  return [
    {
      href: "/admin/leads",
      title: tr("Manage leads", "ლიდების მართვა"),
      sub: tr(
        "Drag-and-drop kanban across 8 stages, autosave notes, link to bookings.",
        "გადათრევადი კანბანი 8 ეტაპზე, ჩანაწერების ავტომატური შენახვა, ჯავშნებთან დაკავშირება.",
      ),
    },
    {
      href: "/admin/bookings",
      title: tr("Bookings + deposits", "ჯავშნები + დეპოზიტები"),
      sub: tr(
        "Status filter, search, deposit link via TBC, contract + delivery shortcuts.",
        "სტატუსის ფილტრი, ძიება, დეპოზიტის ბმული TBC-ით, ხელშეკრულებისა და მიწოდების მალსახმობები.",
      ),
    },
    {
      href: "/admin/calendar?view=week",
      title: tr("Calendar", "კალენდარი"),
      sub: tr(
        "Month, week, and day views over scheduled shoots.",
        "თვის, კვირის და დღის ხედი დაგეგმილ გადაღებებზე.",
      ),
    },
    {
      href: "/admin/contracts",
      title: tr("Contracts", "ხელშეკრულებები"),
      sub: tr(
        "EN+KA body editor, sign-link copy, Resend email send, void.",
        "ინგლისურ+ქართული ტექსტის რედაქტორი, ხელმოწერის ბმულის კოპირება, Resend-ით გაგზავნა, გაუქმება.",
      ),
    },
    {
      href: "/admin/deliveries",
      title: tr("Client galleries", "კლიენტის გალერეები"),
      sub: tr(
        "Password-protected galleries with view counts, favorites, downloads.",
        "პაროლით დაცული გალერეები ნახვების რაოდენობით, რჩეულებით, ჩამოტვირთვებით.",
      ),
    },
    {
      href: "/admin/projects",
      title: tr("Portfolio projects", "პორტფოლიოს პროექტები"),
      sub: tr(
        "Drag-to-reorder, per-project gallery, set hero, captions + alt text.",
        "გადათრევით დალაგება, პროექტის გალერეა, მთავარი სურათის დაყენება, წარწერები + alt ტექსტი.",
      ),
    },
    {
      href: "/admin/studio",
      title: tr("Studio info", "სტუდიის ინფო"),
      sub: tr(
        "Contact, address, socials — feeds the public contact page + JSON-LD.",
        "კონტაქტი, მისამართი, სოც. ქსელები — კვებავს საჯარო საკონტაქტო გვერდსა და JSON-LD-ს.",
      ),
    },
    {
      href: "/admin/audit",
      title: tr("Audit log", "აუდიტის ჟურნალი"),
      sub: tr(
        "Every consequential action, who/what/when, filter by entity or kind.",
        "ყოველი მნიშვნელოვანი მოქმედება, ვინ/რა/როდის, ფილტრი ობიექტით ან ტიპით.",
      ),
    },
  ];
}

function getShortcuts(
  tr: (en: string, ka: string) => string,
): Array<[string, string]> {
  return [
    [
      "⌘ K",
      tr(
        "Command palette / global search",
        "ბრძანებების პალიტრა / გლობალური ძებნა",
      ),
    ],
    ["⌘ /", tr("Open operator AI chat", "ოპერატორის AI ჩატის გახსნა")],
    ["⌘ \\", tr("Toggle sidebar", "გვერდითი პანელის ჩართვა/გამორთვა")],
    [
      "Esc",
      tr(
        "Close any open panel or modal",
        "ნებისმიერი ღია პანელის ან მოდალის დახურვა",
      ),
    ],
  ];
}

export default async function HelpPage() {
  const tr = await getServerTr();
  const GUIDES = getGuides(tr);
  const SHORTCUTS = getShortcuts(tr);
  return (
    <AppShell
      breadcrumb={[{ label: tr("Help", "დახმარება") }]}
      chatScope={{ level: "org" }}
      chatScopeLabel="help"
    >
      <div className="mx-auto max-w-[760px] px-4 pb-24 pt-14 sm:px-10">
        <header>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-[var(--ink-500)]">
            {tr("Operator handbook", "ოპერატორის სახელმძღვანელო")}
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
            {tr("Running the studio from here", "სტუდიის მართვა აქედან")}
          </h1>
          <p className="mt-2.5 max-w-[52ch] text-[13.5px] leading-[1.55] text-[var(--ink-500)]">
            {tr(
              "Eight verticals, one workflow: lead → booking → contract → shoot → delivery. Everything you change here propagates to",
              "რვა მიმართულება, ერთი პროცესი: ლიდი → ჯავშანი → ხელშეკრულება → გადაღება → მიწოდება. ყველაფერი, რასაც აქ ცვლი, ვრცელდება",
            )}{" "}
            <a
              className="underline underline-offset-2"
              href="https://gogaphotography-next.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              {tr("the public site", "საჯარო საიტზე")}
            </a>{" "}
            {tr("within a minute.", "ერთ წუთში.")}
          </p>
        </header>

        <section className="mt-12">
          <h2 className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-[var(--ink-500)]">
            {tr("Guides", "გზამკვლევები")}
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
            {tr("Shortcuts", "მალსახმობები")}
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
            {tr("Reach out", "დაგვიკავშირდი")}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <a
              href="mailto:team@allonelabs.com?subject=GOGA%20Photography%20admin%20support"
              className="block rounded-xl bg-white p-4 ring-1 ring-black/5 hover:ring-black/10"
            >
              <p className="text-[13px] font-medium text-[var(--ink-900)]">
                {tr("Email Allone Labs", "მოწერე Allone Labs-ს")}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--ink-500)]">
                {tr(
                  "For bug reports, feature requests, or studio-flow questions.",
                  "შეცდომების შესახებ, ფუნქციის მოთხოვნით ან სტუდიის პროცესთან დაკავშირებული კითხვებისთვის.",
                )}
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
                {tr("Source on GitHub", "წყარო GitHub-ზე")}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--ink-500)]">
                {tr(
                  "Admin codebase. Open an issue or PR.",
                  "ადმინის კოდი. გახსენი issue ან PR.",
                )}
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
