import { afterEach, describe, expect, it, vi } from "vitest";

const cookieJar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value ? { name, value } : undefined;
    },
  })),
}));

vi.mock("@/lib/store", () => ({
  store: {
    rateLimits: { consume: vi.fn().mockResolvedValue(true) },
  },
}));

import { POST, DELETE } from "./route";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { store } from "@/lib/store";

const ORIGINAL_TOKEN = process.env.BUSFACTOR_ADMIN_TOKEN;
const ORIGINAL_SECRET = process.env.BUSFACTOR_ADMIN_SESSION_SECRET;

afterEach(() => {
  cookieJar.clear();
  vi.clearAllMocks();
  if (ORIGINAL_TOKEN === undefined) delete process.env.BUSFACTOR_ADMIN_TOKEN;
  else process.env.BUSFACTOR_ADMIN_TOKEN = ORIGINAL_TOKEN;
  if (ORIGINAL_SECRET === undefined) delete process.env.BUSFACTOR_ADMIN_SESSION_SECRET;
  else process.env.BUSFACTOR_ADMIN_SESSION_SECRET = ORIGINAL_SECRET;
});

function post(body: unknown, origin = "http://localhost"): Request {
  return new Request("http://localhost/api/admin/session", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/session", () => {
  it("sets an admin cookie for a valid token", async () => {
    process.env.BUSFACTOR_ADMIN_TOKEN = "audit-test-token";
    process.env.BUSFACTOR_ADMIN_SESSION_SECRET = "test-secret";
    const response = await POST(post({ token: "audit-test-token" }));
    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${ADMIN_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=strict");
    const value = setCookie.split(";")[0]?.slice(`${ADMIN_COOKIE}=`.length);
    expect(verifySession(value, Date.now())).toBe(true);
  });

  it("rejects a wrong token", async () => {
    process.env.BUSFACTOR_ADMIN_TOKEN = "audit-test-token";
    process.env.BUSFACTOR_ADMIN_SESSION_SECRET = "test-secret";
    const response = await POST(post({ token: "nope" }));
    expect(response.status).toBe(401);
  });

  it("rejects a bad origin", async () => {
    process.env.BUSFACTOR_ADMIN_TOKEN = "audit-test-token";
    process.env.BUSFACTOR_ADMIN_SESSION_SECRET = "test-secret";
    const response = await POST(post({ token: "audit-test-token" }, "https://evil.example"));
    expect(response.status).toBe(403);
  });

  it("rate limits login attempts", async () => {
    process.env.BUSFACTOR_ADMIN_TOKEN = "audit-test-token";
    process.env.BUSFACTOR_ADMIN_SESSION_SECRET = "test-secret";
    vi.mocked(store.rateLimits.consume).mockResolvedValueOnce(false);
    const response = await POST(post({ token: "audit-test-token" }));
    expect(response.status).toBe(429);
  });
});

describe("DELETE /api/admin/session", () => {
  it("clears the admin cookie", async () => {
    process.env.BUSFACTOR_ADMIN_TOKEN = "audit-test-token";
    process.env.BUSFACTOR_ADMIN_SESSION_SECRET = "test-secret";
    const response = await DELETE(
      new Request("http://localhost/api/admin/session", { method: "DELETE" })
    );
    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${ADMIN_COOKIE}=`);
    expect(setCookie.toLowerCase()).toMatch(/max-age=0|expires=/);
  });

  it("rejects a cross-origin DELETE", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/admin/session", {
        method: "DELETE",
        headers: { origin: "https://evil.example" },
      })
    );
    expect(response.status).toBe(403);
  });
});
