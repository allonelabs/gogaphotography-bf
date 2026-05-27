import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/app/components/app/AppShell";
import { SignOutButton } from "./_signout";

export const metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  const email = session?.user?.email ?? "—";
  const name = session?.user?.name ?? "—";

  return (
    <AppShell
      breadcrumb={[{ label: "Account" }]}
      chatScope={{ level: "org" }}
      chatScopeLabel="account"
    >
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14 space-y-6">
        <header>
          <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
            Account
          </h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Studio operator
          </p>
        </header>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <dl className="space-y-3 text-[13px]">
            <Row label="Signed in as" value={name} />
            <Row label="Email" value={email} />
            <Row label="Studio" value="GOGA Photography" />
            <Row
              label="Admin URL"
              value={
                <a
                  href="https://gogaphotography-bf.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--ao-accent)] hover:underline"
                >
                  gogaphotography-bf.vercel.app
                </a>
              }
            />
            <Row
              label="Public site"
              value={
                <a
                  href="https://gogaphotography-next.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--ao-accent)] hover:underline"
                >
                  gogaphotography-next.vercel.app
                </a>
              }
            />
          </dl>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Quick links
          </h2>
          <ul className="grid gap-2 text-[13px] sm:grid-cols-2">
            <li>
              <Link
                href="/app/studio"
                className="block rounded-lg bg-slate-50 px-3 py-2 text-[var(--ink-700)] hover:bg-slate-100"
              >
                Studio info → contact, address, socials
              </Link>
            </li>
            <li>
              <Link
                href="/app/hero"
                className="block rounded-lg bg-slate-50 px-3 py-2 text-[var(--ink-700)] hover:bg-slate-100"
              >
                Homepage hero → headline + image
              </Link>
            </li>
            <li>
              <Link
                href="/app/projects"
                className="block rounded-lg bg-slate-50 px-3 py-2 text-[var(--ink-700)] hover:bg-slate-100"
              >
                Projects → portfolio order + galleries
              </Link>
            </li>
            <li>
              <Link
                href="/app/audit"
                className="block rounded-lg bg-slate-50 px-3 py-2 text-[var(--ink-700)] hover:bg-slate-100"
              >
                Audit log → recent admin events
              </Link>
            </li>
          </ul>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Session
          </h2>
          <SignOutButton />
          <p className="mt-2 text-[11px] text-[var(--ink-400)]">
            Signs you out and returns to the GOGA login screen.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-400)]">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right text-[var(--ink-900)]">
        {value}
      </dd>
    </div>
  );
}
