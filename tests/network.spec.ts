import { expect, test } from "@playwright/test";

test("no analytics or tracker request happens before consent", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (req) => requests.push(req.url()));

  await page.goto("/scan");
  await page.waitForLoadState("networkidle");

  const trackers = requests.filter((url) => /insight|analytics|vitals|segment|gtag|plausible|posthog/i.test(url));
  expect(trackers, `Automatic tracker requests: ${trackers.join("\n")}`).toEqual([]);
});

test("accepting consent sends a first-party analytics event", async ({ page }) => {
  await page.goto("/scan");
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/events") && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Accept" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(204);
});

test("no non-essential cookies or storage keys are set before consent", async ({ page, context }) => {
  await page.goto("/scan");
  await page.waitForLoadState("networkidle");

  const cookies = await context.cookies();
  expect(cookies.map((c) => c.name)).toEqual([]);

  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.filter((key) => /track|analytics|consent|segment/i.test(key))).toEqual([]);
});

test("theme toggle persists a preference", async ({ page }) => {
  await page.goto("/scan");
  const toggle = page.getByRole("button", { name: /switch to (dark|light) mode/i });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("theme"))).not.toBeNull();
});
