import { afterEach, describe, expect, it, vi } from "vitest";
import { getAnalyticsSummary, unavailableAnalytics } from "./posthog";

const originalFetch = globalThis.fetch;
const originalKey = process.env.POSTHOG_PERSONAL_API_KEY;
const originalProject = process.env.POSTHOG_PROJECT_ID;
const originalHost = process.env.POSTHOG_API_HOST;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.POSTHOG_PERSONAL_API_KEY;
  else process.env.POSTHOG_PERSONAL_API_KEY = originalKey;
  if (originalProject === undefined) delete process.env.POSTHOG_PROJECT_ID;
  else process.env.POSTHOG_PROJECT_ID = originalProject;
  if (originalHost === undefined) delete process.env.POSTHOG_API_HOST;
  else process.env.POSTHOG_API_HOST = originalHost;
  vi.restoreAllMocks();
});

describe("posthog analytics", () => {
  it("returns unavailable shape when env is absent without calling fetch", async () => {
    delete process.env.POSTHOG_PERSONAL_API_KEY;
    delete process.env.POSTHOG_PROJECT_ID;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const summary = await getAnalyticsSummary(30);
    expect(summary).toEqual(unavailableAnalytics());
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns unavailable shape on non-ok response", async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    process.env.POSTHOG_PROJECT_ID = "123";
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("bad", { status: 401 })) as unknown as typeof fetch;

    const summary = await getAnalyticsSummary(30);
    expect(summary.available).toBe(false);
    expect(summary.visitors).toBeNull();
  });

  it("returns unavailable for invalid days without calling fetch", async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    process.env.POSTHOG_PROJECT_ID = "123";
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const summary = await getAnalyticsSummary(14);
    expect(summary.available).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns unavailable on malformed json/body", async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    process.env.POSTHOG_PROJECT_ID = "123";
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("not-json", { status: 200 })) as unknown as typeof fetch;
    expect((await getAnalyticsSummary(30)).available).toBe(false);

    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ results: "bad" }), { status: 200 })) as unknown as typeof fetch;
    expect((await getAnalyticsSummary(30)).available).toBe(false);
  });

  it("returns unavailable on fetch rejection/timeout", async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    process.env.POSTHOG_PROJECT_ID = "123";
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("timeout")) as unknown as typeof fetch;

    const summary = await getAnalyticsSummary(30);
    expect(summary.available).toBe(false);
  });

  it("parses a successful summary response", async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    process.env.POSTHOG_PROJECT_ID = "123";
    process.env.POSTHOG_API_HOST = "https://us.posthog.com";

    const responses = [
      { results: [[100, 80, 12, 40, 20, 5, 3, 2]] },
      { results: [["launch", 50]] },
      { results: [["google", 30]] },
      { results: [[7]] },
    ];
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(responses.shift() ?? { results: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const summary = await getAnalyticsSummary(30);
    expect(summary.available).toBe(true);
    expect(summary.visitors).toBe(100);
    expect(summary.landingVisitors).toBe(80);
    expect(summary.scannerCtaClicks).toBe(12);
    expect(summary.scanPageViews).toBe(40);
    expect(summary.reportViews).toBe(20);
    expect(summary.reportDownloads).toBe(5);
    expect(summary.reportsShared).toBe(3);
    expect(summary.feedbackSubmitted).toBe(2);
    expect(summary.breakdownsAvailable).toBe(true);
    expect(summary.campaigns).toEqual([{ campaign: "launch", visitors: 50 }]);
    expect(summary.sources).toEqual([{ source: "google", visitors: 30 }]);
    expect(summary.qualifiedScans7d).toBe(7);
    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://us.posthog.com/api/projects/123/query/");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer phx_test");
  });

  it("scopes HogQL queries by analytics surface", async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    process.env.POSTHOG_PROJECT_ID = "123";

    const responses = [
      { results: [[100, 80, 12, 40, 20, 5, 3, 2]] },
      { results: [["launch", 50]] },
      { results: [["google", 30]] },
      { results: [[7]] },
    ];
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(responses.shift() ?? { results: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const summary = await getAnalyticsSummary(30);
    expect(summary.available).toBe(true);

    const queries = fetchMock.mock.calls.map((call) => {
      const init = call[1] as RequestInit;
      return (JSON.parse(String(init.body)) as { query: { query: string } }).query.query;
    });

    expect(queries).toHaveLength(4);
    const [summaryQuery, campaignQuery, sourceQuery, qualifiedQuery] = queries;

    expect(summaryQuery).toContain("event = 'landing_viewed' AND properties.surface = 'marketing'");
    expect(summaryQuery).toContain(
      "countIf(event = 'scanner_cta_clicked' AND properties.surface = 'marketing')"
    );
    expect(summaryQuery).toContain(
      "countIf(event = 'scan_page_viewed' AND properties.surface = 'product')"
    );
    expect(summaryQuery).toContain(
      "countIf(event = 'report_viewed' AND properties.surface = 'product')"
    );
    expect(summaryQuery).toContain(
      "countIf(event = 'report_downloaded' AND properties.surface = 'product')"
    );
    expect(summaryQuery).toContain(
      "countIf(event = 'report_shared' AND properties.surface = 'product')"
    );
    expect(summaryQuery).toContain(
      "countIf(event = 'feedback_submitted' AND properties.surface = 'product')"
    );

    expect(campaignQuery).toContain("event = 'landing_viewed'");
    expect(campaignQuery).toContain("properties.surface = 'marketing'");
    expect(sourceQuery).toContain("event = 'landing_viewed'");
    expect(sourceQuery).toContain("properties.surface = 'marketing'");

    expect(qualifiedQuery).toContain("event = 'scan_succeeded'");
    expect(qualifiedQuery).toContain("properties.surface = 'product'");
    expect(qualifiedQuery).toContain(
      "event IN ('report_downloaded', 'report_shared', 'feedback_submitted')"
    );
    expect(qualifiedQuery.match(/properties\.surface = 'product'/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("marks breakdowns unavailable when campaign/source queries fail but summary succeeds", async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    process.env.POSTHOG_PROJECT_ID = "123";

    const responses = [
      new Response(JSON.stringify({ results: [[10, 8, 1, 3, 2, 1, 0, 1]] }), { status: 200 }),
      new Response("bad", { status: 500 }),
      new Response(JSON.stringify({ results: [["google", 2]] }), { status: 200 }),
      new Response(JSON.stringify({ results: [[1]] }), { status: 200 }),
    ];
    globalThis.fetch = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()!)) as unknown as typeof fetch;

    const summary = await getAnalyticsSummary(30);
    expect(summary.available).toBe(true);
    expect(summary.visitors).toBe(10);
    expect(summary.breakdownsAvailable).toBe(false);
    expect(summary.campaigns).toEqual([]);
    expect(summary.sources).toEqual([]);
  });

  it("keeps summary available when qualified query fails", async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    process.env.POSTHOG_PROJECT_ID = "123";

    const responses = [
      new Response(JSON.stringify({ results: [[10, 8, 1, 3, 2, 1, 0, 1]] }), { status: 200 }),
      new Response(JSON.stringify({ results: [["launch", 3]] }), { status: 200 }),
      new Response(JSON.stringify({ results: [["google", 2]] }), { status: 200 }),
      new Response("bad", { status: 500 }),
    ];
    globalThis.fetch = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()!)) as unknown as typeof fetch;

    const summary = await getAnalyticsSummary(30);
    expect(summary.available).toBe(true);
    expect(summary.breakdownsAvailable).toBe(true);
    expect(summary.qualifiedScans7d).toBeNull();
  });
});
