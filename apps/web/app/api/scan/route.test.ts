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

const scanTargetMock = vi.fn();
vi.mock("../../../../../packages/core/dist/index.js" /*turbopackIgnore: true*/, () => ({
  scanTarget: (...args: unknown[]) => scanTargetMock(...args),
}));

import { POST } from "./route";
import { scanJobs } from "@/lib/scan-jobs";
import { spendStore } from "@/lib/spend";
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

  it("returns 503 and fails job when spend reservation is refused", async () => {
    vi.mocked(store.reportCache.get).mockResolvedValue(undefined);
    vi.mocked(spendStore.reserve).mockResolvedValueOnce({ ok: false, usd: 10 });
    const request = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target: "https://github.com/example/repo" }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe("daily spend cap reached");
    expect(scanJobs.create).toHaveBeenCalledTimes(1);
    expect(scanJobs.fail).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ errorCategory: "spend_cap" })
    );
    expect(scanTargetMock).not.toHaveBeenCalled();
    expect(spendStore.settle).not.toHaveBeenCalled();
  });

  it("does not reserve spend on compatible cache hit", async () => {
    vi.mocked(store.reportCache.get).mockResolvedValue({
      slug: "cached-slug",
      report: { meta: { promptVersion: "0.1.0", usage: { provider: "h", model: "h", inputTokens: 0, outputTokens: 0, cachedTokens: 0, requests: 1 } } },
    });

    const request = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target: "https://github.com/example/repo" }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { cached?: boolean };

    expect(response.status).toBe(200);
    expect(body.cached).toBe(true);
    expect(spendStore.reserve).not.toHaveBeenCalled();
    expect(spendStore.settle).not.toHaveBeenCalled();
    expect(scanTargetMock).not.toHaveBeenCalled();
  });

  it("settles reservation to zero when scan fails after reservation", async () => {
    vi.mocked(store.reportCache.get).mockResolvedValue(undefined);
    vi.mocked(spendStore.reserve).mockResolvedValueOnce({ ok: true, usd: 0.05 });
    scanTargetMock.mockRejectedValueOnce(new Error("provider exploded"));

    const request = new Request("http://localhost/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target: "https://github.com/example/repo" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(spendStore.reserve).toHaveBeenCalledWith("2026-11-22", 0.05, 10);
    expect(spendStore.settle).toHaveBeenCalledWith("2026-11-22", 0.05, 0);
    expect(scanJobs.fail).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ errorCategory: "provider_error" })
    );
  });

  it("treats legacy cached report without promptVersion/usage as cache miss and rescans", async () => {
    const legacyCachedReport = {
      score: 50,
      meta: { engineVersion: "0.1.0", rubricVersion: "0.1.0", costUsd: 0 },
    };
    vi.mocked(store.reportCache.get).mockResolvedValue({ slug: "old-slug", report: legacyCachedReport });
    const freshReport = {
      meta: {
        costUsd: 0.001,
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
    expect(spendStore.reserve).toHaveBeenCalledWith("2026-11-22", 0.05, 10);
    expect(spendStore.settle).toHaveBeenCalledWith("2026-11-22", 0.05, 0.001);
    expect(scanTargetMock).toHaveBeenCalledTimes(1);
    expect(store.reportCache.set).toHaveBeenCalledWith(
      "https://github.com/example/repo",
      expect.objectContaining({ slug: "slug", report: freshReport })
    );
    expect(scanJobs.complete).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cacheHit: false, reportSlug: "slug", costUsd: 0.001 })
    );
  });
});
