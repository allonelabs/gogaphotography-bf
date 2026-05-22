// Token-bucket rate limiter — per (tenant, vendor). In-process, single-node.
// When the runtime swaps to Inngest/Redis, this becomes a Redis INCR with
// a per-key TTL; the public `consume()` contract stays identical.

interface Bucket {
  tokens: number;
  lastRefill: number;       // ms epoch
}

const BUCKETS = new Map<string, Bucket>();

function key(tenant: string, vendor: string): string {
  return `${tenant}::${vendor}`;
}

interface RateConfig {
  /** Max burst (also the bucket capacity). */
  capacity: number;
  /** Tokens refilled per minute. */
  refillPerMinute: number;
}

const DEFAULT: RateConfig = { capacity: 100, refillPerMinute: 100 };

const PER_VENDOR: Partial<Record<string, RateConfig>> = {
  stripe:    { capacity: 200, refillPerMinute: 200 },   // bursty events
  'cal-com': { capacity: 60,  refillPerMinute: 60 },
  postmark:  { capacity: 60,  refillPerMinute: 60 },
  github:    { capacity: 120, refillPerMinute: 120 },
  zapier:    { capacity: 40,  refillPerMinute: 40 },
};

function configFor(vendor: string): RateConfig {
  return PER_VENDOR[vendor] ?? DEFAULT;
}

export interface ConsumeResult {
  ok: boolean;
  remaining: number;
  retryAfterSec?: number;
}

/**
 * Try to consume one token from the (tenant, vendor) bucket. Refills
 * proportional to elapsed wall time before the consume.
 */
export function consume(tenant: string, vendor: string): ConsumeResult {
  const cfg = configFor(vendor);
  const now = Date.now();
  const k = key(tenant, vendor);
  const b = BUCKETS.get(k) ?? { tokens: cfg.capacity, lastRefill: now };

  // Refill.
  const elapsedMs = now - b.lastRefill;
  const refill = (elapsedMs / 60_000) * cfg.refillPerMinute;
  b.tokens = Math.min(cfg.capacity, b.tokens + refill);
  b.lastRefill = now;

  if (b.tokens < 1) {
    BUCKETS.set(k, b);
    const tokensNeeded = 1 - b.tokens;
    const retryAfterSec = Math.max(1, Math.ceil((tokensNeeded / cfg.refillPerMinute) * 60));
    return { ok: false, remaining: 0, retryAfterSec };
  }

  b.tokens -= 1;
  BUCKETS.set(k, b);
  return { ok: true, remaining: Math.floor(b.tokens) };
}

// ── for tests ────────────────────────────────────────────────────────
export function _resetForTest(): void {
  BUCKETS.clear();
}
