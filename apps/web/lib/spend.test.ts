import { describe, expect, it } from "vitest";
import { spendStore } from "./spend";

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
});
