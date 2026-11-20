import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createDefaultScanners } from "./scanners/index.js";
import { createSnapshotFromLocal } from "./snapshot.js";

const cleanPath = fileURLToPath(new URL("../../../fixtures/repos/clean", import.meta.url));
const badPath = fileURLToPath(new URL("../../../fixtures/repos/bad", import.meta.url));

describe("deterministic scanners", () => {
  it("produces no high or critical findings for the clean fixture", async () => {
    const snapshot = await createSnapshotFromLocal(cleanPath);
    const scanners = createDefaultScanners();
    const findings = [];
    for (const scanner of scanners) findings.push(...(await scanner.scan(snapshot)));

    expect(findings.filter((finding) => finding.severity === "high" || finding.severity === "critical")).toHaveLength(0);
  });

  it("finds the seeded issues in the bad fixture", async () => {
    const snapshot = await createSnapshotFromLocal(badPath);
    const scanners = createDefaultScanners();
    const findings = [];
    for (const scanner of scanners) findings.push(...(await scanner.scan(snapshot)));
    const ruleIds = new Set(findings.map((finding) => finding.ruleId));

    expect(ruleIds).toContain("secret.env.committed");
    expect(ruleIds).toContain("config.env.example.missing");
    expect(ruleIds).toContain("config.env.undocumented");
    expect(ruleIds).toContain("deps.lockfile.missing");
    expect(ruleIds).toContain("deps.version.wildcard");
    expect(ruleIds).toContain("deps.package.deprecated");
    expect(ruleIds).toContain("tests.missing");
    expect(ruleIds).toContain("tests.command.missing");
    expect(ruleIds).toContain("ci.missing");
    expect(ruleIds).toContain("run.readme.missing");
  });
});
