import { describe, expect, it } from "vitest";
import { SnapshotError } from "../../../packages/core/src/snapshot.js";
import { categorizeScanError, computeJobMetrics, scanJobs } from "./scan-jobs";

const base = {
  createdAt: "2026-11-22T00:00:00.000Z",
  startedAt: "2026-11-22T00:00:00.000Z",
  completedAt: "2026-11-22T00:00:01.000Z",
  reportSlug: null,
  errorCategory: null,
  cacheHit: false,
  model: null,
  engineVersion: "0.1.0",
  rubricVersion: "0.1.0",
  promptVersion: "0.1.0",
  costUsd: 0,
} as const;

describe("scan jobs", () => {
  it("persists a running job, then a completed job", async () => {
    const id = `job-${Date.now()}`;
    await scanJobs.create({ id, engineVersion: "0.1.0", rubricVersion: "0.1.0", promptVersion: "0.1.0" });
    expect((await scanJobs.get(id))?.status).toBe("running");
    await scanJobs.complete(id, {
      reportSlug: "abc123",
      durationMs: 42000,
      cacheHit: false,
      costUsd: 0.001,
      model: "openai/gpt-oss-20b",
      engineVersion: "0.1.0",
      rubricVersion: "0.1.0",
      promptVersion: "0.1.0",
    });
    expect(await scanJobs.get(id)).toMatchObject({ status: "complete", reportSlug: "abc123", durationMs: 42000 });
  });

  it("persists a failed job with a safe category", async () => {
    const id = `job-${Date.now()}-fail`;
    await scanJobs.create({ id, engineVersion: "0.1.0", rubricVersion: "0.1.0", promptVersion: "0.1.0" });
    await scanJobs.fail(id, { errorCategory: "provider_error", durationMs: 12000 });
    expect(await scanJobs.get(id)).toMatchObject({ status: "failed", errorCategory: "provider_error" });
  });

  it("computes median, p95 and fail rate", () => {
    const jobs = [1000, 2000, 3000, 4000].map((durationMs, index) => ({
      ...base,
      id: `j${index}`,
      status: index === 3 ? ("failed" as const) : ("complete" as const),
      durationMs,
    }));
    expect(computeJobMetrics(jobs)).toMatchObject({
      total: 4,
      failed: 1,
      failRate: 25,
      medianDurationMs: 2500,
      p95DurationMs: 4000,
    });
  });

  it("includes failed job durations in percentile calculations", () => {
    const jobs = [1000, 2000, 3000, 4000].map((durationMs, index) => ({
      ...base,
      id: `jf${index}`,
      status: index === 3 ? ("failed" as const) : ("complete" as const),
      durationMs,
    }));
    const metrics = computeJobMetrics(jobs);
    expect(metrics.medianDurationMs).toBe(2500);
    expect(metrics.p95DurationMs).toBe(4000);
  });

  it("categorizes GitHub fetch failures by intent", () => {
    expect(categorizeScanError(new SnapshotError("github_commit_lookup_failed", "x"))).toBe("repo_not_found");
    expect(categorizeScanError(new SnapshotError("github_tarball_not_found", "x"))).toBe("repo_not_found");
    expect(categorizeScanError(new SnapshotError("github_rate_limited", "x"))).toBe("provider_rate_limited");
    expect(categorizeScanError(new SnapshotError("github_unavailable", "x"))).toBe("provider_error");
    expect(categorizeScanError(Object.assign(new TypeError("fetch failed"), { code: "ECONNRESET" }))).toBe("provider_error");
  });
});
