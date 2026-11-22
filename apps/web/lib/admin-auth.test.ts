import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./admin-auth";

process.env.BUSFACTOR_ADMIN_TOKEN = "test-token";
process.env.BUSFACTOR_ADMIN_SESSION_SECRET = "test-secret";

describe("admin auth session", () => {
it("round-trips a valid session and rejects tampering", () => {
  const cookie = signSession(1_000);
  expect(verifySession(cookie, 1_001)).toBe(true);
  expect(verifySession(cookie + "x", 1_001)).toBe(false);
  expect(verifySession("not-a-session", 1_001)).toBe(false);
});

it("rejects an expired session", () => {
  const cookie = signSession(1_000);
  expect(verifySession(cookie, 1_000 + 9 * 60 * 60 * 1000)).toBe(false);
});
});
