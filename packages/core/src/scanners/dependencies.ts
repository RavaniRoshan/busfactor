import path from "node:path";
import type { Finding, Scanner, Snapshot } from "../types.js";

const DEPRECATED_PACKAGES = new Set([
  "request",
  "node-uuid",
  "left-pad",
  "gulp-util",
  "bower",
  "tslint",
  "protractor",
]);

function makeFinding(file: string, ruleId: string, severity: Finding["severity"], message: string, quote: string): Finding {
  return {
    id: `${ruleId}:${file}`,
    dimension: "dependencies",
    ruleId,
    severity,
    message,
    evidence: [{ file, lineStart: 1, lineEnd: 1, quote }],
    source: "deterministic",
    validated: true,
  };
}

function hasLockfile(snapshot: Snapshot): boolean {
  return snapshot.files.some((file) =>
    ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "Cargo.lock", "poetry.lock", "Pipfile.lock"].includes(
      path.basename(file.path),
    ),
  );
}

async function scanPackageJson(snapshot: Snapshot): Promise<Finding[]> {
  const file = "package.json";
  if (!snapshot.files.some((entry) => entry.path === file)) return [];

  let parsed: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  try {
    parsed = JSON.parse(await snapshot.readFile(file)) as typeof parsed;
  } catch {
    return [makeFinding(file, "deps.package_json.invalid", "medium", "package.json could not be parsed.", "{")];
  }

  const findings: Finding[] = [];
  if (!hasLockfile(snapshot)) {
    findings.push(makeFinding(file, "deps.lockfile.missing", "medium", "No lockfile was found.", '"dependencies"'));
  }

  const dependencies = { ...parsed.dependencies, ...parsed.devDependencies };
  for (const [name, version] of Object.entries(dependencies)) {
    if (version === "*" || version === "latest" || version.startsWith(">")) {
      findings.push(
        makeFinding(
          file,
          "deps.version.wildcard",
          "medium",
          `${name} uses an unpinned version (${version}).`,
          `"${name}": "${version}"`,
        ),
      );
    }
    if (DEPRECATED_PACKAGES.has(name)) {
      findings.push(
        makeFinding(
          file,
          "deps.package.deprecated",
          "medium",
          `${name} is a commonly deprecated package.`,
          `"${name}"`,
        ),
      );
    }
  }

  return findings;
}

async function scanPython(snapshot: Snapshot): Promise<Finding[]> {
  const requirements = "requirements.txt";
  if (!snapshot.files.some((entry) => entry.path === requirements)) return [];

  const findings: Finding[] = [];
  if (!snapshot.files.some((entry) => entry.path === "poetry.lock" || entry.path === "Pipfile.lock")) {
    findings.push(
      makeFinding(requirements, "deps.lockfile.missing", "low", "No Python lockfile was found.", "-r"),
    );
  }

  let content = "";
  try {
    content = await snapshot.readFile(requirements);
  } catch {
    return findings;
  }

  const unpinned = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .filter((line) => !line.includes("==") && !line.includes(">=") && !line.includes("<="));

  if (unpinned.length > 0) {
    findings.push(
      makeFinding(
        requirements,
        "deps.python.unpinned",
        "low",
        "Some Python dependencies are not pinned to exact versions.",
        unpinned[0] ?? requirements,
      ),
    );
  }

  for (const line of content.split(/\r?\n/)) {
    const name = line.trim().split(/[<>=!~]/)[0]?.trim().toLowerCase();
    if (name !== undefined && DEPRECATED_PACKAGES.has(name)) {
      findings.push(
        makeFinding(requirements, "deps.package.deprecated", "medium", `${name} is a commonly deprecated package.`, line.trim()),
      );
    }
  }

  return findings;
}

export const dependenciesScanner: Scanner = {
  id: "dependencies",
  dimension: "dependencies",
  description: "Check lockfiles, pinned versions, and deprecated packages.",
  scan: async (snapshot) => {
    const findings = [...(await scanPackageJson(snapshot)), ...(await scanPython(snapshot))];
    return findings;
  },
};
