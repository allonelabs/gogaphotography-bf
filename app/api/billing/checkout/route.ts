// /api/billing/checkout — entry point from /pricing → vendor checkout.
//
// Vendor-agnostic shim. Reads POLAR_CHECKOUT_URL_<PLAN> env (or
// STRIPE_CHECKOUT_URL_<PLAN> if A wins instead of B in DECISIONS.md) and
// 302-redirects. When env is unset returns 503 with a structured body so the
// caller can show "Stripe path pending — see _loop/DECISIONS.md" honestly,
// not a phony "checkout queued" toast.
//
// Mission goal: when operator picks B (Polar) and pastes the Polar checkout
// URLs into env, this endpoint becomes the single bridge to the real charge.

import { NextResponse } from 'next/server';

import { setPlan, type PlanId } from '../../../lib/account-billing-store';

export const runtime = 'nodejs';

const VALID_PLANS: ReadonlyArray<PlanId> = ['pilot', 'team', 'custom'];

function checkoutUrlForPlan(plan: PlanId): string | null {
  // Convention: env keys are uppercased + plan-suffixed. Both vendors
  // produce a hosted-checkout URL that Stripe-shape; receiver webhook is at
  // /api/billing/webhook (not yet wired in this iteration).
  const polarKey = `POLAR_CHECKOUT_URL_${plan.toUpperCase()}`;
  const stripeKey = `STRIPE_CHECKOUT_URL_${plan.toUpperCase()}`;
  return process.env[polarKey] ?? process.env[stripeKey] ?? null;
}

interface PostBody {
  plan?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  let body: PostBody;
  try { body = (await req.json()) as PostBody; }
  catch { return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 }); }

  const planRaw = body.plan;
  if (typeof planRaw !== 'string' || !VALID_PLANS.includes(planRaw as PlanId)) {
    return NextResponse.json(
      { ok: false, error: `plan must be one of: ${VALID_PLANS.join(' | ')}` },
      { status: 400 },
    );
  }
  const plan = planRaw as PlanId;

  // 'custom' is sales-led — never auto-checkout. Persist intent + return a
  // mailto: link so the prospect can reach Sales without us pretending Stripe
  // exists for this tier.
  if (plan === 'custom') {
    await setPlan(plan);
    return NextResponse.json({
      ok: true,
      mode: 'sales',
      contact: 'mailto:team@allonelabs.com?subject=AllOnce%20Custom%20plan%20interest',
    });
  }

  const url = checkoutUrlForPlan(plan);
  if (!url) {
    return NextResponse.json(
      {
        ok: false,
        mode: 'unconfigured',
        error: 'checkout URL not configured',
        detail:
          `Set ${`POLAR_CHECKOUT_URL_${plan.toUpperCase()}`} (or its STRIPE_ equivalent) in the deployment env. ` +
          'Operator decision tracked in _loop/DECISIONS.md (Stripe path A/B/C).',
      },
      { status: 503 },
    );
  }

  // Persist plan-switch intent before redirect so the operator surface
  // reflects it even if the prospect bounces from the hosted checkout.
  await setPlan(plan);
  return NextResponse.json({ ok: true, mode: 'redirect', url });
}
