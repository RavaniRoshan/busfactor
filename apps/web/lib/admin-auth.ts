import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "bf_admin";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

type SessionPayload = { exp: number };

function base64urlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function sessionKey(): string | null {
  const secret = process.env.BUSFACTOR_ADMIN_SESSION_SECRET;
  if (typeof secret === "string" && secret.length > 0) return secret;
  const token = process.env.BUSFACTOR_ADMIN_TOKEN;
  if (typeof token === "string" && token.length > 0) return token;
  return null;
}

function hmac(payload: string, key: string): Buffer {
  return createHmac("sha256", key).update(payload).digest();
}

function safeEqualHexOrB64(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signSession(now: number = Date.now()): string {
  const key = sessionKey();
  if (!key) {
    throw new Error("Admin session signing is not configured");
  }
  const payload: SessionPayload = { exp: now + SESSION_TTL_MS };
  const encoded = base64urlEncode(JSON.stringify(payload));
  const sig = hmac(encoded, key).toString("base64url");
  return `${encoded}.${sig}`;
}

export function verifySession(value: string | undefined, now: number = Date.now()): boolean {
  const key = sessionKey();
  if (!key) return false;
  if (typeof value !== "string" || value.length === 0) return false;

  const dot = value.indexOf(".");
  if (dot <= 0 || dot === value.length - 1) return false;
  if (value.indexOf(".", dot + 1) !== -1) return false;

  const encoded = value.slice(0, dot);
  const sigPart = value.slice(dot + 1);

  let actualSig: Buffer;
  let expectedSig: Buffer;
  try {
    actualSig = Buffer.from(sigPart, "base64url");
    expectedSig = hmac(encoded, key);
  } catch {
    return false;
  }
  if (!safeEqualHexOrB64(actualSig, expectedSig)) return false;

  const json = base64urlDecode(encoded);
  if (!json) return false;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== "object") return false;
  const exp = (parsed as Record<string, unknown>).exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return false;
  if (exp <= now) return false;
  return true;
}

export function adminCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "strict";
  path: "/";
  maxAge: number;
} {
  const secure =
    process.env.NODE_ENV === "production" && process.env.PLAYWRIGHT_TEST !== "1";
  return {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export async function isAdminRequest(): Promise<boolean> {
  try {
    const jar = await cookies();
    const value = jar.get(ADMIN_COOKIE)?.value;
    return verifySession(value);
  } catch {
    return false;
  }
}
