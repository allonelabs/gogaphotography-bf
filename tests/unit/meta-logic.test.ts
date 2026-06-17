// tests/unit/meta-logic.test.ts
import { describe, it, expect } from "vitest";
import { parseWebhookEvents, shouldAutoReply } from "@/app/lib/goga/meta-logic";
import { verifyWebhook, validateSignature } from "@/app/lib/meta";
import { createHmac } from "crypto";

describe("parseWebhookEvents", () => {
  it("parses a messenger text message", () => {
    const body = {
      object: "page",
      entry: [
        {
          messaging: [
            { sender: { id: "PSID1" }, message: { mid: "m1", text: "hi" } },
          ],
        },
      ],
    };
    expect(parseWebhookEvents(body)).toEqual([
      { channel: "messenger", senderId: "PSID1", text: "hi", mid: "m1" },
    ]);
  });
  it("parses an instagram text message", () => {
    const body = {
      object: "instagram",
      entry: [
        {
          messaging: [
            { sender: { id: "IG1" }, message: { mid: "m2", text: "yo" } },
          ],
        },
      ],
    };
    expect(parseWebhookEvents(body)).toEqual([
      { channel: "instagram", senderId: "IG1", text: "yo", mid: "m2" },
    ]);
  });
  it("skips echoes, deliveries, reads, and empty", () => {
    const body = {
      object: "page",
      entry: [
        {
          messaging: [
            {
              sender: { id: "P" },
              message: { mid: "e", text: "x", is_echo: true },
            },
          ],
        },
        { messaging: [{ sender: { id: "P" }, delivery: {} }] },
        { messaging: [{ sender: { id: "P" }, read: {} }] },
        { messaging: [{ sender: { id: "P" }, message: { mid: "n" } }] },
      ],
    };
    expect(parseWebhookEvents(body)).toEqual([]);
  });
});

describe("shouldAutoReply", () => {
  it("only when enabled and not handed off", () => {
    expect(
      shouldAutoReply(
        { handoff: false } as never,
        { bot_enabled: true } as never,
      ),
    ).toBe(true);
    expect(
      shouldAutoReply(
        { handoff: true } as never,
        { bot_enabled: true } as never,
      ),
    ).toBe(false);
    expect(
      shouldAutoReply(
        { handoff: false } as never,
        { bot_enabled: false } as never,
      ),
    ).toBe(false);
  });
});

describe("verifyWebhook + validateSignature", () => {
  it("verifies handshake on match", () => {
    expect(verifyWebhook("subscribe", "tok", "CH", "tok")).toBe("CH");
    expect(verifyWebhook("subscribe", "bad", "CH", "tok")).toBe(null);
  });
  it("validates HMAC signature", () => {
    const body = '{"a":1}';
    const sig =
      "sha256=" +
      createHmac("sha256", "secret").update(body, "utf8").digest("hex");
    expect(validateSignature("secret", body, sig)).toBe(true);
    expect(validateSignature("secret", body, "sha256=deadbeef")).toBe(false);
    expect(validateSignature("secret", body, null)).toBe(false);
  });
});
