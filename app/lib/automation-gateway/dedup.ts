// In-memory dedup cache for webhook event IDs. Keys expire after 10 min
// — replays older than that are best-effort caught by vendor-side
// idempotency. Same shape Redis would expose.

const CACHE = new Map<string, number>();   // eventKey → expiresAt (ms)
const TTL_MS = 10 * 60 * 1000;

function evict(now: number): void {
  for (const [k, exp] of CACHE.entries()) {
    if (exp < now) CACHE.delete(k);
  }
}

/**
 * Returns true if this is the FIRST time we've seen the eventKey within
 * the window — caller proceeds. Returns false if the key was already
 * recorded — caller responds 200 with `{deduped: true}`.
 */
export function record(eventKey: string): boolean {
  const now = Date.now();
  // Evict opportunistically; cheap when the cache is small.
  if (CACHE.size > 1000) evict(now);
  if (CACHE.has(eventKey)) return false;
  CACHE.set(eventKey, now + TTL_MS);
  return true;
}

export function _resetForTest(): void {
  CACHE.clear();
}
