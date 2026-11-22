import { hashIp } from "@/lib/ip";
import { normalizeEmail, records } from "@/lib/records";
import { store } from "@/lib/store";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeOptionalText(raw: unknown, max: number): string | undefined {
  if (typeof raw !== "string") return undefined;
  const value = raw.trim().slice(0, max);
  return value.length > 0 ? value : undefined;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown;
    source?: unknown;
    campaign?: unknown;
  };

  const email = normalizeEmail(body.email);
  if (!email) {
    return Response.json({ error: "valid email required" }, { status: 400 });
  }

  const allowed = await store.rateLimits.consume(`waitlist:${hashIp(clientIp(request))}`, today(), 5);
  if (!allowed) {
    return Response.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  await records.addWaitlist({
    email,
    source: normalizeOptionalText(body.source, 64),
    campaign: normalizeOptionalText(body.campaign, 64),
  });

  return Response.json({ ok: true });
}
