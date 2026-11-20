import path from "node:path";

import type { Snapshot } from "../types.js";

export interface ContextFile {
  path: string;
  content: string;
  score: number;
}

export interface BuiltContext {
  files: ContextFile[];
  estimatedTokens: number;
  omitted: string[];
}

const ENTRY_POINT_NAMES = new Set([
  "package.json",
  "README.md",
  "README",
  "pyproject.toml",
  "requirements.txt",
  "Dockerfile",
  "src/index.ts",
  "src/index.js",
  "src/main.py",
  "app.py",
  "main.py",
]);

function scoreFile(filePath: string, size: number, findingsFiles: Set<string>): number {
  let score = 0;
  if (ENTRY_POINT_NAMES.has(path.basename(filePath))) score += 100;
  if (filePath.includes("src/") || filePath.includes("app/")) score += 20;
  if (findingsFiles.has(filePath)) score += 40;
  score += Math.max(0, 20 - Math.floor(size / 1000));
  return score;
}

export async function buildContext(
  snapshot: Snapshot,
  findingsFiles: string[] = [],
  tokenBudget = 12_000,
): Promise<BuiltContext> {
  const findingSet = new Set(findingsFiles);
  const ranked = snapshot.files
    .filter((file) => !file.binary && file.ignoredReason === undefined)
    .map((file) => ({ file, score: scoreFile(file.path, file.size, findingSet) }))
    .sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path));

  const files: ContextFile[] = [];
  const omitted: string[] = [];
  let estimatedTokens = 0;

  for (const item of ranked) {
    let content = "";
    try {
      content = await snapshot.readFile(item.file.path);
    } catch {
      omitted.push(item.file.path);
      continue;
    }
    const tokens = Math.ceil(content.length / 4);
    if (estimatedTokens + tokens > tokenBudget && files.length > 0) {
      omitted.push(item.file.path);
      continue;
    }
    files.push({ path: item.file.path, content, score: item.score });
    estimatedTokens += tokens;
  }

  return { files, estimatedTokens, omitted };
}
