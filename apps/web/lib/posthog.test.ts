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

  it("parses a successful summary response", async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    process.env.POSTHOG_PROJECT_ID = "123";
    process.env.POSTHOG_API_HOST = "https://us.posthog.com";

    const responses = [
      {
        results: [[100, 80, 12, 40, 20, 5, 3, 2]],
      },
      {
        results: [["launch", 50]],
      },
      {
        results: [["google", 30]],
      },
      {
        results: [[7]],
      },
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
    expect(summary.campaigns).toEqual([{ campaign: "launch", visitors: 50 }]);
    expect(summary.sources).toEqual([{ source: "google", visitors: 30 }]);
    expect(summary.qualifiedScans7d).toBe(7);
    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://us.posthog.com/api/projects/123/query/");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer phx_test");
  });
});
