import { assertSameOrigin, isAdminRequest } from "@/lib/admin-auth";
import { isAnalyticsId } from "@/lib/analytics-schema";
import { analyticsStore } from "@/lib/analytics-events";

export async function DELETE(request: Request) {
  const denied = assertSameOrigin(request);
  if (denied) return denied;
  if (!(await isAdminRequest())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { distinctId?: unknown };
  const distinctId = typeof body.distinctId === "string" ? body.distinctId.trim() : "";
  if (!isAnalyticsId(distinctId)) {
    return Response.json({ error: "valid distinctId required" }, { status: 400 });
  }

  const deleted = await analyticsStore.deleteByDistinctId(distinctId);
  return Response.json({ deleted });
}
