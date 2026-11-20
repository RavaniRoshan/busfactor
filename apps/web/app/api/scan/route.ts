import { randomUUID } from "node:crypto";

import { scanTarget } from "../../../../../packages/core/dist/index.js";
import { jobs, makeSlug, rateLimits, reportCache, reports, spend } from "@/lib/store";

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

  const ip = clientIp(request);
  const limit = rateLimits.get(ip);
  const currentDay = today();
  if (limit === undefined || limit.day !== currentDay) {
    rateLimits.set(ip, { day: currentDay, count: 1 });
  } else if (limit.count >= 10) {
    return Response.json({ error: "rate limit exceeded" }, { status: 429 });
  } else {
    limit.count += 1;
  }

  const spendCap = Number(process.env.BUSFACTOR_DAILY_SPEND_CAP_USD ?? "10");
  if (spend.usd >= spendCap) {
    return Response.json({ error: "daily spend cap reached" }, { status: 503 });
  }

  const cacheKey = rawTarget;
  const cached = reportCache.get(cacheKey) as { report: unknown; slug: string } | undefined;
  if (cached) {
    const id = randomUUID();
    jobs.set(id, { id, status: "complete", slug: cached.slug, report: cached.report, public: false });
    return Response.json({ id, cached: true }, { status: 200 });
  }

  const id = randomUUID();
  jobs.set(id, { id, status: "running", public: false });

  const nodePath = await import("node:path");
  const target = /^https?:\/\//i.test(rawTarget)
    ? rawTarget
    : nodePath.resolve(/*turbopackIgnore: true*/ process.cwd(), "..", "..", rawTarget);

  void (async () => {
    try {
      const { report } = await scanTarget(target, {});
      const slug = makeSlug();
      reports.set(slug, { slug, report, public: false });
      reportCache.set(cacheKey, { slug, report });
      spend.usd += Number((report as { meta?: { costUsd?: number } }).meta?.costUsd ?? 0);
      jobs.set(id, { id, status: "complete", slug, report, public: false });
    } catch (error) {
      jobs.set(id, {
        id,
        status: "failed",
        public: false,
        error: error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error),
      });
    }
  })();

  return Response.json({ id }, { status: 202 });
}
