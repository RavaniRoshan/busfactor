import { randomUUID } from "node:crypto";

import { hashIp } from "@/lib/ip";
import { categorizeScanError, safeErrorMessage, scanJobs } from "@/lib/scan-jobs";
import { validateHostedTarget } from "@/lib/scan-target";
import { spendStore, utcDay } from "@/lib/spend";
import { makeSlug, store } from "@/lib/store";

export const maxDuration = 60;

type CoreModule = typeof import("../../../../../packages/core/dist/index.js");

async function loadCore(): Promise<CoreModule> {
  return (await import("../../../../../packages/core/dist/index.js" /*turbopackIgnore: true*/)) as CoreModule;
}

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

function cacheTtlMs(): number {
  const raw = Number(process.env.BUSFACTOR_CACHE_TTL_HOURS ?? "720");
  const hours = Number.isFinite(raw) && raw >= 0 ? raw : 720;
  return hours * 60 * 60 * 1000;
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

function reportMeta(report: unknown): {
  durationMs?: number;
  model?: string | null;
  rubricVersion?: string;
  promptVersion?: string;
  engineVersion?: string;
  stack?: string;
  fileCount?: number;
  costUsd?: number;
  usage?: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    requests: number;
  };
} {
  return ((report as { meta?: Record<string, unknown> } | undefined)?.meta ?? {}) as ReturnType<typeof reportMeta>;
}

function responseFields(report: unknown, extra: { cached: boolean; cacheHit: boolean }): Record<string, unknown> {
  const meta = reportMeta(report);
  return {
    cached: extra.cached,
    cacheHit: extra.cacheHit,
    durationMs: typeof meta.durationMs === "number" ? meta.durationMs : 0,
    model: typeof meta.model === "string" ? meta.model : meta.usage?.model ?? null,
    rubricVersion: typeof meta.rubricVersion === "string" ? meta.rubricVersion : null,
    promptVersion: typeof meta.promptVersion === "string" ? meta.promptVersion : null,
    stack: typeof meta.stack === "string" ? meta.stack : null,
    fileCount: typeof meta.fileCount === "number" ? meta.fileCount : null,
  };
}

function isFreshCacheEntry(entry: { createdAt?: number } | undefined): boolean {
  if (!entry || typeof entry.createdAt !== "number") return false;
  return Date.now() - entry.createdAt <= cacheTtlMs();
}

export async function POST(request: Request) {
  // 1. Kill switch, body validation, rate limit.
  if (process.env.BUSFACTOR_KILL_SWITCH === "1") {
    return Response.json({ error: "scans are temporarily disabled", category: "unavailable" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { target?: unknown };
  const rawTarget = typeof body.target === "string" ? body.target.trim() : "";
  if (rawTarget === "") {
    return Response.json({ error: "target is required", category: "invalid_input" }, { status: 400 });
  }

  const allowLocal = process.env.BUSFACTOR_ALLOW_LOCAL_TARGETS === "1";
  let validatedTarget: ReturnType<typeof validateHostedTarget>;
  try {
    validatedTarget = validateHostedTarget(rawTarget, allowLocal);
  } catch (error) {
    const category = categorizeScanError(error);
    return Response.json({ error: safeErrorMessage(category), category }, { status: 400 });
  }

  const allowed = await store.rateLimits.consume(hashIp(clientIp(request)), utcDay(), 10);
  if (!allowed) {
    return Response.json({ error: "rate limit exceeded", category: "rate_limited" }, { status: 429 });
  }

  const core = await loadCore();
  const { ENGINE_VERSION, RUBRIC_VERSION, PROMPT_VERSION } = core;

  // 2. Resolve the GitHub target/SHA (or the local test fixture).
  let resolvedSha = "";
  let cacheKey: string | null = null;
  let localSnapshot: Awaited<ReturnType<CoreModule["createSnapshotFromLocal"]>> | undefined;
  try {
    if (validatedTarget.kind === "github") {
      const resolved = await core.resolveGitHubRepo(validatedTarget.url);
      resolvedSha = resolved.sha;
      cacheKey = core.reportCacheKey({
        owner: resolved.owner,
        repo: resolved.repo,
        sha: resolved.sha,
        engineVersion: ENGINE_VERSION,
        rubricVersion: RUBRIC_VERSION,
        promptVersion: PROMPT_VERSION,
      });
    } else {
      const nodePath = await import("node:path");
      const localTargetPath = nodePath.resolve(
        /*turbopackIgnore: true*/ process.cwd(),
        "..",
        "..",
        validatedTarget.path
      );
      localSnapshot = await core.createSnapshotFromLocal(localTargetPath);
      resolvedSha = localSnapshot.sha;
      cacheKey = null; // local test targets skip cache
    }
  } catch (error) {
    await Promise.resolve(localSnapshot?.dispose?.()).catch(() => undefined);
    const category = categorizeScanError(error);
    const status =
      category === "invalid_input" || category === "repo_not_found" || category === "repo_too_large" ? 400 : 500;
    return Response.json({ error: safeErrorMessage(category), category }, { status });
  }

  // 3. Build the SHA-pinned cache key and read the cache.
  let cached: { report: unknown; slug: string; createdAt?: number } | undefined;
  if (cacheKey) {
    try {
      cached = await store.reportCache.get(cacheKey);
    } catch (error) {
      await Promise.resolve(localSnapshot?.dispose?.()).catch(() => undefined);
      const category = categorizeScanError(error);
      return Response.json({ error: safeErrorMessage(category), category }, { status: 500 });
    }
  }

  // 4. On a compatible cache hit: create a completed job with cacheHit true and return.
  if (cacheKey && cached) {
    const cachedMeta = reportMeta(cached.report);
    const isCompatibleCache =
      isFreshCacheEntry(cached) &&
      cachedMeta.promptVersion === PROMPT_VERSION &&
      cachedMeta.rubricVersion === RUBRIC_VERSION &&
      cachedMeta.engineVersion === ENGINE_VERSION;
    if (isCompatibleCache) {
      await Promise.resolve(localSnapshot?.dispose?.()).catch(() => undefined);
      const id = randomUUID();
      try {
        await scanJobs.create({
          id,
          engineVersion: ENGINE_VERSION,
          rubricVersion: RUBRIC_VERSION,
          promptVersion: PROMPT_VERSION,
        });
        await scanJobs.complete(id, {
          reportSlug: cached.slug,
          durationMs: 0,
          cacheHit: true,
          costUsd: 0,
          model: (cachedMeta.usage?.model as string | undefined) ?? null,
          engineVersion: ENGINE_VERSION,
          rubricVersion: RUBRIC_VERSION,
          promptVersion: PROMPT_VERSION,
        });
      } catch (error) {
        const category = categorizeScanError(error);
        return Response.json({ error: safeErrorMessage(category), category }, { status: 500 });
      }
      return Response.json({
        id,
        status: "complete",
        slug: cached.slug,
        report: cached.report,
        ...responseFields(cached.report, { cached: true, cacheHit: true }),
      });
    }
  }

  // 5. On a miss: reserve daily spend. On refusal return 503 with no job creation.
  const cap = spendCapUsd();
  const reserveAmount = reservationUsd();
  const day = utcDay();
  let reservation: { ok: boolean; usd: number };
  try {
    reservation = await spendStore.reserve(day, reserveAmount, cap);
  } catch (error) {
    await Promise.resolve(localSnapshot?.dispose?.()).catch(() => undefined);
    const category = categorizeScanError(error);
    return Response.json({ error: safeErrorMessage(category), category }, { status: 500 });
  }
  if (!reservation.ok) {
    await Promise.resolve(localSnapshot?.dispose?.()).catch(() => undefined);
    return Response.json({ error: "daily spend cap reached", category: "spend_cap" }, { status: 503 });
  }

  // 6. After a successful reservation: create the running job and scan.
  const id = randomUUID();
  const startedAt = Date.now();
  try {
    await scanJobs.create({
      id,
      engineVersion: ENGINE_VERSION,
      rubricVersion: RUBRIC_VERSION,
      promptVersion: PROMPT_VERSION,
    });
  } catch (error) {
    await Promise.resolve(localSnapshot?.dispose?.()).catch(() => undefined);
    await settleReservation(day, reserveAmount, 0, cap);
    const category = categorizeScanError(error);
    return Response.json({ error: safeErrorMessage(category), category }, { status: 500 });
  }

  try {
    let snapshot = localSnapshot;
    if (!snapshot) {
      if (validatedTarget.kind !== "github") {
        throw new Error("Internal scan error.");
      }
      snapshot = await core.createSnapshotFromGitHub(validatedTarget.url, { sha: resolvedSha });
    }
    localSnapshot = undefined; // ownership transferred

    let report: unknown;
    try {
      report = await core.scanSnapshot(snapshot, {});
    } finally {
      await Promise.resolve(snapshot?.dispose?.()).catch(() => undefined);
    }

    // 7. Success: save report/cache, record cost, complete job, settle actual.
    const slug = makeSlug();
    await store.reports.set(slug, { slug, report, public: false });
    if (cacheKey) {
      await store.reportCache.set(cacheKey, { slug, report, createdAt: Date.now() });
    }

    const meta = reportMeta(report);
    const costUsd = Number(meta.costUsd ?? 0);
    const usage = meta.usage;
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
      promptVersion: (meta.promptVersion as string | undefined) ?? PROMPT_VERSION,
    });
    await settleReservation(day, reserveAmount, costUsd, cap);

    return Response.json({
      id,
      status: "complete",
      slug,
      report,
      ...responseFields(report, { cached: false, cacheHit: false }),
    });
  } catch (error) {
    // 8. Failure after job creation: fail the job with the safe category and settle 0.
    await settleReservation(day, reserveAmount, 0, cap);
    const category = categorizeScanError(error);
    await scanJobs
      .fail(id, { errorCategory: category, durationMs: Date.now() - startedAt })
      .catch(() => undefined);
    const status =
      category === "invalid_input"
        ? 400
        : category === "repo_not_found"
          ? 404
          : category === "repo_too_large"
            ? 413
            : category === "provider_error" || category === "provider_rate_limited"
              ? 503
              : 500;
    return Response.json({ error: safeErrorMessage(category), category }, { status });
  } finally {
    await Promise.resolve(localSnapshot?.dispose?.()).catch(() => undefined);
  }
}
