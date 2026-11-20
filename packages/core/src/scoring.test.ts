import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createDefaultScanners } from "./scanners/index.js";
import { scoreFindings, topReasons } from "./scoring.js";
import { createSnapshotFromLocal } from "./snapshot.js";

const goodPath = fileURLToPath(new URL("../../../fixtures/repos/clean", import.meta.url));
const midPath = fileURLToPath(new URL("../../../fixtures/repos/mid", import.meta.url));
const badPath = fileURLToPath(new URL("../../../fixtures/repos/bad", import.meta.url));

describe("scoring engine", () => {
  it("is deterministic for the same findings", () => {
    const findings = [
      {
        id: "f1",
        dimension: "runnability" as const,
        ruleId: "run.steps.missing",
        severity: "high" as const,
        message: "missing",
        evidence: [{ file: "README.md", lineStart: 1, lineEnd: 1, quote: "#" }],
        source: "deterministic" as const,
        validated: true,
      },
    ];
    expect(scoreFindings(findings)).toEqual(scoreFindings(findings));
  });

  it("never raises the score when a high-severity finding is added", () => {
    const base = scoreFindings([]).score;
    const withHigh = scoreFindings([
      {
        id: "f1",
        dimension: "runnability" as const,
        ruleId: "run.steps.missing",
        severity: "high" as const,
        message: "missing",
        evidence: [{ file: "README.md", lineStart: 1, lineEnd: 1, quote: "#" }],
        source: "deterministic" as const,
        validated: true,
      },
    ]).score;
    expect(withHigh).toBeLessThanOrEqual(base);
  });

  it("caps the total at 49 for a critical secret", () => {
    const result = scoreFindings([
      {
        id: "secret",
        dimension: "secrets_config" as const,
        ruleId: "secret.env.committed",
        severity: "critical" as const,
        message: "secret",
        evidence: [{ file: ".env", lineStart: 1, lineEnd: 1, quote: "KEY=[REDACTED]" }],
        source: "deterministic" as const,
        validated: true,
      },
    ]);
    expect(result.score).toBeLessThanOrEqual(49);
  });

  it("caps runnability at 5 when the repository cannot be run", () => {
    const result = scoreFindings([
      {
        id: "run",
        dimension: "runnability" as const,
        ruleId: "run.readme.missing",
        severity: "high" as const,
        message: "missing",
        evidence: [{ file: "README.md", lineStart: 1, lineEnd: 1, quote: "#" }],
        source: "deterministic" as const,
        validated: true,
      },
    ]);
    expect(result.dimensions.find((dimension) => dimension.dimension === "runnability")?.score).toBeLessThanOrEqual(5);
  });

  it("orders good, mid, and bad fixtures with gaps of at least 15 points", async () => {
    const scanners = createDefaultScanners();
    async function scanAndScore(repoPath: string) {
      const snapshot = await createSnapshotFromLocal(repoPath);
      const findings = [];
      for (const scanner of scanners) findings.push(...(await scanner.scan(snapshot)));
      return scoreFindings(findings).score;
    }

    const good = await scanAndScore(goodPath);
    const mid = await scanAndScore(midPath);
    const bad = await scanAndScore(badPath);

    expect(good - mid).toBeGreaterThanOrEqual(15);
    expect(mid - bad).toBeGreaterThanOrEqual(15);
  });

  it("returns top reasons with fixes and effort tags", () => {
    const reasons = topReasons([
      {
        id: "f1",
        dimension: "secrets_config" as const,
        ruleId: "secret.env.committed",
        severity: "high" as const,
        message: "secret",
        evidence: [{ file: ".env", lineStart: 1, lineEnd: 1, quote: "KEY=[REDACTED]" }],
        source: "deterministic" as const,
        validated: true,
      },
    ]);
    expect(reasons[0]).toMatchObject({ fix: expect.any(String), effort: expect.any(String) });
  });
});
