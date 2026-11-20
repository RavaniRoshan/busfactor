import type { Finding, Scanner, Snapshot } from "../types.js";

const SECRET_PATTERNS: Array<{ ruleId: string; severity: Finding["severity"]; regex: RegExp }> = [
  { ruleId: "secret.aws.access_key", severity: "critical", regex: /AKIA[0-9A-Z]{16}/g },
  { ruleId: "secret.github.token", severity: "critical", regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g },
  { ruleId: "secret.github.fine_grained", severity: "critical", regex: /github_pat_[A-Za-z0-9_]{82}/g },
  { ruleId: "secret.stripe.live", severity: "critical", regex: /sk_live_[A-Za-z0-9]{24,}/g },
  { ruleId: "secret.slack.token", severity: "critical", regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { ruleId: "secret.google.api_key", severity: "high", regex: /AIza[0-9A-Za-z_-]{35}/g },
];

const PRIVATE_KEY_REGEX = /-----BEGIN (?:[A-Z ]+)?PRIVATE KEY-----/g;
const GENERIC_SECRET_REGEX =
  /\b(?:api[_-]?key|secret|token|password|passwd|pwd)\b\s*[:=]\s*["']([^"']{8,})["']/gi;

const PLACEHOLDER_VALUES = new Set([
  "changeme",
  "change-me",
  "example",
  "password",
  "secret",
  "token",
  "your_api_key",
  "your-api-key",
  "xxx",
  "xxxxxxxx",
  "placeholder",
]);

function shannonEntropy(value: string): number {
  const counts = new Map<string, number>();
  for (const char of value) counts.set(char, (counts.get(char) ?? 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

function redactSecret(value: string): string {
  if (value.length <= 4) return "[REDACTED]";
  return `${value.slice(0, 4)}...[REDACTED]`;
}

function makeFinding(
  snapshot: Snapshot,
  ruleId: string,
  severity: Finding["severity"],
  file: string,
  line: number,
  message: string,
  quote: string,
): Finding {
  return {
    id: `${ruleId}:${file}:${line}`,
    dimension: "secrets_config",
    ruleId,
    severity,
    message,
    evidence: [{ file, lineStart: line, lineEnd: line, quote }],
    source: "deterministic",
    validated: true,
  };
}

async function scanFile(snapshot: Snapshot, file: string): Promise<Finding[]> {
  if (file.endsWith(".env.example") || file.endsWith(".env.template")) return [];
  let content: string;
  try {
    content = await snapshot.readFile(file);
  } catch {
    return [];
  }

  const findings: Finding[] = [];
  const lines = content.split(/\r?\n/);

  if (pathBasename(file) === ".env" || file.endsWith("/.env")) {
    lines.forEach((line, index) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$/);
      if (match === null) return;
      const key = match[1];
      const value = match[2];
      if (key === undefined || value === undefined) return;
      if (!/(secret|token|password|passwd|pwd|api[_-]?key|private)/i.test(key)) return;
      if (PLACEHOLDER_VALUES.has(value.toLowerCase().replace(/^["']|["']$/g, ""))) return;
      findings.push(
        makeFinding(
          snapshot,
          "secret.env.committed",
          "high",
          file,
          index + 1,
          `A secret-like value is committed in ${file}.`,
          `${key}=[REDACTED]`,
        ),
      );
    });
  }

  lines.forEach((line, index) => {
    for (const pattern of SECRET_PATTERNS) {
      const matches = [...line.matchAll(pattern.regex)];
      for (const match of matches) {
        const value = match[0];
        findings.push(
          makeFinding(
            snapshot,
            pattern.ruleId,
            pattern.severity,
            file,
            index + 1,
            `A ${pattern.ruleId.replace("secret.", "").replace(/\./g, " ")} was found in ${file}.`,
            line.replace(value, redactSecret(value)),
          ),
        );
      }
    }

    for (const _ of line.matchAll(PRIVATE_KEY_REGEX)) {
      findings.push(
        makeFinding(
          snapshot,
          "secret.private_key",
          "critical",
          file,
          index + 1,
          `A private key block was found in ${file}.`,
          "-----BEGIN PRIVATE KEY----- [REDACTED]",
        ),
      );
    }

    for (const match of line.matchAll(GENERIC_SECRET_REGEX)) {
      const value = match[1];
      if (value === undefined || PLACEHOLDER_VALUES.has(value.toLowerCase())) continue;
      if (shannonEntropy(value) < 3.5) continue;
      findings.push(
        makeFinding(
          snapshot,
          "secret.generic.high_entropy",
          "high",
          file,
          index + 1,
          `A high-entropy secret-like value was found in ${file}.`,
          line.replace(value, redactSecret(value)),
        ),
      );
    }
  });

  return findings;
}

function pathBasename(filePath: string): string {
  const parts = filePath.split("/");
  return parts[parts.length - 1] ?? filePath;
}

export const secretsScanner: Scanner = {
  id: "secrets",
  dimension: "secrets_config",
  description: "Detect committed secrets and secret-like values.",
  scan: async (snapshot) => {
    const findings: Finding[] = [];
    for (const file of snapshot.files) {
      if (file.binary) continue;
      findings.push(...(await scanFile(snapshot, file.path)));
    }
    return findings;
  },
};
