// tests/integration/meta.spec.ts
import { test, expect } from "@playwright/test";

test("messages admin is auth-gated", async ({ page }) => {
  await page.goto("/app/messages");
  expect(page.url()).not.toContain("/app/messages");
});

test("webhook verify returns 403 with wrong token", async ({ request }) => {
  const res = await request.get(
    "/api/meta/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=CH",
  );
  expect(res.status()).toBe(403);
});
