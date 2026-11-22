import { randomUUID } from "node:crypto";

import { hashIp } from "@/lib/ip";
import { categorizeScanError, safeErrorMessage, scanJobs } from "@/lib/scan-jobs";
import { spendStore, utcDay } from "@/lib/spend";
import { makeSlug, store } from "@/lib/store";

export const maxDuration = 60;

const ENGINE_VERSION = "0.1.0";
const RUBRIC_VERSION = "0.1.0";
const PROMPT_VERSION = "0.1.0";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function spendCapUsd(): number {
  const raw = Number(process.env.BUSFACTOR_DAILY_SPEND_CAP_USD ?? "10");
  return Number.isFinite(raw) && raw >= 0 ? raw : 10;
}

function reservationUsd(): number {
  const raw = Number(process.env.BUSFACTOR_SCAN_RESERVATION_USD ?? "0.05");
  return Number.isFinite(raw) && raw >= 0 ? raw : 0.05;
}

function maybeAlertSpend(day: string, usd: number, cap: number): void {
  const url = process.env.BUSFACTOR_ALERT_WEBHOOK_URL?.trim();
  if (!url || cap <= 0 || usd < cap * 0.8) return;
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "spend_warning", day, usd, cap }),
  }).catch(() => undefined);
}

async function settleReservation(day: string, reserved: number, actual: number, cap: number): Promise<void> {
  try {
    const settled = await spendStore.settle(day, reserved, actual);
    maybeAlertSpend(day, settled.usd, cap);
  } catch {
    // Best-effort: settlement failure must not change scan response.
  }
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

  const allowed = await store.rateLimits.consume(hashIp(clientIp(request)), utcDay(), 10);
  if (!allowed) {
    return Response.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  const id = randomUUID();
  const startedAt = Date.now();
  await scanJobs.create({
    id,
    engineVersion: ENGINE_VERSION,
    rubricVersion: RUBRIC_VERSION,
    promptVersion: PROMPT_VERSION,
  });

  const cap = spendCapUsd();
  const reserveAmount = reservationUsd();
  const day = utcDay();
  let reserved = false;

  try {
    const cached = await store.reportCache.get(rawTarget);
    if (cached) {
      const cachedMeta = (cached.report as { meta?: { promptVersion?: unknown; usage?: unknown } }).meta;
      const isCompatibleCache =
        cachedMeta?.promptVersion === PROMPT_VERSION && cachedMeta?.usage != null;
      if (isCompatibleCache) {
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
      // Stale legacy cache entry: ignore and rescan; successful rescan overwrites it.
    }

    const reservation = await spendStore.reserve(day, reserveAmount, cap);
    if (!reservation.ok) {
      await scanJobs.fail(id, { errorCategory: "spend_cap", durationMs: Date.now() - startedAt });
      return Response.json({ error: "daily spend cap reached" }, { status: 503 });
    }
    reserved = true;

    const nodePath = await import("node:path");
    const target = /^https?:\/\//i.test(rawTarget)
      ? rawTarget
      : nodePath.resolve(/*turbopackIgnore: true*/ process.cwd(), "..", "..", rawTarget);

    const core = await import("../../../../../packages/core/dist/index.js" /*turbopackIgnore: true*/);
    const { report } = await core.scanTarget(target, {});
    const slug = makeSlug();
    await store.reports.set(slug, { slug, report, public: false });
    await store.reportCache.set(rawTarget, { slug, report });
    const meta = (report as {
      meta?: {
        costUsd?: number;
        promptVersion?: string;
        usage?: {
          provider: string;
          model: string;
          inputTokens: number;
          outputTokens: number;
          cachedTokens: number;
          requests: number;
        };
      };
    }).meta;
    const costUsd = Number(meta?.costUsd ?? 0);
    const usage = meta?.usage;
    if (usage) {
      await scanJobs.recordCost({
        scanId: id,
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedTokens: usage.cachedTokens,
        requests: usage.requests,
        costUsd,
      });
    }
    await scanJobs.complete(id, {
      reportSlug: slug,
      durationMs: Date.now() - startedAt,
      cacheHit: false,
      costUsd,
      model: usage?.model ?? null,
      engineVersion: ENGINE_VERSION,
      rubricVersion: RUBRIC_VERSION,
      promptVersion: meta?.promptVersion ?? PROMPT_VERSION,
    });
    await settleReservation(day, reserveAmount, costUsd, cap);
    return Response.json({ id, status: "complete", slug, report });
  } catch (error) {
    if (reserved) await settleReservation(day, reserveAmount, 0, cap);
    const category = categorizeScanError(error);
    await scanJobs.fail(id, { errorCategory: category, durationMs: Date.now() - startedAt });
    return Response.json({ error: safeErrorMessage(category), category }, { status: 500 });
  }
}
