import { describe, expect, it } from "vitest";

import { bandForScore, parseOperateMd, parseReportView, severityTone } from "./lib/report-view";

describe("bandForScore", () => {
  it("maps the PDR band boundaries exactly", () => {
    expect(bandForScore(100)).toBe("Handoff-ready");
    expect(bandForScore(85)).toBe("Handoff-ready");
    expect(bandForScore(84)).toBe("Operable with a briefing");
    expect(bandForScore(70)).toBe("Operable with a briefing");
    expect(bandForScore(69)).toBe("Risky");
    expect(bandForScore(50)).toBe("Risky");
    expect(bandForScore(49)).toBe("Only the author can run this");
    expect(bandForScore(0)).toBe("Only the author can run this");
  });
});

describe("severityTone", () => {
  it("maps severities to Space UI badge variants", () => {
    expect(severityTone("critical")).toBe("error");
    expect(severityTone("high")).toBe("error");
    expect(severityTone("medium")).toBe("warning");
    expect(severityTone("low")).toBe("success");
    expect(severityTone("info")).toBe("info");
  });
});

describe("parseOperateMd", () => {
  it("splits engine headings into sections", () => {
    const md = ["# OPERATE.md", "", "## What it is", "A service.", "", "## Run locally", "- `npm install`", "", "## Rollback", "UNKNOWN: ask the author", ""].join("\n");
    expect(parseOperateMd(md)).toEqual([
      { heading: "What it is", lines: ["A service."] },
      { heading: "Run locally", lines: ["- `npm install`"] },
      { heading: "Rollback", lines: ["UNKNOWN: ask the author"] },
    ]);
  });

  it("keeps unstructured markdown in one section", () => {
    expect(parseOperateMd("plain text")).toEqual([{ heading: "OPERATE.md", lines: ["plain text"] }]);
  });
});

describe("parseReportView", () => {
  it("accepts known views and defaults everything else to verdict", () => {
    expect(parseReportView("risks")).toBe("risks");
    expect(parseReportView("operate")).toBe("operate");
    expect(parseReportView("questions")).toBe("questions");
    expect(parseReportView("nonsense")).toBe("verdict");
    expect(parseReportView(undefined)).toBe("verdict");
  });
});
