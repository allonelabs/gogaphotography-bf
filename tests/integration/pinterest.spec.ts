// tests/integration/pinterest.spec.ts
import { test, expect } from "@playwright/test";

test("pinterest admin is auth-gated", async ({ page }) => {
  await page.goto("/app/pinterest");
  expect(page.url()).not.toContain("/app/pinterest");
});

test("cron route responds (401 when secret set, ok no-op otherwise)", async ({
  request,
}) => {
  const res = await request.get("/api/cron/pinterest");
  expect([200, 401]).toContain(res.status());
});
