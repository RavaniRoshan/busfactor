import { describe, expect, it } from "vitest";
import { buildDashboardMetrics, dashboardRange } from "./metrics";
import type { AnalyticsSummary } from "./metrics";
import type { ScanJob } from "./scan-jobs";

function job(overrides: Partial<ScanJob> = {}): ScanJob {
  return {
    id: "j1",
    status: "complete",
    createdAt: "2026-11-22T00:00:00.000Z",
    startedAt: "2026-11-22T00:00:00.000Z",
    completedAt: "2026-11-22T00:00:10.000Z",
    durationMs: 10_000,
    reportSlug: "r1",
    errorCategory: null,
    cacheHit: false,
    model: "m",
    engineVersion: "0.1.0",
    rubricVersion: "0.1.0",
    promptVersion: "0.1.0",
    costUsd: 0.1,
    ...overrides,
  };
}

function analytics(overrides: Partial<AnalyticsSummary> = {}): AnalyticsSummary {
  return {
    available: true,
    visitors: 100,
    landingVisitors: 50,
    scannerCtaClicks: 10,
    scanPageViews: 20,
    reportViews: 8,
    reportDownloads: 2,
    reportsShared: 1,
    feedbackSubmitted: 3,
    qualifiedScans7d: 4,
    breakdownsAvailable: true,
    campaigns: [{ campaign: "launch", visitors: 30 }],
    sources: [{ source: "google", visitors: 20 }],
    recentVisitors: [],
    ...overrides,
  };
}

describe("dashboardRange", () => {
  it("accepts only 7, 30 or 90 days", () => {
    expect(dashboardRange({ days: "7" })).toBe(7);
    expect(dashboardRange({ days: "30" })).toBe(30);
    expect(dashboardRange({ days: "90" })).toBe(90);
    expect(dashboardRange({ days: "365" })).toBe(30);
    expect(dashboardRange({})).toBe(30);
  });
});

describe("buildDashboardMetrics", () => {
  it("uses only real inputs and returns null/zero for absent data", () => {
    const metrics = buildDashboardMetrics({
      jobs: [],
      costs: { totalUsd: 0, averageUsd: null, medianUsd: null },
      waitlist: 0,
      feedback: { yes: 0, no: 0, answered: 0 },
      reports: 0,
      spendTodayUsd: 0,
      analytics: null,
    });
    expect(metrics.business.totalScans).toBe(0);
    expect(metrics.engagement.positiveFeedbackRate).toBeNull();
    expect(metrics.acquisition.available).toBe(false);
    expect(metrics.operations.medianDurationMs).toBeNull();
    expect(metrics.operations.p95DurationMs).toBeNull();
    expect(metrics.operations.cacheHitRatePct).toBe(0);
    expect(metrics.unitEconomics.costPerSuccessfulScanUsd).toBeNull();
  });

  it("computes positive feedback only from explicit answers", () => {
    const metrics = buildDashboardMetrics({
      jobs: [],
      costs: { totalUsd: 0, averageUsd: null, medianUsd: null },
      waitlist: 0,
      feedback: { yes: 3, no: 1, answered: 4 },
      reports: 0,
      spendTodayUsd: 0,
      analytics: null,
    });
    expect(metrics.engagement.positiveFeedbackRate).toBe(75);
  });

  it("computes rates, cache hit, spend, and cost per successful scan", () => {
    const metrics = buildDashboardMetrics({
      jobs: [
        job({ id: "1", status: "complete", durationMs: 1000, cacheHit: true, costUsd: 0.1 }),
        job({ id: "2", status: "complete", durationMs: 3000, cacheHit: false, costUsd: 0.2 }),
        job({ id: "3", status: "failed", durationMs: 2000, cacheHit: false, errorCategory: "provider_error", costUsd: 0 }),
        job({ id: "4", status: "running", durationMs: null, completedAt: null, reportSlug: null, costUsd: 0 }),
      ],
      costs: { totalUsd: 0.3, averageUsd: 0.1, medianUsd: 0.1 },
      waitlist: 5,
      feedback: { yes: 1, no: 1, answered: 2 },
      reports: 9,
      spendTodayUsd: 2.5,
      spendCapUsd: 10,
      databaseHealth: "ok",
      analytics: null,
    });

    expect(metrics.engagement.completionRatePct).toBe(50);
    expect(metrics.operations.successRatePct).toBe(50);
    expect(metrics.operations.failureRatePct).toBe(25);
    expect(metrics.operations.cacheHitRatePct).toBe(50);
    expect(metrics.operations.providerErrors).toBe(1);
    expect(metrics.operations.spendPct).toBe(25);
    expect(metrics.unitEconomics.costPerSuccessfulScanUsd).toBeCloseTo(0.15);
    expect(metrics.operations.medianDurationMs).toBe(2000);
    expect(metrics.operations.p95DurationMs).toBe(3000);
  });

  it("handles zero denominators safely", () => {
    const metrics = buildDashboardMetrics({
      jobs: [job({ id: "r", status: "running", durationMs: null, completedAt: null })],
      costs: { totalUsd: 0, averageUsd: null, medianUsd: null },
      waitlist: 0,
      feedback: { yes: 0, no: 0, answered: 0 },
      reports: 0,
      spendTodayUsd: 0,
      spendCapUsd: 0,
      analytics: analytics({ landingVisitors: 0, scanPageViews: 5 }),
    });

    expect(metrics.operations.successRatePct).toBe(0);
    expect(metrics.operations.failureRatePct).toBe(0);
    expect(metrics.operations.cacheHitRatePct).toBe(0);
    expect(metrics.operations.spendPct).toBe(0);
    expect(metrics.acquisition.landingConversionPct).toBeNull();
  });

  it("maps analytics availability and null fields without fabricating", () => {
    const metrics = buildDashboardMetrics({
      jobs: [],
      costs: { totalUsd: 0, averageUsd: null, medianUsd: null },
      waitlist: 0,
      feedback: { yes: 0, no: 0, answered: 0 },
      reports: 0,
      spendTodayUsd: 0,
      analytics: analytics({
        visitors: null,
        landingVisitors: null,
        scannerCtaClicks: null,
        scanPageViews: null,
        breakdownsAvailable: false,
        campaigns: [],
        sources: [],
      }),
    });

    expect(metrics.acquisition.available).toBe(true);
    expect(metrics.acquisition.visitors).toBeNull();
    expect(metrics.acquisition.landingVisitors).toBeNull();
    expect(metrics.acquisition.scannerCtaClicks).toBeNull();
    expect(metrics.acquisition.scanPageViews).toBeNull();
    expect(metrics.acquisition.landingConversionPct).toBeNull();
    expect(metrics.acquisition.breakdownsAvailable).toBe(false);
    expect(metrics.acquisition.campaigns).toEqual([]);
    expect(metrics.acquisition.sources).toEqual([]);
  });
});

