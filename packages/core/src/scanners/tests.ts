import path from "node:path";
import type { Finding, Scanner, Snapshot } from "../types.js";

function makeFinding(file: string, ruleId: string, severity: Finding["severity"], message: string, quote: string): Finding {
  return {
    id: `${ruleId}:${file}`,
    dimension: "tests_ci",
    ruleId,
    severity,
    message,
    evidence: [{ file, lineStart: 1, lineEnd: 1, quote }],
    source: "deterministic",
    validated: true,
  };
}

function isTestFile(filePath: string): boolean {
  const base = path.basename(filePath).toLowerCase();
  const segments = filePath.split("/");
  return (
    base.includes(".test.") ||
    base.includes(".spec.") ||
    base.startsWith("test") ||
    segments.includes("test") ||
    segments.includes("tests") ||
    segments.includes("__tests__")
  );
}

function hasTestCommand(packageJson: unknown): boolean {
  if (typeof packageJson !== "object" || packageJson === null) return false;
  const scripts = (packageJson as { scripts?: Record<string, string> }).scripts;
  return typeof scripts?.test === "string" && scripts.test.trim() !== "";
}

function ciFiles(snapshot: Snapshot): string[] {
  return snapshot.files
    .map((file) => file.path)
    .filter((file) => file.startsWith(".github/workflows/") || file === ".gitlab-ci.yml" || file === ".circleci/config.yml");
}

async function ciRunsTests(snapshot: Snapshot): Promise<boolean> {
  for (const file of ciFiles(snapshot)) {
    try {
      const content = await snapshot.readFile(file);
      if (/(npm|pnpm|yarn)\s+(run\s+)?test|pytest|vitest|jest/i.test(content)) return true;
    } catch {
      // Ignore unreadable CI files; they are reported separately.
    }
  }
  return false;
}

export const testsScanner: Scanner = {
  id: "tests_ci",
  dimension: "tests_ci",
  description: "Detect tests, test commands, and CI test execution.",
  scan: async (snapshot) => {
    const findings: Finding[] = [];
    const testFiles = snapshot.files.filter((file) => isTestFile(file.path));
    const packageFile = snapshot.files.find((file) => file.path === "package.json");

    let packageJson: unknown;
    if (packageFile !== undefined) {
      try {
        packageJson = JSON.parse(await snapshot.readFile("package.json"));
      } catch {
        packageJson = undefined;
      }
    }

    const hasPythonTests = snapshot.files.some((file) => file.path.endsWith("pytest.ini") || file.path.endsWith("conftest.py"));
    if (testFiles.length === 0 && !hasPythonTests) {
      findings.push(makeFinding("README.md", "tests.missing", "high", "No test files were found.", "#"));
    }

    if (packageFile !== undefined && !hasTestCommand(packageJson)) {
      findings.push(makeFinding("package.json", "tests.command.missing", "medium", "No test command was found in package.json.", '"scripts"'));
    }

    const workflows = ciFiles(snapshot);
    if (workflows.length === 0) {
      findings.push(makeFinding(".github/workflows", "ci.missing", "medium", "No CI configuration was found.", "name:"));
    } else if (!(await ciRunsTests(snapshot))) {
      findings.push(makeFinding(workflows[0] ?? ".github/workflows", "ci.no_tests", "medium", "CI configuration does not appear to run tests.", "run:"));
    }

    return findings;
  },
};
