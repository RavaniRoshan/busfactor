import { describe, expect, it } from "vitest";
import { reportCacheKey } from "./report-cache.js";

describe("reportCacheKey", () => {
  it("keys cache identity by commit and prompt/rubric versions", () => {
    const base = {
      owner: "a",
      repo: "b",
      sha: "1".repeat(40),
      engineVersion: "e",
      rubricVersion: "r",
      promptVersion: "p",
    };
    expect(reportCacheKey(base)).not.toBe(reportCacheKey({ ...base, sha: "2".repeat(40) }));
    expect(reportCacheKey(base)).not.toBe(reportCacheKey({ ...base, promptVersion: "p2" }));
  });
});
