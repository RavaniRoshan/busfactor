import path from "node:path";

import type { SnapshotFile, Stack } from "./types.js";

const JAVASCRIPT_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs"]);
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const PYTHON_EXTENSIONS = new Set([".py"]);

export function languageForPath(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (TYPESCRIPT_EXTENSIONS.has(extension)) return "ts";
  if (JAVASCRIPT_EXTENSIONS.has(extension)) return "js";
  if (PYTHON_EXTENSIONS.has(extension)) return "python";
  if (extension === ".go") return "go";
  if (extension === ".rs") return "rust";
  if (extension === ".java") return "java";
  if (extension === ".rb") return "ruby";
  return "text";
}

export function isBinaryPath(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  return new Set([
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp",
    ".pdf", ".zip", ".tar", ".gz", ".tgz", ".7z", ".rar",
    ".woff", ".woff2", ".ttf", ".otf", ".eot",
    ".mp3", ".mp4", ".mov", ".avi", ".wav",
    ".exe", ".dll", ".so", ".dylib", ".bin",
    ".pyc", ".class", ".o", ".a",
  ]).has(extension);
}

export function detectStack(files: SnapshotFile[]): Stack {
  const names = new Set(files.map((file) => path.basename(file.path)));
  const hasPython =
    names.has("pyproject.toml") ||
    names.has("requirements.txt") ||
    names.has("setup.py") ||
    files.some((file) => file.language === "python");
  const hasJavaScript =
    names.has("package.json") ||
    files.some((file) => file.language === "js" || file.language === "ts");

  if (hasPython && hasJavaScript) return "mixed";
  if (hasPython) return "python";
  if (hasJavaScript) {
    return names.has("tsconfig.json") || files.some((file) => file.language === "ts")
      ? "ts"
      : "js";
  }
  return "unsupported";
}
