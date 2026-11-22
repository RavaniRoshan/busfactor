import { expect, test } from "@playwright/test";

const syntheticEmail = "verify-synthetic@example.invalid";
const syntheticSlug = "verify-synthetic";

test("root redirects into the app", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/scan$/);
  await expect(page.getByRole("heading", { name: "Scan a repository" })).toBeVisible();
});

test("public routes render their headings", async ({ page }) => {
  const pages = [
    ["/docs", "BusFactor documentation"],
    ["/privacy", "Privacy"],
    ["/terms", "Terms"],
    ["/removal", "Removal request"],
  ];
  for (const [path, heading] of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});

test("scan a local fixture and switch all four report views", async ({ page }) => {
  await page.goto("/scan");
  await page.getByLabel("Repository").fill("fixtures/repos/clean");
  await page.getByRole("button", { name: "Scan repository" }).click();
  await expect(page).toHaveURL(/\/r\/[a-z0-9]+/, { timeout: 30_000 });
  await expect(page.getByText("OPERABILITY VERDICT")).toBeVisible();

  const views = [
    ["Risk map", "Where a handoff breaks first"],
    ["OPERATE.md", "Operating"],
    ["Author questions", "Only the original author can answer"],
    ["Verdict", "OPERABILITY VERDICT"],
  ];
  for (const [link, heading] of views) {
    await page.getByRole("tab", { name: link, exact: false }).first().click();
    await expect(page.getByText(heading, { exact: false }).first()).toBeVisible();
    await expect(page).toHaveURL(/view=/);
  }
});

test("report routes are noindex and support downloads", async ({ page, request }) => {
  const created = await request.post("/api/scan", {
    data: { target: "fixtures/repos/clean" },
  });
  expect(created.ok()).toBeTruthy();
  const { slug } = (await created.json()) as { slug: string };

  await page.goto(`/r/${slug}`);
  const robots = page.locator('head meta[name="robots"]');
  await expect(robots).toHaveAttribute("content", /noindex/i);

  const downloads = [
    [`/api/report/${slug}/download`, "text/markdown"],
    [`/api/report/${slug}/fixes`, "text/markdown"],
    [`/badge/${slug}.svg`, "image/svg+xml"],
  ];
  for (const [path, type] of downloads) {
    const response = await request.get(path);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain(type);
  }
});

test("API gates reject invalid input and protect admin metrics", async ({ request }) => {
  const badEmail = await request.post("/api/waitlist", { data: { email: "not-an-email" } });
  expect(badEmail.status()).toBe(400);

  const unauthenticated = await request.get("/admin/metrics");
  expect(await unauthenticated.text()).toContain("Unauthorized");

  const authenticated = await request.get("/admin/metrics?token=audit-test-token");
  expect(await authenticated.text()).toContain("BusFactor operations");
});

test("scan rejects malicious URLs with safe category and no completed job leak", async ({ request }) => {
  const response = await request.post("/api/scan", { data: { target: "https://169.254.169.254/a/b" } });
  expect(response.status()).toBe(400);
  const body = (await response.json()) as { category?: string; error?: string; id?: string };
  expect(body.category).toBe("invalid_input");
  expect(body.error).toBe("Invalid scan target.");
  expect(body.id).toBeUndefined();
});

test("waitlist and feedback accept synthetic submissions", async ({ request }) => {
  const waitlist = await request.post("/api/waitlist", { data: { email: syntheticEmail } });
  expect(waitlist.ok()).toBeTruthy();

  const feedback = await request.post("/api/feedback", {
    data: { slug: syntheticSlug, helpful: true, note: "synthetic verification" },
  });
  expect(feedback.ok()).toBeTruthy();
});

test("a cached scan still returns a queryable job ID", async ({ request }) => {
  const target = "fixtures/repos/clean";
  const first = await request.post("/api/scan", { data: { target } });
  expect(first.ok()).toBeTruthy();
  const second = await request.post("/api/scan", { data: { target } });
  expect(second.ok()).toBeTruthy();
  const { id } = (await second.json()) as { id: string };

  const status = await request.get(`/api/scan/${id}`);
  expect(status.status(), "cache hit must still persist the job for status polling").toBe(200);
});

test("security headers are present", async ({ request }) => {
  const response = await request.get("/scan");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("no-referrer");
});

test.afterAll(async () => {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const root = process.cwd();
  const keepers: Array<[string, (row: any) => boolean]> = [
    ["apps/web/data/waitlist.json", (row) => row !== syntheticEmail],
    ["apps/web/data/feedback.json", (row) => row?.slug !== syntheticSlug],
  ];
  for (const [file, keep] of keepers) {
    try {
      const full = path.join(root, file);
      const rows = JSON.parse(await fs.readFile(full, "utf8")) as unknown[];
      await fs.writeFile(full, JSON.stringify(rows.filter(keep), null, 2));
    } catch {
      // No local data file — nothing to clean.
    }
  }
});
