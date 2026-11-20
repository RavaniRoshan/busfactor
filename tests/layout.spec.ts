import { check_viewports, type ViewportSpec } from "overflowlint/playwright";
import { expect, test } from "@playwright/test";

const viewports: ViewportSpec[] = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

test("scan page has no overflow, clipping or overlap at desktop and mobile", async ({ page }) => {
  await page.goto("/scan");
  await ignoreSkipLink(page);
  const report = await check_viewports(page, viewports, { strategy: "resize" });
  expect(report.failures, describe(report.failures)).toEqual([]);
});

test("report workspace has no overflow, clipping or overlap at desktop and mobile", async ({ page, request }) => {
  const created = await request.post("/api/scan", { data: { target: "fixtures/repos/clean" } });
  expect(created.ok()).toBeTruthy();
  const { slug } = (await created.json()) as { slug: string };

  for (const view of ["verdict", "risks", "operate", "questions"]) {
    await page.goto(`/r/${slug}?view=${view}`);
    await ignoreSkipLink(page);
    const report = await check_viewports(page, viewports, { strategy: "resize" });
    expect(report.failures, `${view}: ${describe(report.failures)}`).toEqual([]);
  }
});

test("report stacks navigator above content and keeps its header inside the viewport on mobile", async ({ page, request }) => {
  const created = await request.post("/api/scan", { data: { target: "fixtures/repos/clean" } });
  expect(created.ok()).toBeTruthy();
  const { slug } = (await created.json()) as { slug: string };

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/r/${slug}?view=risks`);

  const geometry = await page.evaluate(() => {
    const nav = document.querySelector(".rw-nav")!.getBoundingClientRect();
    const content = document.querySelector(".rw-content")!.getBoundingClientRect();
    const header = document.querySelector(".rw-header")!;
    return {
      navX: Math.round(nav.x),
      navBottom: Math.round(nav.bottom),
      contentX: Math.round(content.x),
      contentTop: Math.round(content.top),
      headerScrollWidth: header.scrollWidth,
      headerClientWidth: header.clientWidth,
    };
  });

  expect(geometry.navX, "navigator must align with content on mobile").toBe(geometry.contentX);
  expect(geometry.navBottom, "navigator must sit above content on mobile").toBeLessThanOrEqual(geometry.contentTop + 1);
  expect(geometry.headerScrollWidth, "header must not clip its score/provenance text").toBeLessThanOrEqual(geometry.headerClientWidth + 1);
});

function describe(failures: Array<{ finding: { rule?: string; message?: string; severity?: string }; viewports: string[] }>) {
  return failures
    .map((f) => `${f.finding.rule ?? "rule"} (${f.finding.severity ?? "?"}) on ${f.viewports.join(",")}: ${f.finding.message ?? ""}`)
    .join("\n");
}

// The visually hidden skip link sits at (-1,-1) until focused; geometry-based
// tools report it as "covered". It is intentionally off-screen, so suppress it.
async function ignoreSkipLink(page: import("@playwright/test").Page) {
  await page.evaluate(() => document.querySelectorAll("a.sr-only").forEach((el) => el.setAttribute("data-ol-ignore", "")));
}
