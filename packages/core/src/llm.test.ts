import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { MockProvider } from "./llm/mock.js";
import { evidenceIsValid } from "./llm/citation.js";
import { scanSnapshot } from "./scan.js";
import { createSnapshotFromLocal } from "./snapshot.js";
import { reportSchema } from "./types.js";

const cleanPath = fileURLToPath(new URL("../../../fixtures/repos/clean", import.meta.url));
const hostilePath = fileURLToPath(new URL("../../../fixtures/repos/hostile", import.meta.url));

describe("LLM passes and citation validation", () => {
  it("drops citations whose quote does not match the file", async () => {
    const snapshot = await createSnapshotFromLocal(cleanPath);
    const evidence = {
      file: "README.md",
      lineStart: 1,
      lineEnd: 1,
      quote: "this quote is not in the file",
    };
    expect(await evidenceIsValid(evidence, snapshot)).toBe(false);
  });

  it("accepts a citation whose quote matches the file", async () => {
    const snapshot = await createSnapshotFromLocal(cleanPath);
    const evidence = {
      file: "README.md",
      lineStart: 1,
      lineEnd: 1,
      quote: "# Clean demo",
    };
    expect(await evidenceIsValid(evidence, snapshot)).toBe(true);
  });

  it("produces a valid report in mock mode for a clean repository", async () => {
    const snapshot = await createSnapshotFromLocal(cleanPath);
    const report = await scanSnapshot(snapshot, { provider: new MockProvider() });
    expect(reportSchema.safeParse(report).success).toBe(true);
  });

  it("does not let hostile repository text change the report schema or add fake findings", async () => {
    const snapshot = await createSnapshotFromLocal(hostilePath);
    const report = await scanSnapshot(snapshot, { provider: new MockProvider() });
    expect(reportSchema.safeParse(report).success).toBe(true);
    expect(report.findings.some((finding) => /fake/i.test(finding.message))).toBe(false);
    expect(report.score).toBeLessThanOrEqual(100);
  });
});
