import { beforeEach, describe, expect, it } from "vitest";
import { POST, OPTIONS } from "./route";
import { __resetAnalyticsEventsForTests, analyticsStore } from "@/lib/analytics-events";

const ORIGIN = "https://ravaniroshan.github.io";

function request(body: unknown, origin = ORIGIN): Request {
  return new Request("https://app.example/api/events", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  __resetAnalyticsEventsForTests();
});

describe("analytics ingest", () => {
  it("accepts a marketing event from the configured origin", async () => {
    const response = await POST(
      request({
        event: "landing_viewed",
        surface: "marketing",
        distinct_id: "visitor-12345678",
        session_id: "session-12345678",
        properties: { campaign: "beta_launch" },
      })
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");

    const summary = await analyticsStore.summary(30);
    expect(summary.visitors).toBe(1);
    expect(summary.campaigns).toEqual([{ campaign: "beta_launch", visitors: 1 }]);
  });

  it("drops forbidden properties but still accepts the event", async () => {
    const response = await POST(
      request({
        event: "scan_succeeded",
        surface: "product",
        distinct_id: "visitor-12345678",
        properties: {
          target: "https://github.com/acme/private-repo",
          path: "/Users/me/code",
          cache_hit: true,
        },
      })
    );
    expect(response.status).toBe(204);
    const summary = await analyticsStore.summary(30);
    expect(summary.recentVisitors[0]?.events).toBe(1);
  });

  it("rejects invalid events and answers preflight for any origin", async () => {
    expect(
      (
        await POST(
          request({
            event: "landing_viewed",
            surface: "product",
            distinct_id: "visitor-12345678",
          })
        )
      ).status
    ).toBe(400);

    const preflight = await OPTIONS();
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("answers preflight requests for the marketing origin", async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toContain("POST");
  });
});
