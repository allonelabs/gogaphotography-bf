import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time password comparison.
 *
 * Hashing both sides to a fixed-length SHA-256 digest before comparing
 * means every comparison takes the same shape of work regardless of the
 * submitted string's length — the previous character-by-character XOR
 * loop bailed out immediately with `a.length !== b.length`, which leaks
 * the expected password's length (and, combined with timing, lets an
 * attacker binary-search individual characters) to anyone who can measure
 * response latency.
 */
export function secureEqual(submitted: string, expected: string): boolean {
  const a = createHash("sha256").update(submitted).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const FAIL_DELAY_MS = 400;

type Attempt = { count: number; windowStart: number };

// Module-level in-memory state. Resets on cold start / redeploy and isn't
// shared across serverless instances — acceptable for a single-operator
// admin login where the goal is slowing down casual brute-forcing, not
// providing a hard security boundary.
const attempts = new Map<string, Attempt>();

function currentAttempt(ip: string): Attempt | null {
  const a = attempts.get(ip);
  if (!a) return null;
  if (Date.now() - a.windowStart > WINDOW_MS) {
    attempts.delete(ip);
    return null;
  }
  return a;
}

export function isLockedOut(ip: string): boolean {
  const a = currentAttempt(ip);
  return !!a && a.count >= MAX_FAILURES;
}

export function recordFailure(ip: string): void {
  const existing = currentAttempt(ip);
  if (existing) {
    existing.count += 1;
    return;
  }
  attempts.set(ip, { count: 1, windowStart: Date.now() });
}

export function recordSuccess(ip: string): void {
  attempts.delete(ip);
}

export function failureDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, FAIL_DELAY_MS));
}

export function clientIpFromRequest(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
