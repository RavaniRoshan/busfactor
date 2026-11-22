import { describe, expect, it } from "vitest";
import { buildDashboardMetrics, dashboardRange } from "./metrics";

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

it("accepts only 7, 30 or 90 days", () => {
  expect(dashboardRange({ days: "7" })).toBe(7);
  expect(dashboardRange({ days: "365" })).toBe(30);
  expect(dashboardRange({})).toBe(30);
});
