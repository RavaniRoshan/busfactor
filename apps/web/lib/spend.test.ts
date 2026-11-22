import { describe, expect, it } from "vitest";
import { spendStore, utcDay } from "./spend";

describe("spend store", () => {
  it("allows only reservations that fit under the daily cap", async () => {
    const day = `test-${Date.now()}`;
    const results = await Promise.all([
      spendStore.reserve(day, 0.02, 0.05),
      spendStore.reserve(day, 0.02, 0.05),
      spendStore.reserve(day, 0.02, 0.05),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(2);
    expect(await spendStore.get(day)).toBeCloseTo(0.04);
  });

  it("settles a reservation down to the actual cost", async () => {
    const day = `test-${Date.now()}-settle`;
    await spendStore.reserve(day, 0.02, 1);
    await spendStore.settle(day, 0.02, 0.005);
    expect(await spendStore.get(day)).toBeCloseTo(0.005);
  });

  it("returns distinct UTC day keys across a day boundary", () => {
    expect(utcDay(new Date("2026-11-22T23:59:59.999Z"))).toBe("2026-11-22");
    expect(utcDay(new Date("2026-11-23T00:00:00.000Z"))).toBe("2026-11-23");
  });

  it("keeps reservations independent across day keys", async () => {
    const prefix = `test-${Date.now()}-rollover`;
    const dayA = `${prefix}-2026-11-22`;
    const dayB = `${prefix}-2026-11-23`;

    const a = await spendStore.reserve(dayA, 0.04, 0.05);
    const b = await spendStore.reserve(dayB, 0.04, 0.05);

    expect(a).toEqual({ ok: true, usd: 0.04 });
    expect(b).toEqual({ ok: true, usd: 0.04 });
    expect(await spendStore.get(dayA)).toBeCloseTo(0.04);
    expect(await spendStore.get(dayB)).toBeCloseTo(0.04);
  });
});
