/**
 * POST /api/webhooks/stripe — Stripe webhook receiver.
 *
 * Signature-verified per BF ADR-037. Body must be read as raw text
 * (not parsed) for the signature to match — Next.js App Router gives us
 * that by default via `req.text()`.
 */
import { handleStripeWebhook } from "@/app/lib/payment/webhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // crypto.createHmac for sig verify

export async function POST(req: Request): Promise<Response> {
  return handleStripeWebhook(req);
}
