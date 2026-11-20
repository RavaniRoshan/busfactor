import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Report } from "../lib/report-view";
import { ReportWindow } from "./report-window";

const fixture: Report = {
  score: 64,
  verdict: "operable-with-briefing",
  dimensions: [{ label: "Secrets and config", score: 70, findingCount: 1 }],
  findings: [
    {
      severity: "high",
      message: "A secret is committed",
      evidence: [{ file: "config/secrets.ts", lineStart: 18 }],
    },
  ],
  authorQuestions: [
    { question: "Who rotates the webhook secret?", evidence: [{ file: "config/secrets.ts", lineStart: 18 }] },
  ],
  operateMd: "## Run locally\n- `npm install`",
  meta: { sha: "abc123", engineVersion: "0.1.1", rubricVersion: "0.1" },
};

describe("ReportWindow", () => {
  it("declares nav tabs as non-native buttons because they render links", () => {
    const source = readFileSync(path.join(process.cwd(), "components/report-window.tsx"), "utf8");
    expect(source).toContain("nativeButton={false}");
  });

  it("renders the persistent shell and links every view", () => {
    const html = renderToStaticMarkup(<ReportWindow report={fixture} slug="abc123" view="verdict" />);
    expect(html).toContain("report-window");
    expect(html).toContain("abc123");
    expect(html).toContain("64/100");
    for (const view of ["verdict", "risks", "operate", "questions"]) {
      expect(html).toContain(`/r/abc123?view=${view}`);
    }
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain("abc123");
    expect(html).toContain("0.1.1");
    expect(html).toContain('aria-labelledby="rw-tab-verdict"');
    expect(html.match(/tabindex="0"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("switches content by view prop", () => {
    const html = renderToStaticMarkup(<ReportWindow report={fixture} slug="abc123" view="risks" />);
    expect(html).toContain("Where a handoff breaks first");
    expect(html).not.toContain("OPERABILITY VERDICT");
  });
});
