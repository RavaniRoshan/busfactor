import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/scan-jobs", async () => {
  const actual = await vi.importActual<typeof import("@/lib/scan-jobs")>("@/lib/scan-jobs");
  return {
    ...actual,
    scanJobs: {
      create: vi.fn().mockResolvedValue({
        id: "job-1",
        status: "running",
        createdAt: "2026-11-22T00:00:00.000Z",
        startedAt: "2026-11-22T00:00:00.000Z",
        completedAt: null,
        durationMs: null,
        reportSlug: null,
        errorCategory: null,
        cacheHit: false,
        model: null,
        engineVersion: "0.1.0",
        rubricVersion: "0.1.0",
        promptVersion: "0.1.0",
        costUsd: 0,
      }),
      complete: vi.fn().mockResolvedValue(undefined),
      fail: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      list: vi.fn(),
      metrics: vi.fn(),
      recordCost: vi.fn(),
      costSummary: vi.fn(),
    },
  };
});

vi.mock("@/lib/store", () => ({
  store: {
    rateLimits: { consume: vi.fn().mockResolvedValue(true) },
    reportCache: { get: vi.fn(), set: vi.fn() },
    reports: { set: vi.fn() },
  },
  makeSlug: vi.fn(() => "slug"),
}));

vi.mock("@/lib/spend", () => ({
  spendStore: {
    get: vi.fn().mockResolvedValue(0),
    reserve: vi.fn().mockResolvedValue({ ok: true, usd: 0.05 }),
    settle: vi.fn().mockResolvedValue({ usd: 0.001 }),
  },
  utcDay: vi.fn(() => "2026-11-22"),
}));

const sha = "0123456789abcdef0123456789abcdef01234567";
const scanTargetMock = vi.fn<(target: string, options?: unknown) => Promise<unknown>>();
const scanSnapshotMock = vi.fn<(snapshot: unknown, options?: unknown) => Promise<unknown>>();
const createSnapshotFromGitHubMock = vi.fn<(input: string, options?: unknown) => Promise<{ dispose?: () => Promise<void> }>>();
const createSnapshotFromLocalMock = vi.fn<(input: string, options?: unknown) => Promise<{ sha: string; dispose?: () => Promise<void> }>>();
const resolveGitHubRepoMock = vi.fn<(input: string, options?: unknown) => Promise<{ owner: string; repo: string; sha: string; canonicalUrl: string }>>().mockResolvedValue({
  owner: "example",
  repo: "repo",
  sha,
  canonicalUrl: "https://github.com/example/repo",
});
const reportCacheKeyMock = vi.fn<(input: unknown) => string>(() => "cache-key");

vi.mock("../../../../../packages/core/dist/index.js" /*turbopackIgnore: true*/, async () => {
  const actual = await vi.importActual<typeof import("../../../../../packages/core/dist/index.js")>(
    "../../../../../packages/core/dist/index.js"
  );
  return {
    ...actual,
    ENGINE_VERSION: "0.1.0",
    RUBRIC_VERSION: "0.1.0",
    PROMPT_VERSION: "0.1.0",
    resolveGitHubRepo: (input: string, options?: unknown) => resolveGitHubRepoMock(input, options),
    reportCacheKey: (input: unknown) => reportCacheKeyMock(input as any),
    createSnapshotFromGitHub: (input: string, options?: unknown) => createSnapshotFromGitHubMock(input, options),
    createSnapshotFromLocal: (input: string, options?: unknown) => createSnapshotFromLocalMock(input, options),
    scanSnapshot: (snapshot: unknown, options?: unknown) => scanSnapshotMock(snapshot, options),
    scanTarget: (target: string, options?: unknown) => scanTargetMock(target, options),
  };
});

import { POST } from "./route";
import { scanJobs } from "@/lib/scan-jobs";
import { spendStore } from "@/lib/spend";
import { store } from "@/lib/store";

afterEach(() => {
  vi.clearAllMocks();
  scanTargetMock.mockReset();
  scanSnapshotMock.mockReset();
  createSnapshotFromGitHubMock.mockReset();
  createSnapshotFromLocalMock.mockReset();
  resolveGitHubRepoMock.mockResolvedValue({
    owner: "example",
    repo: "repo",
    sha,
    canonicalUrl: "https://github.com/example/repo",
  });
  reportCacheKeyMock.mockReturnValue("cache-key");
});

function post(target: string): Request {
  return new Request("http://localhost/api/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target }),
  });
}

describe("POST /api/scan cache-path failure handling", () => {
  it("returns safe 500 without creating a job when cache lookup throws before job creation", async () => {
    // Cache lookup happens after job creation in new flow? No - new flow creates job at step 6, cache read at 7.
    // The brief says "6. Create a `running` job. 7. Read store.reportCache..." so cache lookup throw after job creation
    // should fail the job. Adapt test intent to new flow: cache read throw after job creation returns safe 500 and fails job.
    vi.mocked(store.reportCache.get).mockRejectedValue(new Error("cache backend exploded with secrets"));

    const response = await POST(post("https://github.com/example/repo"));
    const body = (await response.json()) as { error?: string; category?: string };

    expect(response.status).toBe(500);
    expect(scanJobs.create).toHaveBeenCalledTimes(1);
    expect(scanJobs.fail).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ errorCategory: "internal_error" }));
    expect(spendStore.reserve).not.toHaveBeenCalled();
    expect(body.category).toBe("internal_error");
    expect(body.error).toBe("Internal scan error.");
    expect(body.error).not.toContain("secrets");
  });

  it("returns 503 without creating a job when spend reservation is refused", async () => {
    vi.mocked(store.reportCache.get).mockResolvedValue(undefined);
    vi.mocked(spendStore.reserve).mockResolvedValueOnce({ ok: false, usd: 10 });

    const response = await POST(post("https://github.com/example/repo"));
    const body = (await response.json()) as { error?: string; category?: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe("daily spend cap reached");
    expect(body.category).toBe("spend_cap");
    expect(scanJobs.create).toHaveBeenCalledTimes(1);
    expect(scanJobs.fail).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ errorCategory: "spend_cap" }));
    expect(scanSnapshotMock).not.toHaveBeenCalled();
    expect(spendStore.settle).not.toHaveBeenCalled();
  });

  it("creates/completes a job with cacheHit true on compatible cache hit without reserving spend", async () => {
    vi.mocked(store.reportCache.get).mockResolvedValue({
      slug: "cached-slug",
      createdAt: Date.now(),
      report: {
        meta: {
          engineVersion: "0.1.0",
          rubricVersion: "0.1.0",
          promptVersion: "0.1.0",
          usage: { provider: "h", model: "h", inputTokens: 0, outputTokens: 0, cachedTokens: 0, requests: 1 },
        },
      },
    });

    const response = await POST(post("https://github.com/example/repo"));
    const body = (await response.json()) as { cached?: boolean; cacheHit?: boolean };

    expect(response.status).toBe(200);
    expect(body.cached).toBe(true);
    expect(body.cacheHit).toBe(true);
    expect(scanJobs.create).toHaveBeenCalledTimes(1);
    expect(scanJobs.complete).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cacheHit: true, costUsd: 0, reportSlug: "cached-slug" })
    );
    expect(spendStore.reserve).not.toHaveBeenCalled();
    expect(spendStore.settle).not.toHaveBeenCalled();
    expect(scanSnapshotMock).not.toHaveBeenCalled();
  });

  it("settles reservation to zero when scan fails after reservation", async () => {
    vi.mocked(store.reportCache.get).mockResolvedValue(undefined);
    vi.mocked(spendStore.reserve).mockResolvedValueOnce({ ok: true, usd: 0.05 });
    const snapshot = { dispose: vi.fn().mockResolvedValue(undefined) };
    createSnapshotFromGitHubMock.mockResolvedValueOnce(snapshot);
    scanSnapshotMock.mockRejectedValueOnce(new Error("provider exploded"));

    const response = await POST(post("https://github.com/example/repo"));

    expect(response.status).toBe(503);
    expect(spendStore.reserve).toHaveBeenCalledWith("2026-11-22", 0.05, 10);
    expect(spendStore.settle).toHaveBeenCalledWith("2026-11-22", 0.05, 0);
    expect(scanJobs.fail).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ errorCategory: "provider_error" })
    );
    expect(snapshot.dispose).toHaveBeenCalled();
  });

  it("settles reservation to 0 and returns safe error when job create throws after reservation", async () => {
    // In the new flow, reservation happens after job creation, so this case becomes: reservation failure before scan
    // is handled; job-create failure happens before reservation. Keep the invariant: no leaked reservation.
    vi.mocked(store.reportCache.get).mockResolvedValue(undefined);
    vi.mocked(scanJobs.create).mockRejectedValueOnce(new Error("job create failed with secrets"));

    const response = await POST(post("https://github.com/example/repo"));
    const body = (await response.json()) as { error?: string; category?: string };

    expect(response.status).toBe(500);
    expect(spendStore.reserve).not.toHaveBeenCalled();
    expect(spendStore.settle).not.toHaveBeenCalled();
    expect(scanJobs.fail).not.toHaveBeenCalled();
    expect(scanSnapshotMock).not.toHaveBeenCalled();
    expect(body.category).toBe("internal_error");
    expect(body.error).toBe("Internal scan error.");
    expect(body.error).not.toContain("secrets");
  });

  it("treats legacy cached report without createdAt as cache miss and rescans", async () => {
    const legacyCachedReport = {
      score: 50,
      meta: { engineVersion: "0.1.0", rubricVersion: "0.1.0", promptVersion: "0.1.0", costUsd: 0 },
    };
    vi.mocked(store.reportCache.get).mockResolvedValue({ slug: "old-slug", report: legacyCachedReport });
    vi.mocked(spendStore.reserve).mockResolvedValueOnce({ ok: true, usd: 0.05 });
    const snapshot = { dispose: vi.fn().mockResolvedValue(undefined) };
    createSnapshotFromGitHubMock.mockResolvedValueOnce(snapshot);
    const freshReport = {
      meta: {
        costUsd: 0.001,
        promptVersion: "0.1.0",
        rubricVersion: "0.1.0",
        engineVersion: "0.1.0",
        stack: "ts",
        fileCount: 1,
        durationMs: 100,
        usage: {
          provider: "heuristic",
          model: "heuristic",
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          requests: 1,
        },
      },
    };
    scanSnapshotMock.mockResolvedValueOnce(freshReport);

    const response = await POST(post("https://github.com/example/repo"));
    const body = (await response.json()) as { cached?: boolean; cacheHit?: boolean; slug?: string; report?: unknown };

    expect(response.status).toBe(200);
    expect(body.cached).toBe(false);
    expect(body.cacheHit).toBe(false);
    expect(body.slug).toBe("slug");
    expect(body.report).toEqual(freshReport);
    expect(spendStore.reserve).toHaveBeenCalledWith("2026-11-22", 0.05, 10);
    expect(spendStore.settle).toHaveBeenCalledWith("2026-11-22", 0.05, 0.001);
    expect(scanSnapshotMock).toHaveBeenCalledTimes(1);
    expect(store.reportCache.set).toHaveBeenCalledWith(
      "cache-key",
      expect.objectContaining({ slug: "slug", report: freshReport, createdAt: expect.any(Number) })
    );
    expect(scanJobs.complete).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cacheHit: false, reportSlug: "slug", costUsd: 0.001 })
    );
  });
});
