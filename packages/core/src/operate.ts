import type { Finding, Snapshot } from "./types.js";

const ENV_VAR_REGEX = /\b(?:process\.env\.([A-Za-z_][A-Za-z0-9_]*)|os\.environ(?:\.get)?\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']|import\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)|os\.Getenv\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\))/g;

function collectEnvVars(snapshotFiles: Snapshot["files"], readFile: Snapshot["readFile"]): Promise<Set<string>> {
  return (async () => {
    const names = new Set<string>();
    for (const file of snapshotFiles) {
      if (file.binary || file.path.endsWith(".md")) continue;
      try {
        const content = await readFile(file.path);
        for (const match of content.matchAll(ENV_VAR_REGEX)) {
          const name = match[1] ?? match[2] ?? match[3] ?? match[4];
          if (name !== undefined) names.add(name);
        }
      } catch {
        // Skip unreadable files.
      }
    }
    return names;
  })();
}

function commandsFromReadme(readme: string): string[] {
  const commands = new Set<string>();
  for (const line of readme.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/(npm|pnpm|yarn|pip|docker|python|node|uvicorn|flask|make)\b/.test(trimmed) && trimmed.length < 160) {
      commands.add(trimmed.replace(/^[-*]\s*/, ""));
    }
  }
  return [...commands].slice(0, 20);
}

function scriptsCommands(packageJson: unknown): string[] {
  if (typeof packageJson !== "object" || packageJson === null) return [];
  const scripts = (packageJson as { scripts?: Record<string, string> }).scripts;
  if (scripts === undefined) return [];
  return Object.keys(scripts).map((name) => `npm run ${name}`);
}

export async function generateOperateMd(
  snapshot: Snapshot,
  findings: Finding[],
  authorQuestions: Array<{ question: string }>,
  intentPurpose?: string,
): Promise<string> {
  const packageFile = snapshot.files.find((file) => file.path === "package.json");
  let packageJson: unknown;
  if (packageFile !== undefined) {
    try {
      packageJson = JSON.parse(await snapshot.readFile("package.json"));
    } catch {
      packageJson = undefined;
    }
  }

  const readmeFile = snapshot.files.find((file) => /^README(\.[a-z]+)?$/i.test(file.path.split("/").pop() ?? ""));
  const readme = readmeFile === undefined ? "" : await snapshot.readFile(readmeFile.path).catch(() => "");

  const usedEnv = await collectEnvVars(snapshot.files, snapshot.readFile);
  const exampleFile = snapshot.files.find((file) =>
    [".env.example", ".env.template", ".env.sample"].includes(file.path),
  );
  const documented = new Set<string>();
  if (exampleFile !== undefined) {
    const content = await snapshot.readFile(exampleFile.path).catch(() => "");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      if (match?.[1] !== undefined) documented.add(match[1]);
    }
  }
  for (const name of usedEnv) {
    if (readme.includes(name)) documented.add(name);
  }

  const commands = new Set<string>();
  if (packageFile !== undefined) commands.add("npm install");
  if (snapshot.files.some((file) => file.path === "requirements.txt")) commands.add("pip install -r requirements.txt");
  for (const command of scriptsCommands(packageJson)) commands.add(command);
  for (const command of commandsFromReadme(readme)) commands.add(command);

  const knownRisks = findings
    .filter((finding) => finding.severity === "critical" || finding.severity === "high")
    .slice(0, 10)
    .map((finding) => `- ${finding.message}`);

  const unknownEnv = [...usedEnv].filter((name) => !documented.has(name));

  const lines: string[] = [];
  lines.push("# OPERATE.md");
  lines.push("");
  lines.push("## What it is");
  lines.push("");
  lines.push(intentPurpose ?? "UNKNOWN: ask the author what this service does.");
  lines.push("");
  lines.push("## Run locally");
  lines.push("");
  if (commands.size === 0) {
    lines.push("UNKNOWN: ask the author how to run this service.");
  } else {
    for (const command of commands) lines.push(`- \`${command}\``);
  }
  lines.push("");
  lines.push("## Env vars");
  lines.push("");
  if (usedEnv.size === 0) {
    lines.push("No environment variables were detected.");
  } else {
    for (const name of [...usedEnv].sort()) {
      lines.push(`- \`${name}\` — ${documented.has(name) ? "documented" : "UNKNOWN: ask the author"}`);
    }
  }
  if (unknownEnv.length > 0) {
    lines.push("");
    lines.push("Undocumented variables require author input before handoff.");
  }
  lines.push("");
  lines.push("## Deploy");
  lines.push("");
  if (snapshot.files.some((file) => file.path === "Dockerfile")) {
    lines.push("A Dockerfile is present. Build and run it using the repository's documented commands.");
  } else {
    lines.push("UNKNOWN: ask the author how this service is deployed.");
  }
  lines.push("");
  lines.push("## First-hour debugging");
  lines.push("");
  lines.push("- Check application logs and the documented health endpoint.");
  lines.push("- Verify all required environment variables are set.");
  if (knownRisks.length > 0) {
    lines.push("- Review the known risks below before making changes.");
  }
  lines.push("");
  lines.push("## Rollback");
  lines.push("");
  lines.push("UNKNOWN: ask the author for the rollback procedure.");
  lines.push("");
  lines.push("## Known risks");
  lines.push("");
  if (knownRisks.length === 0) {
    lines.push("No high or critical risks were detected.");
  } else {
    lines.push(...knownRisks);
  }
  lines.push("");
  lines.push("## Things only the author knows");
  lines.push("");
  if (authorQuestions.length === 0) {
    lines.push("No author-only questions were identified.");
  } else {
    for (const question of authorQuestions) lines.push(`- ${question.question}`);
  }
  lines.push("");

  return lines.join("\n");
}
