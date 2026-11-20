import path from "node:path";
import type { Finding, Scanner } from "../types.js";

function makeFinding(file: string, ruleId: string, severity: Finding["severity"], message: string, quote: string): Finding {
  return {
    id: `${ruleId}:${file}`,
    dimension: "runnability",
    ruleId,
    severity,
    message,
    evidence: [{ file, lineStart: 1, lineEnd: 1, quote }],
    source: "deterministic",
    validated: true,
  };
}

const RUN_KEYWORDS = [
  "npm install",
  "pnpm install",
  "yarn install",
  "pip install",
  "docker compose",
  "docker-compose",
  "npm start",
  "pnpm start",
  "yarn start",
  "uvicorn",
  "flask run",
  "python -m",
];

export const runnabilityScanner: Scanner = {
  id: "runnability",
  dimension: "runnability",
  description: "Detect whether the repository can be run from documented steps.",
  scan: async (snapshot) => {
    const findings: Finding[] = [];
    const files = new Set(snapshot.files.map((file) => file.path));
    const readmeCandidates = snapshot.files
      .filter((file) => /^README(\.[a-z]+)?$/i.test(path.basename(file.path)))
      .sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));
    const hasReadme = readmeCandidates.length > 0;
    const readmeFile = readmeCandidates[0];
    const readmeContent = readmeFile === undefined ? "" : await snapshot.readFile(readmeFile.path).catch(() => "");
    const documentedRun = RUN_KEYWORDS.some((keyword) => readmeContent.toLowerCase().includes(keyword.toLowerCase()));

    const hasDockerfile = files.has("Dockerfile") || files.has("docker-compose.yml") || files.has("docker-compose.yaml") || files.has("compose.yml") || files.has("compose.yaml");
    const hasPackageScripts = await (async () => {
      const packageFile = snapshot.files.find((file) => file.path === "package.json");
      if (packageFile === undefined) return false;
      try {
        const parsed = JSON.parse(await snapshot.readFile("package.json")) as { scripts?: Record<string, string> };
        return Boolean(parsed.scripts?.start || parsed.scripts?.dev);
      } catch {
        return false;
      }
    })();

    if (!hasReadme) {
      findings.push(makeFinding("README.md", "run.readme.missing", "high", "No README was found.", "#"));
    } else if (!documentedRun && !hasDockerfile && !hasPackageScripts) {
      findings.push(makeFinding(readmeFile?.path ?? "README.md", "run.steps.missing", "high", "No runnable entry point or run steps were found.", readmeContent.slice(0, 80) || "#"));
    }

    const hasPorts = /port|PORT|expose|EXPOSE/i.test(readmeContent) || snapshot.files.some((file) => file.path === "Dockerfile");
    if (!hasPorts && (hasDockerfile || hasPackageScripts)) {
      findings.push(makeFinding(readmeFile?.path ?? "Dockerfile", "run.ports.undocumented", "low", "Exposed ports are not documented.", "PORT"));
    }

    return findings;
  },
};
