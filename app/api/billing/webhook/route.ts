// /api/billing/webhook — receives Stripe-shape vendor events, appends to
// the account billing ledger.
//
// Vendor-agnostic: Stripe and Polar both ship Stripe-shape webhooks per
// ADR-037, signed via HMAC-SHA256 over `${t}.${rawBody}` with the secret
// pasted into BILLING_WEBHOOK_SECRET. We accept either header name.
//
// Closes the chain from chunk 15:
//   /pricing → POST /api/billing/checkout → vendor hosted checkout →
//   vendor webhook to HERE → appendInvoice() → /app/billing reflects the
//   real charge.
//
// Mission-critical: the first 200-OK from this endpoint with status='paid'
// is the moment AllOnce takes its first real Stripe charge.

import { NextResponse } from 'next/server';

import { verifyStripeSignature } from '@bf/payment-forge/webhooks/verify-signature';

import {
  appendInvoice,
  type AccountInvoice,
} from '../../../lib/account-billing-store';

export const runtime = 'nodejs';

// Stripe-shape envelope. We narrow to just the fields we read; the rest of
// the event is opaque.
interface VendorEvent {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id?: string;
      amount_total?: number;          // checkout.session.completed
      amount?: number;                 // charge.refunded
      currency?: string;
      payment_intent?: string;
    };
  };
}

function eventToInvoice(
  event: VendorEvent,
  source: AccountInvoice['source'],
): AccountInvoice | null {
  const obj = event.data?.object ?? {};
  const id = obj.id ?? event.id ?? `${source}-${Date.now()}`;
  const externalId = obj.payment_intent ?? obj.id;
  const currency = (obj.currency ?? 'usd').toUpperCase();

  switch (event.type) {
    case 'checkout.session.completed': {
      const cents = obj.amount_total;
      if (typeof cents !== 'number' || cents < 0) return null;
      return {
        id,
        date: new Date().toISOString(),
        amountCents: cents,
        currency,
        status: 'paid',
        source,
        externalId,
      };
    }
    case 'invoice.payment_succeeded':
    case 'payment_intent.succeeded': {
      const cents = obj.amount_total ?? obj.amount;
      if (typeof cents !== 'number' || cents < 0) return null;
      return {
        id,
        date: new Date().toISOString(),
        amountCents: cents,
        currency,
        status: 'paid',
        source,
        externalId,
      };
    }
    case 'invoice.payment_failed':
    case 'payment_intent.payment_failed': {
      return {
        id,
        date: new Date().toISOString(),
        amountCents: 0,
        currency,
        status: 'failed',
        source,
        externalId,
      };
    }
    case 'charge.refunded': {
      const cents = obj.amount;
      if (typeof cents !== 'number' || cents < 0) return null;
      return {
        id,
        date: new Date().toISOString(),
        amountCents: cents,
        currency,
        status: 'refunded',
        source,
        externalId,
      };
    }
    default:
      return null;
  }
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env['BILLING_WEBHOOK_SECRET'];
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error: 'BILLING_WEBHOOK_SECRET not configured',
        detail: 'Paste vendor signing secret in deployment env. See _loop/DECISIONS.md (Stripe path A/B).',
      },
      { status: 503 },
    );
  }

  // Vendor lookup: Stripe sends `Stripe-Signature`, Polar sends
  // `polar-signature` (lowercase). Both are Stripe-shape so the same
  // verifier handles them.
  const header =
    req.headers.get('stripe-signature') ??
    req.headers.get('polar-signature') ??
    null;
  const source: AccountInvoice['source'] = req.headers.get('polar-signature') ? 'polar' : 'stripe';

  const rawBody = await req.text();
  const verified = verifyStripeSignature(rawBody, header, secret);
  if (!verified.ok) {
    // Mirror Stripe's 401 + reason code; never reveal whether the secret
    // matched (only signature shape) — that would leak about the env.
    return NextResponse.json({ ok: false, error: verified.reason }, { status: 401 });
  }

  let event: VendorEvent;
  try { event = JSON.parse(rawBody) as VendorEvent; }
  catch { return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 }); }

  const invoice = eventToInvoice(event, source);
  if (!invoice) {
    // Event type we don't track (e.g. customer.subscription.updated). 200
    // so the vendor doesn't retry; we just don't append.
    return NextResponse.json({ ok: true, ignored: event.type ?? 'unknown' });
  }

  const billing = await appendInvoice(invoice);
  return NextResponse.json({
    ok: true,
    invoiceId: invoice.id,
    invoiceCount: billing.invoices.length,
  });
}
