import { createHash } from "node:crypto";

export interface ReportCacheIdentity {
  owner: string;
  repo: string;
  sha: string;
  engineVersion: string;
  rubricVersion: string;
  promptVersion: string;
}

export interface ReportCacheEntry {
  report: unknown;
  slug: string;
  createdAt?: number;
}

export function reportCacheKey(input: ReportCacheIdentity): string {
  const canonical = [
    input.owner.toLowerCase(),
    input.repo.toLowerCase(),
    input.sha.toLowerCase(),
    input.engineVersion,
    input.rubricVersion,
    input.promptVersion,
  ].join("\u0000");
  return createHash("sha256").update(canonical).digest("hex");
}
