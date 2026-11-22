import { expect, it } from "vitest";
import { estimateCostUsd, rateFor } from "./cost.js";

const usage = {
  provider: "groq",
  model: "openai/gpt-oss-20b",
  inputTokens: 1_000_000,
  outputTokens: 500_000,
  cachedTokens: 0,
  requests: 1,
};

it("prices input and output tokens per million", () => {
  expect(estimateCostUsd(usage, { inputPerMTokUsd: 0.075, outputPerMTokUsd: 0.3 })).toBeCloseTo(0.225);
});

it("returns zero when no rate is configured", () => {
  expect(estimateCostUsd(usage)).toBe(0);
});

it("reads rates from a provider/model JSON map", () => {
  const raw = JSON.stringify({ "groq/openai/gpt-oss-20b": { inputPerMTokUsd: 1, outputPerMTokUsd: 2 } });
  expect(rateFor(usage, raw)).toEqual({ inputPerMTokUsd: 1, outputPerMTokUsd: 2 });
});

it("returns undefined for malformed BUSFACTOR_LLM_RATES_JSON", () => {
  expect(rateFor(usage, "{not json")).toBeUndefined();
});

it("returns undefined for missing provider/model key", () => {
  const raw = JSON.stringify({ "groq/other-model": { inputPerMTokUsd: 1, outputPerMTokUsd: 2 } });
  expect(rateFor(usage, raw)).toBeUndefined();
});

it("returns undefined for invalid rate shapes", () => {
  const cases = [
    JSON.stringify({ "groq/openai/gpt-oss-20b": "not-an-object" }),
    JSON.stringify({ "groq/openai/gpt-oss-20b": { inputPerMTokUsd: -1, outputPerMTokUsd: 2 } }),
    JSON.stringify({ "groq/openai/gpt-oss-20b": { inputPerMTokUsd: 1, outputPerMTokUsd: "2" } }),
    JSON.stringify({ "groq/openai/gpt-oss-20b": { inputPerMTokUsd: 1 } }),
  ];
  for (const raw of cases) {
    expect(rateFor(usage, raw)).toBeUndefined();
  }
});
