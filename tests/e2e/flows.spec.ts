import { expect, test } from "@playwright/test";

test("import -> save -> dashboard -> share import flow", async ({ page }) => {
  await page.route("**/api/import/parse", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Parsed 1 items.",
        items: [
          {
            name: "Paper Towels",
            priceYen: 1280,
            frequencyUnit: "month",
            frequencyInterval: 1,
            nextDeliveryDate: "2026-03-01",
          },
        ],
      }),
    });
  });

  await page.goto("/import");
  await page.getByPlaceholder("Paste Amazon subscription page text here...").fill("sample text");
  await page.getByRole("button", { name: "Parse Text" }).click();
  await page.getByRole("button", { name: "Save Selected Items" }).click();

  await page.goto("/");
  await expect(page.getByText("Paper Towels")).toBeVisible();

  await page.goto("/share");
  await page.getByRole("button", { name: "Generate" }).click();
  const generated = await page.locator("textarea").first().inputValue();

  await page.locator("textarea").nth(1).fill(generated);
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("Imported data to this browser successfully.")).toBeVisible();
});

test("mobile layout keeps primary actions visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Text Import" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Share" })).toBeVisible();
});
