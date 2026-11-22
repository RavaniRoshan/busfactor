import { describe, expect, it } from "vitest";
import { buildAttribution, bucketFileCount, sanitizeAnalyticsProperties } from "./analytics";

describe("analytics helpers", () => {
it("parses UTM attribution", () => {
  expect(buildAttribution("?utm_source=reddit&utm_medium=community&utm_campaign=beta_launch")).toEqual({
    source: "reddit",
    medium: "community",
    campaign: "beta_launch",
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
      path: "/Users/me/code",
      cache_hit: true,
      duration_ms: 42000,
    })
  ).toEqual({ cache_hit: true, duration_ms: 42000 });
});
});
