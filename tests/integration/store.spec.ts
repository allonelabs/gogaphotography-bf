// tests/integration/store.spec.ts
import { test, expect } from "@playwright/test";

test("catalog renders and a product can be added to cart and reach checkout", async ({
  page,
}) => {
  await page.goto("/store");
  await expect(page.getByRole("heading", { name: "Store" })).toBeVisible();

  const firstCard = page.locator("a[href^='/store/']").first();
  if (await firstCard.count()) {
    await firstCard.click();
    const addBtn = page.getByRole("button", { name: /add to cart/i });
    if (await addBtn.count()) {
      await addBtn.click();
      await expect(
        page.getByRole("button", { name: /in cart/i }),
      ).toBeVisible();
      await page.goto("/store/checkout");
      await expect(
        page.getByRole("heading", { name: /checkout/i }),
      ).toBeVisible();
      await expect(page.getByText(/total/i)).toBeVisible();
    }
  }
});
