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
    reportCache: { get: vi.fn() },
    reports: { set: vi.fn() },
  },
  makeSlug: vi.fn(() => "slug"),
}));

import { POST } from "./route";
import { scanJobs } from "@/lib/scan-jobs";
import { store } from "@/lib/store";

afterEach(() => {
  vi.clearAllMocks();
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
});
