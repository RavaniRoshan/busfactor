import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = ["/scan", "/docs", "/privacy", "/terms", "/removal"];

for (const path of pages) {
  test(`axe WCAG checks on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });
}

test("axe WCAG checks on every report view", async ({ page, request }) => {
  const created = await request.post("/api/scan", { data: { target: "fixtures/repos/clean" } });
  expect(created.ok()).toBeTruthy();
  const { slug } = (await created.json()) as { slug: string };

  for (const view of ["verdict", "risks", "operate", "questions"]) {
    await page.goto(`/r/${slug}?view=${view}`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, `${view}: ${formatViolations(results.violations)}`).toEqual([]);
  }
});

function formatViolations(violations: Array<{ id: string; impact?: string | null; nodes: Array<{ target: unknown; failureSummary?: string }> }>) {
  return violations
    .map((v) => `${v.id} (${v.impact ?? "unknown"}): ${v.nodes.map((n) => JSON.stringify(n.target)).join(", ")}`)
    .join("\n");
}
