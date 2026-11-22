import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  register: vi.fn(),
  capture: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: posthogMock,
}));

import {
  __resetAnalyticsForTests,
  ANALYTICS_READY_EVENT,
  buildAttribution,
  bucketFileCount,
  capture,
  initAnalytics,
  sanitizeAnalyticsProperties,
} from "./analytics";

const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const originalHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const originalWindow = (globalThis as { window?: unknown }).window;

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

beforeEach(() => {
  const listeners = new Map<string, Set<EventListener>>();
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  const win = {
    localStorage,
    sessionStorage,
    location: { search: "" },
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
});

afterEach(() => {
  __resetAnalyticsForTests();
  posthogMock.init.mockReset();
  posthogMock.register.mockReset();
  posthogMock.capture.mockReset();
  if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
  else (globalThis as { window?: unknown }).window = originalWindow;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  else process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey;
  if (originalHost === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  else process.env.NEXT_PUBLIC_POSTHOG_HOST = originalHost;
});

describe("analytics helpers", () => {
it("parses UTM attribution", () => {
  expect(
    buildAttribution("?utm_source=reddit&utm_medium=community&utm_campaign=beta_launch&utm_content=hero&utm_term=operability")
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

it("drops repository-identifying properties", () => {
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

it("returns false from capture when analytics is not initialized", () => {
  expect(capture("scan_page_viewed")).toBe(false);
  expect(posthogMock.capture).not.toHaveBeenCalled();
});

it("initAnalytics is exception-safe and dispatches ready on success", () => {
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
  window.localStorage.setItem("busfactor.analytics.consent.v1", "granted");
  const ready = vi.fn();
  window.addEventListener(ANALYTICS_READY_EVENT, ready);

  posthogMock.init.mockImplementationOnce(() => {
    throw new Error("boom");
  });
  expect(() => initAnalytics()).not.toThrow();
  expect(capture("scan_page_viewed")).toBe(false);

  posthogMock.init.mockImplementation(() => undefined);
  initAnalytics();
  expect(ready).toHaveBeenCalledTimes(1);
  expect(capture("scan_page_viewed")).toBe(true);
  expect(posthogMock.capture).toHaveBeenCalledWith("scan_page_viewed", {});
  window.removeEventListener(ANALYTICS_READY_EVENT, ready);
});
});
