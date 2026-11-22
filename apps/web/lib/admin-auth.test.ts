import { describe, expect, it } from "vitest";
import { assertSameOrigin, isSameOrigin, signSession, verifySession } from "./admin-auth";

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

describe("same-origin guard", () => {
  it("allows absent origin and matching origin", () => {
    expect(
      isSameOrigin(new Request("http://localhost/api/admin/waitlist", { method: "DELETE" }))
    ).toBe(true);
    expect(
      isSameOrigin(
        new Request("http://localhost/api/admin/waitlist", {
          method: "DELETE",
          headers: { origin: "http://localhost" },
        })
      )
    ).toBe(true);
    expect(
      assertSameOrigin(
        new Request("http://localhost/api/admin/waitlist", {
          method: "DELETE",
          headers: { origin: "http://localhost" },
        })
      )
    ).toBeNull();
  });

  it("rejects cross-origin requests with 403", async () => {
    const response = assertSameOrigin(
      new Request("http://localhost/api/admin/waitlist", {
        method: "DELETE",
        headers: { origin: "https://evil.example" },
      })
    );
    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({ error: "forbidden" });
  });
});
