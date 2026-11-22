import { afterEach, describe, expect, it, vi } from "vitest";

const isAdminRequestMock = vi.fn(async () => false);
vi.mock("@/lib/admin-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin-auth")>("@/lib/admin-auth");
  return { ...actual, isAdminRequest: () => isAdminRequestMock() };
});

const deleteFeedbackMock = vi.fn(async (_id: string) => true);
vi.mock("@/lib/records", () => ({
  records: { deleteFeedback: (id: string) => deleteFeedbackMock(id) },
}));

import { DELETE } from "./route";

afterEach(() => {
  vi.clearAllMocks();
  isAdminRequestMock.mockResolvedValue(false);
  deleteFeedbackMock.mockResolvedValue(true);
});

function req(body: unknown): Request {
  return new Request("http://localhost/api/admin/feedback", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("DELETE /api/admin/feedback", () => {
  it("requires admin auth", async () => {
    const res = await DELETE(req({ id: "550e8400-e29b-41d4-a716-446655440000" }));
    expect(res.status).toBe(401);
    expect(deleteFeedbackMock).not.toHaveBeenCalled();
  });

  it("validates id as uuid", async () => {
    isAdminRequestMock.mockResolvedValue(true);
    const res = await DELETE(req({ id: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("deletes by id", async () => {
    isAdminRequestMock.mockResolvedValue(true);
    deleteFeedbackMock.mockResolvedValue(true);
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const res = await DELETE(req({ id }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
    expect(deleteFeedbackMock).toHaveBeenCalledWith(id);
  });
});
