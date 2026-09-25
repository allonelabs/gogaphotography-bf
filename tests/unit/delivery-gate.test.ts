import { beforeEach, describe, expect, it } from "vitest";
import {
  setDeliveryCookie,
  verifyDeliveryCookieValue,
} from "@/app/lib/goga/delivery-gate";

describe("delivery cookie signature binding", () => {
  beforeEach(() => {
    process.env["NEXTAUTH_SECRET"] ??= "test-secret-for-delivery-gate";
  });

  it("verifies a cookie against the token it was minted for", async () => {
    const cookie = await setDeliveryCookie("gallery-open-token");
    const ok = await verifyDeliveryCookieValue(
      "gallery-open-token",
      cookie.value,
    );
    expect(ok).toBe(true);
  });

  it("rejects a cookie minted for one gallery when presented for another", async () => {
    // This is the actual bug: a cookie for an OPEN gallery (no password)
    // must not unlock a DIFFERENT, password-protected gallery just because
    // the signature check used to ignore which token it was issued for.
    const openGalleryCookie = await setDeliveryCookie("open-gallery-token");
    const crossed = await verifyDeliveryCookieValue(
      "password-protected-gallery-token",
      openGalleryCookie.value,
    );
    expect(crossed).toBe(false);
  });

  it("rejects a missing cookie value", async () => {
    expect(await verifyDeliveryCookieValue("any-token", undefined)).toBe(false);
  });

  it("rejects a malformed cookie value", async () => {
    expect(
      await verifyDeliveryCookieValue("any-token", "not-a-valid-value"),
    ).toBe(false);
  });

  it("rejects an expired cookie even with a valid signature", async () => {
    const cookie = await setDeliveryCookie("expiring-token");
    const [, sig] = cookie.value.split(".");
    const expiredValue = `${Date.now() - 1000}.${sig}`;
    expect(
      await verifyDeliveryCookieValue("expiring-token", expiredValue),
    ).toBe(false);
  });
});
