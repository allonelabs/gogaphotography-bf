// ════════════════════════════════════════════════════════════════════════════
// Vendor signature verifiers — one per supported webhook source. Each
// returns { ok, eventId? } where eventId is used by the dedup layer.
//
// Verifiers are pure: they take the raw body + headers + a per-vendor
// secret, return a boolean + optional event id. They never throw — bad
// signatures + missing secrets fail-closed (return ok:false).
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export type Vendor = 'stripe' | 'cal-com' | 'postmark' | 'github' | 'zapier';

export interface VerifyArgs {
  raw: string;                          // unparsed request body (UTF-8)
  headers: Record<string, string>;      // lowercase header keys
  /** Vendor's signing secret. Resolved server-side from env or keychain. */
  secret: string;
}

export interface VerifyResult {
  ok: boolean;
  /** When ok and the vendor's payload includes a stable id, surface it for dedup. */
  eventId?: string;
  /** When !ok, why. Surface in 401 response. */
  reason?: string;
}

const VERIFIERS: Record<Vendor, (a: VerifyArgs) => VerifyResult> = {
  stripe:    verifyStripe,
  'cal-com': verifyCalCom,
  postmark:  verifyPostmark,
  github:    verifyGitHub,
  zapier:    verifyZapier,
};

const ALLOWED: ReadonlySet<string> = new Set(Object.keys(VERIFIERS));

export function isVendor(v: string): v is Vendor { return ALLOWED.has(v); }

export function verify(vendor: Vendor, args: VerifyArgs): VerifyResult {
  return VERIFIERS[vendor](args);
}

// ── stripe ─────────────────────────────────────────────────────────────
// Header: stripe-signature: t=<unix>,v1=<sha256-hmac>
// HMAC body: `${t}.${rawBody}`
function verifyStripe({ raw, headers, secret }: VerifyArgs): VerifyResult {
  if (!secret) return { ok: false, reason: 'missing stripe webhook secret' };
  const sig = headers['stripe-signature'];
  if (!sig) return { ok: false, reason: 'missing stripe-signature header' };
  const parts = sig.split(',').reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split('=');
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  const t = parts['t']; const v1 = parts['v1'];
  if (!t || !v1) return { ok: false, reason: 'malformed stripe-signature' };
  // Reject signatures older than 5 minutes (replay defense).
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(t, 10)) > 300) return { ok: false, reason: 'signature timestamp drift' };
  const expected = createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  if (!safeEq(expected, v1)) return { ok: false, reason: 'stripe signature mismatch' };
  // event id from body
  const eventId = parsedField(raw, 'id');
  return eventId ? { ok: true, eventId } : { ok: true };
}

// ── cal.com ────────────────────────────────────────────────────────────
// Header: cal-signature-256: <sha256-hmac>
function verifyCalCom({ raw, headers, secret }: VerifyArgs): VerifyResult {
  if (!secret) return { ok: false, reason: 'missing cal.com webhook secret' };
  const sig = headers['cal-signature-256'] ?? headers['x-cal-signature-256'];
  if (!sig) return { ok: false, reason: 'missing cal-signature header' };
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  if (!safeEq(expected, sig)) return { ok: false, reason: 'cal.com signature mismatch' };
  const eventId = parsedField(raw, 'triggerEvent') ?? parsedField(raw, 'uid');
  return eventId ? { ok: true, eventId } : { ok: true };
}

// ── postmark (basic-auth) ──────────────────────────────────────────────
// Postmark inbound webhooks support basic-auth via the configured
// "Webhook URL" credentials. Header: authorization: Basic <base64(u:p)>
function verifyPostmark({ headers, secret, raw }: VerifyArgs): VerifyResult {
  if (!secret) return { ok: false, reason: 'missing postmark webhook secret' };
  const auth = headers['authorization'];
  if (!auth?.startsWith('Basic ')) return { ok: false, reason: 'missing basic auth' };
  const decoded = Buffer.from(auth.slice('Basic '.length), 'base64').toString('utf8');
  const [user, pass] = decoded.split(':', 2);
  // We expect the secret to be `<user>:<password>`.
  const [eUser, ePass] = secret.split(':', 2);
  if (!user || !pass || !eUser || !ePass) return { ok: false, reason: 'malformed credentials' };
  if (user !== eUser || pass !== ePass) return { ok: false, reason: 'credential mismatch' };
  const eventId = parsedField(raw, 'MessageID');
  return eventId ? { ok: true, eventId } : { ok: true };
}

// ── github ─────────────────────────────────────────────────────────────
// Header: x-hub-signature-256: sha256=<sha256-hmac>
function verifyGitHub({ raw, headers, secret }: VerifyArgs): VerifyResult {
  if (!secret) return { ok: false, reason: 'missing github webhook secret' };
  const sig = headers['x-hub-signature-256'];
  if (!sig?.startsWith('sha256=')) return { ok: false, reason: 'missing x-hub-signature-256' };
  const expected = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
  if (!safeEq(expected, sig)) return { ok: false, reason: 'github signature mismatch' };
  const eventId = headers['x-github-delivery'];
  return eventId ? { ok: true, eventId } : { ok: true };
}

// ── zapier ─────────────────────────────────────────────────────────────
// Zapier supports shared-secret in a custom header.
function verifyZapier({ headers, secret, raw }: VerifyArgs): VerifyResult {
  if (!secret) return { ok: false, reason: 'missing zapier shared secret' };
  const provided = headers['x-zapier-secret'];
  if (!provided) return { ok: false, reason: 'missing x-zapier-secret header' };
  if (!safeEq(provided, secret)) return { ok: false, reason: 'zapier secret mismatch' };
  const eventId = parsedField(raw, 'id');
  return eventId ? { ok: true, eventId } : { ok: true };
}

// ── helpers ────────────────────────────────────────────────────────────
function safeEq(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function parsedField(raw: string, key: string): string | undefined {
  // Best-effort field extraction without parsing the entire body. Used
  // only for dedup keys, never for security decisions.
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const v = obj[key];
    return typeof v === 'string' ? v : undefined;
  } catch {
    return undefined;
  }
}
