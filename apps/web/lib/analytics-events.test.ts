import { beforeEach, describe, expect, it } from "vitest";
import { __resetAnalyticsEventsForTests, analyticsStore } from "./analytics-events";
import type { NormalizedAnalyticsEvent } from "./analytics-schema";

function event(overrides: Partial<NormalizedAnalyticsEvent> = {}): NormalizedAnalyticsEvent {
  return {
    event: "scan_page_viewed",
    surface: "product",
    distinctId: "visitor-12345678",
    sessionId: "session-12345678",
    properties: {},
    ...overrides,
  };
}

beforeEach(() => {
  __resetAnalyticsEventsForTests();
  delete process.env.DATABASE_URL;
  delete process.env.NEON_DATABASE_URL;
  delete process.env.POSTGRES_URL;
});

describe("first-party analytics store", () => {
  it("counts marketing and product events separately by surface", async () => {
    await analyticsStore.record(event({ event: "landing_viewed", surface: "marketing", properties: { campaign: "beta" } }));
    await analyticsStore.record(event({ event: "landing_viewed", surface: "marketing", distinctId: "visitor-87654321", properties: { campaign: "beta" } }));
    await analyticsStore.record(event({ event: "scanner_cta_clicked", surface: "marketing" }));
    await analyticsStore.record(event({ event: "scan_page_viewed", surface: "product" }));
    await analyticsStore.record(event({ event: "report_viewed", surface: "product" }));

    const summary = await analyticsStore.summary(30);
    expect(summary.available).toBe(true);
    expect(summary.visitors).toBe(2);
    expect(summary.landingVisitors).toBe(2);
    expect(summary.scannerCtaClicks).toBe(1);
    expect(summary.scanPageViews).toBe(1);
    expect(summary.reportViews).toBe(1);
    expect(summary.campaigns).toEqual([{ campaign: "beta", visitors: 2 }]);
  });

  it("counts a qualified scan only when engagement follows the scan", async () => {
    await analyticsStore.record(event({ event: "scan_succeeded" }));
    await analyticsStore.record(event({ event: "report_downloaded" }));
    await analyticsStore.record(
      event({ event: "scan_succeeded", distinctId: "visitor-99999999" })
    );

    const summary = await analyticsStore.summary(7);
    expect(summary.qualifiedScans7d).toBe(1);
  });

  it("lists recent anonymous visitors and can delete one visitor", async () => {
    await analyticsStore.record(event({ event: "scan_succeeded" }));
    await analyticsStore.record(event({ event: "report_viewed" }));

    const summary = await analyticsStore.summary(30);
    expect(summary.recentVisitors[0]?.distinctId).toBe("visitor-12345678");
    expect(summary.recentVisitors[0]?.events).toBe(2);
    expect(summary.recentVisitors[0]?.scans).toBe(1);

    expect(await analyticsStore.deleteByDistinctId("visitor-12345678")).toBe(2);
    expect((await analyticsStore.summary(30)).recentVisitors).toHaveLength(0);
  });
});
