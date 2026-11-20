import { describe, expect, it } from "vitest";

import { summarizeFeedback, summarizeJobs } from "./lib/ops-summary";

describe("summarizeJobs", () => {
  it("counts statuses and computes a fail rate from real job rows", () => {
    const result = summarizeJobs([
      { id: "a", status: "complete", public: false },
      { id: "b", status: "complete", public: false },
      { id: "c", status: "failed", public: false },
      { id: "d", status: "running", public: false },
    ]);
    expect(result).toEqual({
      total: 4,
      complete: 2,
      failed: 1,
      running: 1,
      failRate: 25,
    });
  });

  it("returns zeroed counters for an empty store", () => {
    expect(summarizeJobs([])).toEqual({
      total: 0,
      complete: 0,
      failed: 0,
      running: 0,
      failRate: 0,
    });
  });
});

describe("summarizeFeedback", () => {
  it("counts only explicit yes/no answers", () => {
    const result = summarizeFeedback([
      { helpful: true },
      { helpful: false },
      { helpful: null },
      { helpful: true },
    ]);
    expect(result).toEqual({ yes: 2, no: 1, answered: 3 });
  });
});
