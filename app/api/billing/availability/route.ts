// /api/billing/availability — read-only probe so the /pricing page can
// render plan-availability badges before the user clicks Subscribe.
//
// Returns which plans have a checkout URL configured in env. Does NOT
// reveal the URL itself (that's only handed to the user inside a 302
// redirect from /api/billing/checkout, gated by their click).
//
// Shape:
//   { ok: true, plans: { pilot: 'live'|'unconfigured', team: ..., custom: 'sales' } }
//
// Idempotent, no auth, cacheable for 60s edge-side.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PlanId = 'pilot' | 'team' | 'custom';
type Availability = 'live' | 'unconfigured' | 'sales';

function availabilityFor(plan: PlanId): Availability {
  if (plan === 'custom') return 'sales';
  const polarKey = `POLAR_CHECKOUT_URL_${plan.toUpperCase()}`;
  const stripeKey = `STRIPE_CHECKOUT_URL_${plan.toUpperCase()}`;
  return process.env[polarKey] || process.env[stripeKey] ? 'live' : 'unconfigured';
}

export async function GET(): Promise<NextResponse> {
  const plans: Record<PlanId, Availability> = {
    pilot: availabilityFor('pilot'),
    team: availabilityFor('team'),
    custom: availabilityFor('custom'),
  };
  return NextResponse.json(
    { ok: true, plans },
    {
      headers: {
        // Allow brief CDN caching since env doesn't change per-request and
        // the pricing page polls on every render.
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
