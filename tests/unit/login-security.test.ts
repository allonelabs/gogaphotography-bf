import { beforeEach, describe, expect, it } from "vitest";
import {
  isLockedOut,
  recordFailure,
  recordSuccess,
  secureEqual,
} from "@/app/lib/goga/login-security";

describe("secureEqual", () => {
  it("is true for identical strings", () => {
    expect(secureEqual("correct-horse", "correct-horse")).toBe(true);
  });

  it("is false for a wrong password of the same length", () => {
    expect(secureEqual("correct-horse", "wrong-donkey!")).toBe(false);
  });

  it("is false when lengths differ, without throwing", () => {
    // The bug this replaces: a naive char-by-char compare bails out on a
    // length mismatch immediately, which leaks the expected password's
    // length via response timing. Hashing first means both sides are
    // always 32-byte digests, so there's no early exit to time.
    expect(secureEqual("short", "a-much-longer-password")).toBe(false);
    expect(secureEqual("", "nonempty")).toBe(false);
  });
});

describe("login lockout", () => {
  const ip = "203.0.113.5";

  beforeEach(() => {
    recordSuccess(ip); // clears any state from a previous test
  });

  it("is not locked out before any failures", () => {
    expect(isLockedOut(ip)).toBe(false);
  });

  it("locks out after repeated failures and a success clears it", () => {
    for (let i = 0; i < 9; i++) recordFailure(ip);
    expect(isLockedOut(ip)).toBe(false); // still under the threshold

    recordFailure(ip); // 10th failure
    expect(isLockedOut(ip)).toBe(true);

    recordSuccess(ip);
    expect(isLockedOut(ip)).toBe(false);
  });

  it("tracks separate IPs independently", () => {
    const other = "198.51.100.9";
    recordSuccess(other);
    for (let i = 0; i < 10; i++) recordFailure(ip);
    expect(isLockedOut(ip)).toBe(true);
    expect(isLockedOut(other)).toBe(false);
  });
});
