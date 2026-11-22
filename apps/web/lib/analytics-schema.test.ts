import { describe, expect, it } from "vitest";
import { isAnalyticsId, normalizeAnalyticsEvent, sanitizeAnalyticsProperties } from "./analytics-schema";

describe("analytics event schema", () => {
  it("normalizes a valid product event", () => {
    expect(
      normalizeAnalyticsEvent({
        event: "scan_succeeded",
        surface: "product",
        distinct_id: "visitor-12345678",
        session_id: "session-12345678",
        properties: { cache_hit: true, duration_ms: 42000, page: "/scan" },
      })
    ).toEqual({
      event: "scan_succeeded",
      surface: "product",
      distinctId: "visitor-12345678",
      sessionId: "session-12345678",
      properties: { cache_hit: true, duration_ms: 42000, page: "/scan" },
    });
  });

  it("rejects an event from the wrong surface", () => {
    expect(
      normalizeAnalyticsEvent({
        event: "landing_viewed",
        surface: "product",
        distinct_id: "visitor-12345678",
      })
    ).toBeNull();
    expect(
      normalizeAnalyticsEvent({
        event: "not_a_real_event",
        surface: "marketing",
        distinct_id: "visitor-12345678",
      })
    ).toBeNull();
  });

  it("rejects invalid visitor IDs", () => {
    expect(
      normalizeAnalyticsEvent({
        event: "scan_page_viewed",
        surface: "product",
        distinct_id: "short",
      })
    ).toBeNull();
    expect(isAnalyticsId("visitor-12345678")).toBe(true);
  });

  it("drops repository identifiers, URLs, emails, and unknown keys", () => {
    expect(
      sanitizeAnalyticsProperties({
        target: "https://github.com/acme/private-repo",
        repository: "acme/private-repo",
        repo: "acme/private-repo",
        path: "/Users/me/code",
        url: "https://example.com",
        slug: "abc123",
        email: "person@example.com",
        safe_url: "https://github.com/acme/private-repo",
        local_path: "file:///Users/me/code",
        campaign: "beta_launch",
        cache_hit: true,
        duration_ms: 42000,
      })
    ).toEqual({ campaign: "beta_launch", cache_hit: true, duration_ms: 42000 });
  });
});
