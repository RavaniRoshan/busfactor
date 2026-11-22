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
    spend: { get: vi.fn().mockResolvedValue({ usd: 0 }), add: vi.fn() },
    reportCache: { get: vi.fn(), set: vi.fn() },
    reports: { set: vi.fn() },
  },
  makeSlug: vi.fn(() => "slug"),
}));

const scanTargetMock = vi.fn();
vi.mock("../../../../../packages/core/dist/index.js" /*turbopackIgnore: true*/, () => ({
  scanTarget: (...args: unknown[]) => scanTargetMock(...args),
}));

import { POST } from "./route";
import { scanJobs } from "@/lib/scan-jobs";
import { store } from "@/lib/store";

afterEach(() => {
  vi.clearAllMocks();
  scanTargetMock.mockReset();
});

describe("POST /api/scan cache-path failure handling", () => {
  it("marks job failed with safe category when cache lookup throws after job creation", async () => {
    vi.mocked(store.reportCache.get).mockRejectedValue(new Error("cache backend exploded with secrets"));

    const request = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target: "https://github.com/example/repo" }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error?: string; category?: string };

    expect(response.status).toBe(500);
    expect(scanJobs.create).toHaveBeenCalledTimes(1);
    expect(scanJobs.fail).toHaveBeenCalledTimes(1);
    expect(scanJobs.fail).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ errorCategory: "internal_error" })
    );
    expect(body.category).toBe("internal_error");
    expect(body.error).toBe("Internal scan error.");
    expect(body.error).not.toContain("secrets");
  });

  it("treats legacy cached report without promptVersion/usage as cache miss and rescans", async () => {
    const legacyCachedReport = {
      score: 50,
      meta: { engineVersion: "0.1.0", rubricVersion: "0.1.0", costUsd: 0 },
    };
    vi.mocked(store.reportCache.get).mockResolvedValue({ slug: "old-slug", report: legacyCachedReport });
    const freshReport = {
      meta: {
        costUsd: 0,
        promptVersion: "0.1.0",
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
    scanTargetMock.mockResolvedValue({ snapshot: {}, report: freshReport });

    const request = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target: "https://github.com/example/repo" }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { cached?: boolean; slug?: string; report?: unknown };

    expect(response.status).toBe(200);
    expect(body.cached).toBeUndefined();
    expect(body.slug).toBe("slug");
    expect(body.report).toEqual(freshReport);
    expect(scanTargetMock).toHaveBeenCalledTimes(1);
    expect(store.reportCache.set).toHaveBeenCalledWith(
      "https://github.com/example/repo",
      expect.objectContaining({ slug: "slug", report: freshReport })
    );
    expect(scanJobs.complete).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cacheHit: false, reportSlug: "slug" })
    );
  });
});
