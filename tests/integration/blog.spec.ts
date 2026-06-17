// tests/integration/blog.spec.ts
import { test, expect } from "@playwright/test";

test("blog index renders and links to a post when one is published", async ({
  page,
}) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const firstPost = page.locator("a[href^='/blog/']").first();
  if (await firstPost.count()) {
    await firstPost.click();
    await expect(page).toHaveURL(/\/blog\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("english toggle adds lang=en", async ({ page }) => {
  await page.goto("/blog");
  const toggle = page.getByRole("link", { name: /english/i });
  if (await toggle.count()) {
    await toggle.click();
    await expect(page).toHaveURL(/lang=en/);
  }
});
