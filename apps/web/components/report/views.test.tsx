import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Report } from "../../lib/report-view";
import { OperateView } from "./operate-view";
import { QuestionsView } from "./questions-view";
import { RiskMapView } from "./risk-map-view";
import { VerdictView } from "./verdict-view";

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
    {
      question: "Who rotates the webhook secret?",
      evidence: [{ file: "config/secrets.ts", lineStart: 18 }],
    },
  ],
  operateMd: "## Run locally\n- `npm install`",
  meta: { sha: "abc123", engineVersion: "0.1.1", rubricVersion: "0.1" },
};

describe("report views", () => {
  it("renders the score band, severity and citation", () => {
    const html = renderToStaticMarkup(<VerdictView report={fixture} />);
    expect(html).toContain("Risky");
    expect(html).toContain("config/secrets.ts:18");
  });

  it("escapes hostile repository text", () => {
    const html = renderToStaticMarkup(
      <VerdictView
        report={{
          ...fixture,
          findings: [
            { severity: "high", message: "<script>alert(1)</script>", evidence: [{ file: "a.ts", lineStart: 3 }] },
          ],
        }}
      />,
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("shows empty states", () => {
    const empty = { ...fixture, findings: [], dimensions: [], authorQuestions: [], operateMd: "" };
    expect(renderToStaticMarkup(<VerdictView report={empty} />)).toContain("No findings were recorded.");
    expect(renderToStaticMarkup(<RiskMapView report={empty} />)).toContain("No dimensions were scored.");
    expect(renderToStaticMarkup(<QuestionsView report={empty} />)).toContain("No author questions were recorded.");
  });

  it("marks low risk-map bars with warning tone and an accessible label", () => {
    const html = renderToStaticMarkup(
      <RiskMapView
        report={{ ...fixture, dimensions: [{ label: "Secrets", score: 25, findingCount: 2 }] }}
      />,
    );
    expect(html).toContain("Secrets: 25 out of 100, 2 findings");
    expect(html).toContain("rw-bar-warning");
  });

  it("renders parsed OPERATE.md sections and unknown text", () => {
    const html = renderToStaticMarkup(
      <OperateView report={{ ...fixture, operateMd: "## Rollback\nUNKNOWN: ask the author" }} />,
    );
    expect(html).toContain("Rollback");
    expect(html).toContain("UNKNOWN: ask the author");
  });
});
