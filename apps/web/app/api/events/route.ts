import { normalizeAnalyticsEvent } from "@/lib/analytics-schema";
import { analyticsStore } from "@/lib/analytics-events";
import { hashIp } from "@/lib/ip";
import { store } from "@/lib/store";

const MAX_BODY_BYTES = 4096;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: "payload too large" }, { status: 413, headers: CORS_HEADERS });
  }

  const bodyText = await request.text();
  if (bodyText.length > MAX_BODY_BYTES) {
    return Response.json({ error: "payload too large" }, { status: 413, headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400, headers: CORS_HEADERS });
  }

  const event = normalizeAnalyticsEvent(body);
  if (event === null) {
    return Response.json({ error: "invalid event" }, { status: 400, headers: CORS_HEADERS });
  }

  const allowed = await store.rateLimits.consume(`analytics:${hashIp(clientIp(request))}`, today(), 600);
  if (!allowed) {
    return Response.json({ error: "rate limit exceeded" }, { status: 429, headers: CORS_HEADERS });
  }

  await analyticsStore.record(event);
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
