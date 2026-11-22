import { NextResponse } from "next/server";
import { assertSameOrigin, isAdminRequest } from "@/lib/admin-auth";
import { normalizeEmail, records } from "@/lib/records";

export async function DELETE(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!email) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  const deleted = await records.deleteWaitlist(email);
  return NextResponse.json({ deleted });
}
