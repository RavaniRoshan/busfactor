import { describe, expect, it } from "vitest";

import { hashIp } from "./lib/ip";

describe("hashIp", () => {
  it("does not retain the raw address", () => {
    const raw = "203.0.113.42";
    const hashed = hashIp(raw);
    expect(hashed).not.toContain(raw);
    expect(hashed).toMatch(/^[a-f0-9]{24}$/);
  });

  it("is stable for the same address and distinct for different addresses", () => {
    expect(hashIp("203.0.113.42")).toBe(hashIp("203.0.113.42"));
    expect(hashIp("203.0.113.42")).not.toBe(hashIp("203.0.113.43"));
  });
});
