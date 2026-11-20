import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { generateOperateMd } from "./operate.js";
import { runLlmPasses } from "./llm/passes.js";
import { createDefaultProvider } from "./llm/mock.js";
import { createDefaultScanners } from "./scanners/index.js";
import { scanSnapshot } from "./scan.js";
import { createSnapshotFromLocal } from "./snapshot.js";

const cleanPath = fileURLToPath(new URL("../../../fixtures/repos/clean", import.meta.url));
const midPath = fileURLToPath(new URL("../../../fixtures/repos/mid", import.meta.url));
const badPath = fileURLToPath(new URL("../../../fixtures/repos/bad", import.meta.url));

describe("OPERATE.md and author questions", () => {
  it("matches the golden output for the clean fixture", async () => {
    const snapshot = await createSnapshotFromLocal(cleanPath);
    const scanners = createDefaultScanners();
    const findings = [];
    for (const scanner of scanners) findings.push(...(await scanner.scan(snapshot)));
    const llm = await runLlmPasses(snapshot, findings, createDefaultProvider());
    const authorQuestions = llm.authorQuestions.map((question, index) => ({
      id: `q${index + 1}`,
      question: question.question,
      why: question.why,
      evidence: question.evidence,
    }));
    const operateMd = await generateOperateMd(snapshot, findings, authorQuestions, llm.intent?.purpose);
    expect(operateMd).toMatchSnapshot();
  });

  it("does not invent commands for the clean fixture", async () => {
    const snapshot = await createSnapshotFromLocal(cleanPath);
    const scanners = createDefaultScanners();
    const findings = [];
    for (const scanner of scanners) findings.push(...(await scanner.scan(snapshot)));
    const llm = await runLlmPasses(snapshot, findings, createDefaultProvider());
    const authorQuestions = llm.authorQuestions.map((question, index) => ({
      id: `q${index + 1}`,
      question: question.question,
      why: question.why,
      evidence: question.evidence,
    }));
    const operateMd = await generateOperateMd(snapshot, findings, authorQuestions, llm.intent?.purpose);

    const commands = [...operateMd.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    for (const command of commands) {
      if (command?.startsWith("npm run ")) {
        const script = command.replace("npm run ", "");
        const packageJson = JSON.parse(await snapshot.readFile("package.json")) as { scripts?: Record<string, string> };
        expect(packageJson.scripts?.[script]).toBeDefined();
      }
    }
  });

  it("writes UNKNOWN sections for the bad fixture", async () => {
    const snapshot = await createSnapshotFromLocal(badPath);
    const scanners = createDefaultScanners();
    const findings = [];
    for (const scanner of scanners) findings.push(...(await scanner.scan(snapshot)));
    const llm = await runLlmPasses(snapshot, findings, createDefaultProvider());
    const authorQuestions = llm.authorQuestions.map((question, index) => ({
      id: `q${index + 1}`,
      question: question.question,
      why: question.why,
      evidence: question.evidence,
    }));
    const operateMd = await generateOperateMd(snapshot, findings, authorQuestions, llm.intent?.purpose);
    expect(operateMd).toContain("UNKNOWN: ask the author");
  });

  it("ensures every author question traces to evidence", async () => {
    const report = await scanSnapshot(await createSnapshotFromLocal(midPath));
    for (const question of report.authorQuestions) {
      expect(question.evidence.length).toBeGreaterThan(0);
    }
  });
});
