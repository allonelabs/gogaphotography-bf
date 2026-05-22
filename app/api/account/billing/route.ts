// /api/account/billing — read-only view of the operator's account-level
// billing state for the /app/billing surface. Wraps readAccountBilling()
// (server-only file store at out/_account/billing.json) so the client
// renders real plan + invoice ledger instead of hardcoded fixtures.
//
// Auth-gated: signed-out callers get 401, no leak of the (single-tenant for
// now) billing file. Single-tenant MVP — once multi-org lands, the store
// will key by orgId and this endpoint will pass session.user.id through.

import { NextResponse } from 'next/server';

import { auth } from '../../../../auth';
import { readAccountBilling } from '../../../lib/account-billing-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const billing = await readAccountBilling();
  return NextResponse.json({
    ok: true,
    billing: {
      plan: billing.plan,
      planChangedAt: billing.planChangedAt,
      paymentMethodLast4: billing.paymentMethodLast4 ?? null,
      paymentMethodBrand: billing.paymentMethodBrand ?? null,
      invoices: billing.invoices,
    },
  });
}
