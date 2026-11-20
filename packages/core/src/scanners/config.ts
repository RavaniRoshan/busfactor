import path from "node:path";
import type { Finding, Scanner } from "../types.js";

function makeFinding(file: string, ruleId: string, severity: Finding["severity"], message: string, quote: string): Finding {
  return {
    id: `${ruleId}:${file}`,
    dimension: "secrets_config",
    ruleId,
    severity,
    message,
    evidence: [{ file, lineStart: 1, lineEnd: 1, quote }],
    source: "deterministic",
    validated: true,
  };
}

const ENV_VAR_REGEX = /\b(?:process\.env\.([A-Za-z_][A-Za-z0-9_]*)|os\.environ(?:\.get)?\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']|import\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)|os\.Getenv\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\))/g;

const STANDARD_ENV_VARS = new Set([
  "PATH",
  "HOME",
  "USER",
  "SHELL",
  "TERM",
  "PAGER",
  "LESS",
  "LANG",
  "LC_ALL",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_CACHE_HOME",
  "PWD",
  "OLDPWD",
  "TMPDIR",
  "NODE_ENV",
]);

function collectEnvVars(content: string): Set<string> {
  const names = new Set<string>();
  for (const match of content.matchAll(ENV_VAR_REGEX)) {
    const name = match[1] ?? match[2] ?? match[3] ?? match[4];
    if (name !== undefined) names.add(name);
  }
  return names;
}

export const configScanner: Scanner = {
  id: "config",
  dimension: "secrets_config",
  description: "Compare environment variables used in code with documented variables.",
  scan: async (snapshot) => {
    const findings: Finding[] = [];
    const used = new Set<string>();
    for (const file of snapshot.files) {
      if (file.binary || file.path.endsWith(".md")) continue;
      if (file.path.split("/").some((part) => part === "test" || part === "tests" || part === "__tests__")) continue;
      if (path.basename(file.path).toLowerCase().startsWith("test")) continue;
      try {
        const content = await snapshot.readFile(file.path);
        for (const name of collectEnvVars(content)) used.add(name);
      } catch {
        // Unreadable files are skipped; ingestion already recorded the reason.
      }
    }
    for (const name of STANDARD_ENV_VARS) used.delete(name);

    const documented = new Set<string>();
    const exampleFiles = [".env.example", ".env.template", ".env.sample"];
    const exampleFile = snapshot.files.find((file) => exampleFiles.includes(file.path));
    if (exampleFile !== undefined) {
      const content = await snapshot.readFile(exampleFile.path).catch(() => "");
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
        if (match?.[1] !== undefined) documented.add(match[1]);
      }
    }

    const readmeFile = snapshot.files.find((file) => /^README(\.[a-z]+)?$/i.test(file.path.split("/").pop() ?? ""));
    if (readmeFile !== undefined) {
      const content = await snapshot.readFile(readmeFile.path).catch(() => "");
      for (const name of used) {
        if (content.includes(name)) documented.add(name);
      }
    }

    if (used.size > 0 && exampleFile === undefined) {
      findings.push(
        makeFinding(
          ".env.example",
          "config.env.example.missing",
          "medium",
          "Environment variables are used but no .env.example was found.",
          "PORT",
        ),
      );
    }

    for (const name of used) {
      if (!documented.has(name)) {
        findings.push(
          makeFinding(
            exampleFile?.path ?? ".env.example",
            "config.env.undocumented",
            "medium",
            `${name} is used in code but not documented.`,
            name,
          ),
        );
      }
    }

    if (snapshot.files.some((file) => file.path === ".env")) {
      findings.push(
        makeFinding(".env", "config.env.committed", "low", "A .env file is committed to the repository.", "KEY=value"),
      );
    }

    return findings;
  },
};
