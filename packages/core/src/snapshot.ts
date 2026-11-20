import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as tar from "tar";

import { detectStack, isBinaryPath, languageForPath } from "./detection.js";
import type { Snapshot, SnapshotData, SnapshotFile, SnapshotOptions, Stack } from "./types.js";

const execFileAsync = promisify(execFile);

export const DEFAULT_FILE_CAP = 5_000;
export const DEFAULT_SIZE_CAP_BYTES = 25 * 1024 * 1024;

export const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  "target",
  ".turbo",
  ".cache",
  "tmp",
  "logs",
]);

export const LOCKFILE_NAMES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "Cargo.lock",
  "poetry.lock",
  "Pipfile.lock",
]);

export class SnapshotError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SnapshotError";
    this.code = code;
  }
}

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  ref?: string;
}

export function parseGitHubUrl(input: string): ParsedGitHubUrl {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new SnapshotError("invalid_url", `Not a valid URL: ${input}`);
  }
  if (url.hostname !== "github.com") {
    throw new SnapshotError("invalid_host", "Only github.com URLs are supported");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new SnapshotError("invalid_repo", "GitHub URL must include owner and repository");
  }
  const owner = parts[0];
  const repoRaw = parts[1];
  if (owner === undefined || repoRaw === undefined || owner === "" || repoRaw === "") {
    throw new SnapshotError("invalid_repo", "GitHub URL must include owner and repository");
  }
  const repo = repoRaw.replace(/\.git$/, "");
  const parsed: ParsedGitHubUrl = { owner, repo };
  if (parts[2] === "tree" && parts[3] !== undefined) {
    parsed.ref = parts.slice(3).join("/");
  }
  return parsed;
}

function safeJoin(root: string, relativePath: string): string {
  const resolved = path.resolve(root, relativePath);
  const rootWithSeparator = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootWithSeparator)) {
    throw new SnapshotError("path_traversal", `Path escapes the repository: ${relativePath}`);
  }
  return resolved;
}

async function hasNullByte(filePath: string): Promise<boolean> {
  const handle = await import("node:fs/promises").then((fs) => fs.open(filePath, "r"));
  try {
    const buffer = Buffer.alloc(8192);
    const result = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, result.bytesRead).includes(0);
  } finally {
    await handle.close();
  }
}

async function gitHeadSha(root: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", root, "rev-parse", "HEAD"]);
    const sha = stdout.trim();
    return /^[0-9a-f]{40}$/i.test(sha) ? sha : undefined;
  } catch {
    return undefined;
  }
}

async function gitAuthors(root: string): Promise<SnapshotData["stats"]["gitAuthors"]> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", root, "shortlog", "-sne", "--all"]);
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d+)\s+(.+?)\s+<([^>]+)>$/);
        if (!match) return undefined;
        const commitsText = match[1];
        const name = match[2];
        const email = match[3];
        if (commitsText === undefined || name === undefined || email === undefined) return undefined;
        return { commits: Number(commitsText), name, email };
      })
      .filter((author): author is NonNullable<typeof author> => author !== undefined);
  } catch {
    return undefined;
  }
}

function hashSnapshot(files: SnapshotFile[]): string {
  const hash = createHash("sha256");
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(`${file.path}:${file.size}\n`);
  }
  return hash.digest("hex");
}

async function walkLocal(
  root: string,
  options: Required<Pick<SnapshotOptions, "fileCap" | "sizeCapBytes">>,
  limitations: string[],
): Promise<{ files: SnapshotFile[]; totalBytes: number }> {
  const files: SnapshotFile[] = [];
  let totalBytes = 0;

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolutePath);

      if (entry.isSymbolicLink()) {
        let target = absolutePath;
        try {
          target = await import("node:fs/promises").then((fs) => fs.realpath(absolutePath));
        } catch {
          target = absolutePath;
        }
        const rootWithSeparator = root.endsWith(path.sep) ? root : root + path.sep;
        if (target !== root && !target.startsWith(rootWithSeparator)) {
          throw new SnapshotError("symlink_escape", `Symlink escapes the repository: ${relativePath}`);
        }
        limitations.push(`Skipped symlink: ${relativePath}`);
        continue;
      }

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          limitations.push(`Ignored directory: ${relativePath}`);
          continue;
        }
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) continue;

      const fileStat = await stat(absolutePath);
      if (totalBytes + fileStat.size > options.sizeCapBytes) {
        throw new SnapshotError(
          "size_cap_exceeded",
          `Repository exceeds the ${options.sizeCapBytes}-byte size cap`,
        );
      }

      const binary = isBinaryPath(relativePath) || (await hasNullByte(absolutePath));
      files.push({
        path: relativePath.split(path.sep).join("/"),
        size: fileStat.size,
        language: binary ? "binary" : languageForPath(relativePath),
        binary,
        ignoredReason: LOCKFILE_NAMES.has(entry.name) ? "lockfile-body" : undefined,
      });
      totalBytes += fileStat.size;

      if (files.length > options.fileCap) {
        throw new SnapshotError(
          "file_cap_exceeded",
          `Repository exceeds the ${options.fileCap}-file cap`,
        );
      }
    }
  }

  await walk(root);
  return { files, totalBytes };
}

export async function createSnapshotFromLocal(
  rootPath: string,
  options: SnapshotOptions = {},
): Promise<Snapshot> {
  const root = path.resolve(rootPath);
  const rootStat = await stat(root).catch(() => undefined);
  if (rootStat === undefined || !rootStat.isDirectory()) {
    throw new SnapshotError("not_a_directory", `Not a directory: ${rootPath}`);
  }

  const fileCap = options.fileCap ?? DEFAULT_FILE_CAP;
  const sizeCapBytes = options.sizeCapBytes ?? DEFAULT_SIZE_CAP_BYTES;
  const limitations: string[] = [];
  const { files, totalBytes } = await walkLocal(root, { fileCap, sizeCapBytes }, limitations);

  const stack = detectStack(files);
  const sha = (await gitHeadSha(root)) ?? hashSnapshot(files);
  const authors = await gitAuthors(root);

  const snapshotData: SnapshotData = {
    root,
    sha,
    source: "local",
    files,
    stack,
    limitedAnalysis: stack === "unsupported",
    stats: {
      fileCount: files.length,
      totalBytes,
      languageCounts: files.reduce<Record<string, number>>((counts, file) => {
        counts[file.language] = (counts[file.language] ?? 0) + 1;
        return counts;
      }, {}),
      gitAuthors: authors,
    },
  };

  if (limitations.length > 0) {
    snapshotData.stats.languageCounts["ignored"] = limitations.length;
  }

  const snapshot: Snapshot = {
    ...snapshotData,
    readFile: async (relativePath: string) => {
      const absolutePath = safeJoin(root, relativePath);
      const file = files.find((entry) => entry.path === relativePath.split(path.sep).join("/"));
      if (file === undefined) {
        throw new SnapshotError("unknown_file", `File is not in the snapshot: ${relativePath}`);
      }
      if (file.binary) {
        throw new SnapshotError("binary_file", `Cannot read binary file: ${relativePath}`);
      }
      if (file.ignoredReason === "lockfile-body") {
        throw new SnapshotError("ignored_file", `Lockfile bodies are not readable: ${relativePath}`);
      }
      const content = await readFile(absolutePath, "utf8");
      return content;
    },
  };

  return snapshot;
}

export async function createSnapshotFromGitHub(
  input: string,
  options: SnapshotOptions = {},
): Promise<Snapshot> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const parsed = parseGitHubUrl(input);
  const fileCap = options.fileCap ?? DEFAULT_FILE_CAP;
  const sizeCapBytes = options.sizeCapBytes ?? DEFAULT_SIZE_CAP_BYTES;

  const commitResponse = await fetchImpl(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits${
      parsed.ref ? `/${encodeURIComponent(parsed.ref)}` : ""
    }`,
    { headers: { Accept: "application/vnd.github+json", "User-Agent": "BusFactor" } },
  );
  if (!commitResponse.ok) {
    throw new SnapshotError(
      "github_commit_lookup_failed",
      `Could not resolve a commit for ${parsed.owner}/${parsed.repo}: ${commitResponse.status}`,
    );
  }
  const commitJson = (await commitResponse.json()) as { sha?: string };
  const sha = commitJson.sha;
  if (typeof sha !== "string" || !/^[0-9a-f]{40}$/i.test(sha)) {
    throw new SnapshotError("github_sha_missing", "GitHub did not return a commit SHA");
  }

  const tarballResponse = await fetchImpl(
    `https://codeload.github.com/${parsed.owner}/${parsed.repo}/tar.gz/${sha}`,
    { headers: { "User-Agent": "BusFactor" } },
  );
  if (!tarballResponse.ok) {
    throw new SnapshotError(
      "github_tarball_failed",
      `Could not download the repository tarball: ${tarballResponse.status}`,
    );
  }

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "busfactor-github-"));
  const tarballPath = path.join(tempRoot, "repo.tar.gz");
  const extractDir = path.join(tempRoot, "extracted");
  await mkdir(extractDir);
  await writeFile(tarballPath, Buffer.from(await tarballResponse.arrayBuffer()));

  let totalExtractedBytes = 0;
  await tar.x({
    file: tarballPath,
    cwd: extractDir,
    filter: (entryPath: string, entry: { type?: string; size?: number }) => {
      if (entryPath.includes("..") || path.isAbsolute(entryPath)) return false;
      if (entry.type === "SymbolicLink" || entry.type === "Link") return false;
      if (typeof entry.size === "number") {
        totalExtractedBytes += entry.size;
        if (totalExtractedBytes > sizeCapBytes) return false;
      }
      return true;
    },
  });

  const extractedEntries = await readdir(extractDir, { withFileTypes: true });
  const root =
    extractedEntries.length === 1 && extractedEntries[0]?.isDirectory()
      ? path.join(extractDir, extractedEntries[0].name)
      : extractDir;

  const snapshot = await createSnapshotFromLocal(root, {
    fileCap,
    sizeCapBytes,
  });

  const githubSnapshot: Snapshot = {
    ...snapshot,
    sha,
    source: "github",
    limitedAnalysis: snapshot.limitedAnalysis,
    dispose: async () => {
      await rm(tempRoot, { recursive: true, force: true });
    },
  };

  return githubSnapshot;
}

export async function createSnapshot(input: string, options: SnapshotOptions = {}): Promise<Snapshot> {
  if (/^https?:\/\//i.test(input)) {
    return createSnapshotFromGitHub(input, options);
  }
  return createSnapshotFromLocal(input, options);
}
