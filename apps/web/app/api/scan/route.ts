import { randomUUID } from "node:crypto";

import { hashIp } from "@/lib/ip";
import { categorizeScanError, safeErrorMessage, scanJobs } from "@/lib/scan-jobs";
import { makeSlug, store } from "@/lib/store";

export const maxDuration = 60;

const ENGINE_VERSION = "0.1.0";
const RUBRIC_VERSION = "0.1.0";
const PROMPT_VERSION = "0.1.0";

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

  const allowed = await store.rateLimits.consume(hashIp(clientIp(request)), today(), 10);
  if (!allowed) {
    return Response.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  const spendCap = Number(process.env.BUSFACTOR_DAILY_SPEND_CAP_USD ?? "10");
  const currentSpend = await store.spend.get();
  if (currentSpend.usd >= spendCap) {
    return Response.json({ error: "daily spend cap reached" }, { status: 503 });
  }

  const id = randomUUID();
  const startedAt = Date.now();
  await scanJobs.create({
    id,
    engineVersion: ENGINE_VERSION,
    rubricVersion: RUBRIC_VERSION,
    promptVersion: PROMPT_VERSION,
  });

  try {
    const cached = await store.reportCache.get(rawTarget);
    if (cached) {
      await scanJobs.complete(id, {
        reportSlug: cached.slug,
        durationMs: 0,
        cacheHit: true,
        costUsd: 0,
        model: null,
        engineVersion: ENGINE_VERSION,
        rubricVersion: RUBRIC_VERSION,
        promptVersion: PROMPT_VERSION,
      });
      return Response.json({
        id,
        status: "complete",
        slug: cached.slug,
        report: cached.report,
        cached: true,
      });
    }

    const nodePath = await import("node:path");
    const target = /^https?:\/\//i.test(rawTarget)
      ? rawTarget
      : nodePath.resolve(/*turbopackIgnore: true*/ process.cwd(), "..", "..", rawTarget);

    const core = await import("../../../../../packages/core/dist/index.js" /*turbopackIgnore: true*/);
    const { report } = await core.scanTarget(target, {});
    const slug = makeSlug();
    await store.reports.set(slug, { slug, report, public: false });
    await store.reportCache.set(rawTarget, { slug, report });
    const costUsd = Number((report as { meta?: { costUsd?: number } }).meta?.costUsd ?? 0);
    await store.spend.add(costUsd);
    const model =
      typeof (report as { meta?: { model?: unknown } }).meta?.model === "string"
        ? ((report as { meta?: { model?: string } }).meta?.model ?? null)
        : null;
    await scanJobs.complete(id, {
      reportSlug: slug,
      durationMs: Date.now() - startedAt,
      cacheHit: false,
      costUsd,
      model,
      engineVersion: ENGINE_VERSION,
      rubricVersion: RUBRIC_VERSION,
      promptVersion: PROMPT_VERSION,
    });
    return Response.json({ id, status: "complete", slug, report });
  } catch (error) {
    const category = categorizeScanError(error);
    await scanJobs.fail(id, { errorCategory: category, durationMs: Date.now() - startedAt });
    return Response.json({ error: safeErrorMessage(category), category }, { status: 500 });
  }
}
