import { describe, expect, it } from "vitest";
import { makeSlug, store } from "./lib/store";

describe("store memory fallback", () => {
  it("persists a report between calls", async () => {
    const slug = makeSlug();
    await store.reports.set(slug, { slug, report: { score: 42 }, public: false });
    const stored = await store.reports.get(slug);
    expect(stored?.report).toEqual({ score: 42 });
    expect(await store.reports.count()).toBeGreaterThan(0);
  });

  it("enforces a per-day rate limit", async () => {
    const key = `test-${makeSlug()}`;
    expect(await store.rateLimits.consume(key, "2026-11-20", 2)).toBe(true);
    expect(await store.rateLimits.consume(key, "2026-11-20", 2)).toBe(true);
    expect(await store.rateLimits.consume(key, "2026-11-20", 2)).toBe(false);
    expect(await store.rateLimits.consume(key, "2026-11-21", 2)).toBe(true);
  });

  it("accumulates spend", async () => {
    const before = (await store.spend.get()).usd;
    const after = await store.spend.add(0.01);
    expect(after.usd).toBeCloseTo(before + 0.01);
  });
});
