// app/lib/meta.ts
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

export function verifyWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null,
  expected: string | null,
): string | null {
  if (mode === "subscribe" && token && expected && token === expected)
    return challenge ?? "";
  return null;
}

export function validateSignature(
  appSecret: string,
  rawBody: string,
  header: string | null,
): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  const got = header.slice("sha256=".length);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(got, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function sendMessage(
  pageToken: string,
  recipientId: string,
  text: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const res = await fetch(
    `${GRAPH}/me/messages?access_token=${encodeURIComponent(pageToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        messaging_type: "RESPONSE",
      }),
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    message_id?: string;
    error?: { message?: string };
  };
  if (!res.ok)
    return { ok: false, error: data.error?.message ?? `http ${res.status}` };
  return { ok: true, messageId: data.message_id };
}
