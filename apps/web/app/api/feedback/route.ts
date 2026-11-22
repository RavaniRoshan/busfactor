import { hashIp } from "@/lib/ip";
import { normalizeFeedback, records } from "@/lib/records";
import { store } from "@/lib/store";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const feedback = normalizeFeedback(body);
  if (!feedback) {
    return Response.json({ error: "invalid feedback" }, { status: 400 });
  }

  const allowed = await store.rateLimits.consume(`feedback:${hashIp(clientIp(request))}`, today(), 20);
  if (!allowed) {
    return Response.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  const report = await store.reports.get(feedback.reportSlug);
  if (!report) {
    return Response.json({ error: "report not found" }, { status: 404 });
  }

  await records.addFeedback(feedback);
  return Response.json({ ok: true });
}
