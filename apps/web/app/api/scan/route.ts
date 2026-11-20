import { randomUUID } from "node:crypto";

import { makeSlug, store } from "@/lib/store";

export const maxDuration = 60;

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  if (process.env.BUSFACTOR_KILL_SWITCH === "1") {
    return Response.json({ error: "scans are temporarily disabled" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { target?: unknown };
  const rawTarget = typeof body.target === "string" ? body.target.trim() : "";
  if (rawTarget === "") {
    return Response.json({ error: "target is required" }, { status: 400 });
  }

  const allowed = await store.rateLimits.consume(clientIp(request), today(), 10);
  if (!allowed) {
    return Response.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  const spendCap = Number(process.env.BUSFACTOR_DAILY_SPEND_CAP_USD ?? "10");
  const currentSpend = await store.spend.get();
  if (currentSpend.usd >= spendCap) {
    return Response.json({ error: "daily spend cap reached" }, { status: 503 });
  }

  const cached = await store.reportCache.get(rawTarget);
  if (cached) {
    return Response.json({ id: randomUUID(), status: "complete", slug: cached.slug, report: cached.report, cached: true });
  }

  const nodePath = await import("node:path");
  const target = /^https?:\/\//i.test(rawTarget)
    ? rawTarget
    : nodePath.resolve(/*turbopackIgnore: true*/ process.cwd(), "..", "..", rawTarget);

  try {
    const core = await import("../../../../../packages/core/dist/index.js" /*turbopackIgnore: true*/);
    const { report } = await core.scanTarget(target, {});
    const slug = makeSlug();
    await store.reports.set(slug, { slug, report, public: false });
    await store.reportCache.set(rawTarget, { slug, report });
    await store.spend.add(Number((report as { meta?: { costUsd?: number } }).meta?.costUsd ?? 0));
    const id = randomUUID();
    await store.jobs.set(id, { id, status: "complete", slug, report, public: false });
    return Response.json({ id, status: "complete", slug, report });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
