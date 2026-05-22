'use client';

// /pricing — public marketing page; mission-critical entry to the real
// Stripe/Polar charge. Sits inside the (landing) route group so it inherits
// the marketing-CSS layout. Subscribe buttons POST to /api/billing/checkout
// which either 200s with a redirect URL (vendor configured) or 503s with a
// structured "checkout URL not configured" so the page can show an honest
// banner instead of pretending payment works.

import { useEffect, useState } from 'react';

type PlanId = 'pilot' | 'team' | 'custom';

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  cta: string;
}

const PLANS: ReadonlyArray<Plan> = [
  {
    id: 'pilot',
    name: 'Pilot',
    price: '$99',
    cadence: '/month',
    blurb: 'One business. Everything to run it.',
    features: [
      '1 business spawn',
      '10 seats',
      '36 tools · 65 bridges',
      'Email support',
    ],
    cta: 'Subscribe',
  },
  {
    id: 'team',
    name: 'Team',
    price: '$499',
    cadence: '/month',
    blurb: 'Up to 5 companies, side by side.',
    features: [
      '5 business spawns',
      'Unlimited seats',
      'Tune-mode auto-apply',
      'Mechanism-mode (PR-gated)',
      'Email + Slack support',
    ],
    cta: 'Subscribe',
  },
  {
    id: 'custom',
    name: 'Custom',
    price: 'Let’s talk',
    cadence: '',
    blurb: 'Multi-tenant, SSO, dedicated engineer.',
    features: [
      'Unlimited spawns',
      'SSO (SAML / OIDC)',
      'SLA · 99.95 %',
      'Dedicated engineer',
      'On-prem option',
    ],
    cta: 'Contact sales',
  },
];

interface CheckoutResponse {
  ok?: boolean;
  mode?: 'redirect' | 'sales' | 'unconfigured';
  url?: string;
  contact?: string;
  error?: string;
  detail?: string;
}

type Availability = 'live' | 'unconfigured' | 'sales';

export default function PricingPage() {
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [banner, setBanner] = useState<{ kind: 'err' | 'info'; text: string } | null>(null);
  const [availability, setAvailability] = useState<Record<PlanId, Availability> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/billing/availability')
      .then((r) => r.json() as Promise<{ ok: boolean; plans?: Record<PlanId, Availability> }>)
      .then((b) => {
        if (cancelled || !b.ok || !b.plans) return;
        setAvailability(b.plans);
      })
      .catch(() => {
        // Network or non-JSON — leave availability null; fall back to
        // post-click banner UX (still honest, just not pre-flagged).
      });
    return () => { cancelled = true; };
  }, []);

  async function subscribe(plan: PlanId) {
    setBusy(plan);
    setBanner(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const body = (await res.json()) as CheckoutResponse;
      if (body.mode === 'redirect' && body.url) {
        window.location.assign(body.url);
        return;
      }
      if (body.mode === 'sales' && body.contact) {
        window.location.assign(body.contact);
        return;
      }
      if (body.mode === 'unconfigured') {
        setBanner({
          kind: 'info',
          text:
            'Checkout is being wired up. We’ve recorded your interest — drop us a line at team@allonelabs.com and we’ll set you up directly.',
        });
        return;
      }
      setBanner({ kind: 'err', text: body.error ?? `Unexpected response (${res.status})` });
    } catch (e) {
      setBanner({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-black">
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-black/60">
            Pricing
          </p>
          <h1 className="mt-3 font-serif text-5xl font-medium tracking-tight">
            One window. <span style={{ color: '#0047FF' }}>The whole company.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-black/70">
            Pick a tier; we handle the rest. Switch any time. Contact us if you
            outgrow Team — Custom scales without a step function.
          </p>
        </header>

        {banner ? (
          <div
            className={
              banner.kind === 'err'
                ? 'mx-auto mt-10 max-w-2xl rounded-md border border-red-300 bg-red-50 p-4 text-[13px] text-red-900'
                : 'mx-auto mt-10 max-w-2xl rounded-md border border-blue-200 bg-blue-50 p-4 text-[13px] text-blue-900'
            }
            role="status"
          >
            {banner.text}
          </div>
        ) : null}

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => {
            const isBusy = busy === p.id;
            const isPrimary = p.id === 'team';
            const planAvail = availability?.[p.id] ?? null;
            const isUnconfigured = planAvail === 'unconfigured';
            return (
              <div
                key={p.id}
                className="relative flex flex-col rounded-2xl border border-black/10 bg-white p-7 shadow-sm transition hover:shadow-md"
                style={
                  isPrimary
                    ? { boxShadow: '0 0 0 2px #0047FF' }
                    : undefined
                }
              >
                {isPrimary ? (
                  <span
                    className="absolute -top-2.5 left-7 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white"
                    style={{ backgroundColor: '#0047FF' }}
                  >
                    Most popular
                  </span>
                ) : null}
                {isUnconfigured ? (
                  <span
                    className="absolute -top-2.5 right-7 rounded-full bg-amber-50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-700 ring-1 ring-amber-200"
                    title="Checkout URL pending operator setup"
                  >
                    Coming soon
                  </span>
                ) : null}
                <h2 className="font-serif text-2xl font-medium">{p.name}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-serif text-4xl">{p.price}</span>
                  {p.cadence ? (
                    <span className="text-[13px] text-black/60">{p.cadence}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-black/70">
                  {p.blurb}
                </p>
                <ul className="mt-5 space-y-2">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[13.5px] text-black/80"
                    >
                      <span
                        className="mt-[7px] h-1 w-1 rounded-full"
                        style={{ backgroundColor: '#0047FF' }}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => subscribe(p.id)}
                  disabled={isBusy}
                  className={
                    isPrimary
                      ? 'mt-7 block h-11 w-full rounded-full bg-black text-[14px] font-medium text-white transition hover:translate-y-[-1px] disabled:opacity-50'
                      : 'mt-7 block h-11 w-full rounded-full border border-black/15 bg-white text-[14px] font-medium text-black transition hover:bg-black hover:text-white disabled:opacity-50'
                  }
                >
                  {isBusy ? 'Working…' : p.cta}
                </button>
              </div>
            );
          })}
        </section>

        <p className="mx-auto mt-10 max-w-2xl text-center text-[12px] leading-relaxed text-black/50">
          Plan switch is recorded immediately — even if checkout isn’t finalized.
          Custom is sales-led; Subscribe redirects to the live checkout once
          configured. Webhook receivers append the real charge to your{' '}
          <a href="/app/billing" className="underline">
            account billing ledger
          </a>
          .
        </p>
      </div>
    </main>
  );
}
