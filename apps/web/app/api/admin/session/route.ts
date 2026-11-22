import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, assertSameOrigin, signSession } from "@/lib/admin-auth";
import { hashIp } from "@/lib/ip";
import { store } from "@/lib/store";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeTokenEquals(provided: string, expected: string): boolean {
  const a = sha256(provided);
  const b = sha256(expected);
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const allowed = await store.rateLimits.consume(
    `admin-login:${hashIp(clientIp(request))}`,
    utcDay(),
    10
  );
  if (!allowed) {
    return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const expected = process.env.BUSFACTOR_ADMIN_TOKEN ?? "";

  if (!expected || !token || !safeTokenEquals(token, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, signSession(), adminCookieOptions());
  return response;
}

export async function DELETE(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions(), maxAge: 0 });
  return response;
}
