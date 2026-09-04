import { describe, expect, it } from "vitest";
import {
  isRedirectError,
  rethrowIfRedirect,
} from "@/app/lib/goga/redirect-error";

// Shape Next.js throws from redirect(): a plain Error carrying a `digest`.
function redirectSignal(to = "/app/projects") {
  return Object.assign(new Error("NEXT_REDIRECT"), {
    digest: `NEXT_REDIRECT;replace;${to};307;`,
  });
}

describe("isRedirectError", () => {
  it("recognises the signal redirect() throws", () => {
    expect(isRedirectError(redirectSignal())).toBe(true);
  });

  it("does not swallow a genuine failure", () => {
    expect(isRedirectError(new Error("delete failed: permission denied"))).toBe(
      false,
    );
    // an unrelated digest must not count
    expect(
      isRedirectError(Object.assign(new Error("x"), { digest: "NEXT_NOT_FOUND" })),
    ).toBe(false);
  });

  it("tolerates the values a catch block can actually receive", () => {
    for (const v of [null, undefined, "NEXT_REDIRECT", 42, {}]) {
      expect(isRedirectError(v)).toBe(false);
    }
  });
});

describe("rethrowIfRedirect", () => {
  it("re-throws the redirect so Next can navigate", () => {
    const sig = redirectSignal("/app/blog");
    expect(() => rethrowIfRedirect(sig)).toThrow(sig);
  });

  it("returns for a real error, leaving it to be reported", () => {
    expect(() => rethrowIfRedirect(new Error("boom"))).not.toThrow();
  });
});
