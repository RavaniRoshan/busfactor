import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as tar from "tar";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SnapshotError,
  createSnapshotFromGitHub,
  createSnapshotFromLocal,
} from "./snapshot.js";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

describe("snapshot ingestion", () => {
  it("creates a normal local snapshot", async () => {
    const root = makeTempDir("busfactor-normal-");
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "demo" }));
    writeFileSync(path.join(root, "src", "index.ts"), "export const value = 1;\n");

    const snapshot = await createSnapshotFromLocal(root);
    expect(snapshot.source).toBe("local");
    expect(snapshot.stack).toBe("ts");
    expect(snapshot.limitedAnalysis).toBe(false);
    expect(snapshot.files.map((file) => file.path)).toContain("src/index.ts");
    expect(await snapshot.readFile("src/index.ts")).toContain("value");
  });

  it("throws a clean error when the file cap is exceeded", async () => {
    const root = makeTempDir("busfactor-cap-");
    writeFileSync(path.join(root, "a.txt"), "a");
    writeFileSync(path.join(root, "b.txt"), "b");
    writeFileSync(path.join(root, "c.txt"), "c");

    await expect(createSnapshotFromLocal(root, { fileCap: 2 })).rejects.toMatchObject({
      code: "file_cap_exceeded",
    });
  });

  it("throws a clean error when a symlink escapes the repository", async () => {
    const root = makeTempDir("busfactor-symlink-");
    writeFileSync(path.join(root, "safe.txt"), "safe");
    symlinkSync("/etc/hostname", path.join(root, "escape.txt"));

    await expect(createSnapshotFromLocal(root)).rejects.toBeInstanceOf(SnapshotError);
    await expect(createSnapshotFromLocal(root)).rejects.toMatchObject({ code: "symlink_escape" });
  });

  it("handles a binary-heavy repository without crashing", async () => {
    const root = makeTempDir("busfactor-binary-");
    writeFileSync(path.join(root, "image.png"), Buffer.from([137, 80, 78, 71]));
    writeFileSync(path.join(root, "README.md"), "# binary heavy\n");

    const snapshot = await createSnapshotFromLocal(root);
    expect(snapshot.files.some((file) => file.binary)).toBe(true);
    await expect(snapshot.readFile("image.png")).rejects.toMatchObject({ code: "binary_file" });
  });

  it("marks an unsupported stack as limited analysis", async () => {
    const root = makeTempDir("busfactor-unsupported-");
    writeFileSync(path.join(root, "notes.txt"), "no code here\n");

    const snapshot = await createSnapshotFromLocal(root);
    expect(snapshot.stack).toBe("unsupported");
    expect(snapshot.limitedAnalysis).toBe(true);
  });

  it("ingests a mocked GitHub repository and pins its SHA", async () => {
    const repoRoot = makeTempDir("busfactor-github-repo-");
    mkdirSync(path.join(repoRoot, "src"), { recursive: true });
    writeFileSync(path.join(repoRoot, "package.json"), JSON.stringify({ name: "github-demo" }));
    writeFileSync(path.join(repoRoot, "src", "index.ts"), "export const github = true;\n");

    const sha = "0123456789abcdef0123456789abcdef01234567";
    const parent = path.dirname(repoRoot);
    const archiveName = "owner-repo-0123456789abcdef0123456789abcdef01234567";
    const tarballDir = makeTempDir("busfactor-tarball-");
    const tarballPath = path.join(tarballDir, "repo.tar.gz");
    await tar.c({ gzip: true, file: tarballPath, cwd: parent }, [path.basename(repoRoot)]);
    // Rename the extracted top-level directory by archiving under the expected GitHub name.
    const githubParent = makeTempDir("busfactor-github-parent-");
    const githubRoot = path.join(githubParent, archiveName);
    mkdirSync(githubRoot, { recursive: true });
    writeFileSync(path.join(githubRoot, "package.json"), JSON.stringify({ name: "github-demo" }));
    mkdirSync(path.join(githubRoot, "src"), { recursive: true });
    writeFileSync(path.join(githubRoot, "src", "index.ts"), "export const github = true;\n");
    const githubTarball = path.join(tarballDir, "github.tar.gz");
    await tar.c({ gzip: true, file: githubTarball, cwd: githubParent }, [archiveName]);
    const tarballBuffer = (await import("node:fs/promises")).readFile(githubTarball);

    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.includes("/commits")) {
        return new Response(JSON.stringify({ sha }), { status: 200 });
      }
      return new Response(await tarballBuffer, { status: 200 });
    });

    const snapshot = await createSnapshotFromGitHub("https://github.com/owner/repo", {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(snapshot.source).toBe("github");
    expect(snapshot.sha).toBe(sha);
    expect(snapshot.files.map((file) => file.path)).toContain("src/index.ts");
    await snapshot.dispose?.();
  });
});
