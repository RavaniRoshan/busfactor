import { describe, expect, it } from "vitest";

import { HeuristicProvider, MockProvider } from "./mock.js";

describe("MockProvider", () => {
  it("returns zeroed usage with provider name", async () => {
    const provider = new MockProvider();
    await provider.complete({ system: "s", user: "u" });
    expect(provider.getUsage()).toEqual({
      provider: "mock",
      model: "mock",
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      requests: 1,
    });
  });
});

describe("HeuristicProvider", () => {
  it("returns zeroed usage with provider name", async () => {
    const provider = new HeuristicProvider();
    await provider.complete({ system: "s", user: "u" });
    expect(provider.getUsage()).toEqual({
      provider: "heuristic",
      model: "heuristic",
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      requests: 1,
    });
  });
});
