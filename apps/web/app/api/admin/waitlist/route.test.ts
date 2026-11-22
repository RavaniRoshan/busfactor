import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

const isAdminRequestMock = vi.fn(async () => false);
vi.mock("@/lib/admin-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin-auth")>("@/lib/admin-auth");
  return { ...actual, isAdminRequest: () => isAdminRequestMock() };
});

const deleteWaitlistMock = vi.fn(async (_email: string) => 1);
vi.mock("@/lib/records", () => ({
  normalizeEmail: (raw: unknown) => {
    if (typeof raw !== "string") return null;
    const email = raw.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  },
  records: { deleteWaitlist: (email: string) => deleteWaitlistMock(email) },
}));

import { DELETE } from "./route";

afterEach(() => {
  vi.clearAllMocks();
  isAdminRequestMock.mockResolvedValue(false);
  deleteWaitlistMock.mockResolvedValue(1);
});

function req(body: unknown, origin?: string | null): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (origin !== null) headers.origin = origin ?? "http://localhost";
  return new Request("http://localhost/api/admin/waitlist", {
    method: "DELETE",
    headers,
    body: JSON.stringify(body),
  });
}

describe("DELETE /api/admin/waitlist", () => {
  it("requires admin auth", async () => {
    const res = await DELETE(req({ email: "a@b.com" }));
    expect(res.status).toBe(401);
    expect(deleteWaitlistMock).not.toHaveBeenCalled();
  });

  it("validates email", async () => {
    isAdminRequestMock.mockResolvedValue(true);
    const res = await DELETE(req({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("deletes by email", async () => {
    isAdminRequestMock.mockResolvedValue(true);
    deleteWaitlistMock.mockResolvedValue(1);
    const res = await DELETE(req({ email: "User@Example.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 1 });
    expect(deleteWaitlistMock).toHaveBeenCalledWith("user@example.com");
  });

  it("rejects a cross-origin DELETE before mutation", async () => {
    isAdminRequestMock.mockResolvedValue(true);
    const res = await DELETE(req({ email: "user@example.com" }, "https://evil.example"));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
    expect(deleteWaitlistMock).not.toHaveBeenCalled();
    expect(isAdminRequestMock).not.toHaveBeenCalled();
  });

  it("allows a same-origin or absent-origin DELETE", async () => {
    isAdminRequestMock.mockResolvedValue(true);

    const sameOrigin = await DELETE(req({ email: "a@b.com" }, "http://localhost"));
    expect(sameOrigin.status).toBe(200);

    const absentOrigin = await DELETE(req({ email: "a@b.com" }, null));
    expect(absentOrigin.status).toBe(200);
    expect(deleteWaitlistMock).toHaveBeenCalledTimes(2);
  });
});
