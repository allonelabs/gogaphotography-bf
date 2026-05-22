# Infrastructure modules — environment variables

The four production-grade infrastructure modules lifted from Business Forge
(outbox, email, payment, automation) need a small set of env vars on top of
what `.env.local.example` already documents. Because the pre-edit guard
refuses writes to `.env.local.example`, the canonical list lives here.

Add these to your `.env.local` (and to Vercel project env via `vercel env`):

## Outbox drain (Task 1)

```
# Shared secret for the /api/outbox/drain endpoint. The Vercel cron job
# in vercel.json hits the endpoint every minute; set this header on any
# manual drain calls. Generate via `openssl rand -hex 16`.
OUTBOX_DRAIN_SECRET=<openssl rand -hex 16>
```

## Email via Resend (Task 2)

```
# Production key is in macOS Keychain:
#   security find-generic-password -s "resend-allonelabs" -w
# Locally, paste the same value here.
RESEND_API_KEY=<re_...>
```

## Stripe (Task 3, gated)

```
# Set both to enable the /api/webhooks/stripe receiver + checkout sessions.
# If unset and Keychain has no `stripe-allonelabs` entry, payment features
# stay disabled (isStripeEnabled() returns false). Override with
# STRIPE_ENABLED=1 to force-on with placeholder values during dev.
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_ENABLED=1
```

## Local dev — actually writing to .env.local

The repo's pre-commit guard refuses to edit `.env.local.example`. Set
these in your shell before starting `pnpm dev`:

```bash
export OUTBOX_DRAIN_SECRET=$(openssl rand -hex 16)
export RESEND_API_KEY=$(security find-generic-password -s "resend-allonelabs" -w)
# Stripe stays opt-in via STRIPE_ENABLED=1 when you're ready.
```

Or append to `.env.local` manually (the guard only blocks the example file).
