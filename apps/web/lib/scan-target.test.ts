import { describe, expect, it } from "vitest";
import { validateHostedTarget } from "./scan-target";

describe("validateHostedTarget", () => {
  it("rejects local paths when local targets are not allowed", () => {
    expect(() => validateHostedTarget("fixtures/repos/clean", false)).toThrow();
    expect(() => validateHostedTarget("file:///etc/passwd", false)).toThrow();
  });

  it("allows local paths only when explicitly enabled", () => {
    expect(validateHostedTarget("fixtures/repos/clean", true)).toEqual({
      kind: "local",
      path: "fixtures/repos/clean",
    });
  });

  it("accepts public GitHub https URLs", () => {
    expect(validateHostedTarget("https://github.com/owner/repo", false)).toEqual({
      kind: "github",
      url: "https://github.com/owner/repo",
    });
  });
});
