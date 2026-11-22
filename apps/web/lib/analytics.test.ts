import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetAnalyticsForTests,
  ANALYTICS_READY_EVENT,
  buildAttribution,
  bucketFileCount,
  capture,
  initAnalytics,
  sanitizeAnalyticsProperties,
} from "./analytics";

const originalWindow = (globalThis as { window?: unknown }).window;
const originalFetch = globalThis.fetch;
const originalDisabled = process.env.NEXT_PUBLIC_ANALYTICS_DISABLED;

function createStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  const listeners = new Map<string, Set<EventListener>>();
  const win = {
    localStorage: createStorage(),
    sessionStorage: createStorage(),
    location: { search: "?utm_source=reddit&utm_campaign=beta_launch", pathname: "/scan" },
    addEventListener(type: string, listener: EventListener) {
      const set = listeners.get(type) ?? new Set<EventListener>();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event: Event) {
      for (const listener of listeners.get(event.type) ?? []) listener(event);
      return true;
    },
  };
  (globalThis as { window?: unknown }).window = win;
  fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  __resetAnalyticsForTests();
  if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
  else (globalThis as { window?: unknown }).window = originalWindow;
  globalThis.fetch = originalFetch;
  if (originalDisabled === undefined) delete process.env.NEXT_PUBLIC_ANALYTICS_DISABLED;
  else process.env.NEXT_PUBLIC_ANALYTICS_DISABLED = originalDisabled;
});

describe("analytics helpers", () => {
  it("parses UTM attribution", () => {
    expect(
      buildAttribution(
        "?utm_source=reddit&utm_medium=community&utm_campaign=beta_launch&utm_content=hero&utm_term=operability"
      )
    ).toEqual({
      source: "reddit",
      medium: "community",
      campaign: "beta_launch",
      content: "hero",
      term: "operability",
    });
    expect(buildAttribution("")).toEqual({});
  });

  it("buckets file counts without exposing the repository", () => {
    expect(bucketFileCount(0)).toBe("0-100");
    expect(bucketFileCount(100)).toBe("100-500");
    expect(bucketFileCount(499)).toBe("100-500");
    expect(bucketFileCount(500)).toBe("500-2000");
    expect(bucketFileCount(2000)).toBe("2000+");
  });

  it("drops repository-identifying and unknown properties", () => {
    expect(
      sanitizeAnalyticsProperties({
        target: "https://github.com/acme/private-repo",
        repository: "acme/private-repo",
        repo: "acme/private-repo",
        path: "/Users/me/code",
        url: "https://github.com/acme/private-repo/blob/main/README.md",
        slug: "abc123",
        safe_url: "https://github.com/acme/private-repo",
        local_path: "file:///Users/me/code",
        cache_hit: true,
        duration_ms: 42000,
      })
    ).toEqual({ cache_hit: true, duration_ms: 42000 });
  });

  it("does not capture before consent/init", () => {
    expect(capture("scan_page_viewed")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("initAnalytics dispatches ready and capture posts a product event", () => {
    window.localStorage.setItem("busfactor.analytics.consent.v1", "granted");
    const ready = vi.fn();
    window.addEventListener(ANALYTICS_READY_EVENT, ready);

    initAnalytics();
    expect(ready).toHaveBeenCalledTimes(1);
    expect(capture("scan_succeeded", { cache_hit: true, duration_ms: 42000, target: "https://github.com/acme/repo" })).toBe(
      true
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/events");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.event).toBe("scan_succeeded");
    expect(body.surface).toBe("product");
    expect(typeof body.distinct_id).toBe("string");
    expect(body.properties).toEqual({
      page: "/scan",
      source: "reddit",
      campaign: "beta_launch",
      cache_hit: true,
      duration_ms: 42000,
    });
    window.removeEventListener(ANALYTICS_READY_EVENT, ready);
  });

  it("respects the build-time analytics kill flag", () => {
    process.env.NEXT_PUBLIC_ANALYTICS_DISABLED = "1";
    window.localStorage.setItem("busfactor.analytics.consent.v1", "granted");
    initAnalytics();
    expect(capture("scan_page_viewed")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
