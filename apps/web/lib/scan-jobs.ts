import { ensureSchema, getPool, hasDatabase } from "./db";

export type ScanStatus = "running" | "complete" | "failed";

export interface ScanJob {
  id: string;
  status: ScanStatus;
  createdAt: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  reportSlug: string | null;
  errorCategory: string | null;
  cacheHit: boolean;
  model: string | null;
  engineVersion: string;
  rubricVersion: string;
  promptVersion: string;
  costUsd: number;
}

export interface JobMetrics {
  total: number;
  complete: number;
  failed: number;
  running: number;
  failRate: number;
  medianDurationMs: number | null;
  p95DurationMs: number | null;
  cacheHitRate: number;
}

export interface ScanCost {
  scanId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  requests: number;
  costUsd: number;
}

interface ScanJobStore {
  create(input: {
    id: string;
    engineVersion: string;
    rubricVersion: string;
    promptVersion: string;
  }): Promise<ScanJob>;
  complete(
    id: string,
    input: {
      reportSlug: string;
      durationMs: number;
      cacheHit: boolean;
      costUsd: number;
      model: string | null;
      engineVersion: string;
      rubricVersion: string;
      promptVersion: string;
    }
  ): Promise<void>;
  fail(id: string, input: { errorCategory: string; durationMs: number }): Promise<void>;
  get(id: string): Promise<ScanJob | undefined>;
  list(limit: number): Promise<ScanJob[]>;
  metrics(sinceDays: number): Promise<JobMetrics>;
  recordCost(cost: ScanCost): Promise<void>;
  costSummary(sinceDays: number): Promise<{ totalUsd: number; averageUsd: number; medianUsd: number }>;
}

// Duration percentile definitions (keep memory and Postgres metrics aligned):
// - median: interpolated median (percentile_cont(0.5) in SQL)
// - p95: nearest-rank p95 (percentile_disc(0.95) in SQL)
function percentileNearestRank(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.max(0, Math.ceil(p * sorted.length) - 1);
  return sorted[index] ?? null;
}

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const a = sorted[mid - 1];
  const b = sorted[mid];
  if (a === undefined || b === undefined) return null;
  return (a + b) / 2;
}

function roundPct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function computeJobMetrics(jobs: ScanJob[]): JobMetrics {
  const total = jobs.length;
  const complete = jobs.filter((job) => job.status === "complete").length;
  const failed = jobs.filter((job) => job.status === "failed").length;
  const running = jobs.filter((job) => job.status === "running").length;
  const durations = jobs
    .filter((job) => typeof job.durationMs === "number")
    .map((job) => job.durationMs as number)
    .sort((a, b) => a - b);
  const cacheHits = jobs.filter((job) => job.status === "complete" && job.cacheHit).length;
  return {
    total,
    complete,
    failed,
    running,
    failRate: roundPct(failed, total),
    medianDurationMs: median(durations),
    p95DurationMs: percentileNearestRank(durations, 0.95),
    cacheHitRate: roundPct(cacheHits, complete),
  };
}

type ErrorLike = { code?: unknown; message?: unknown };

export function categorizeScanError(error: unknown): string {
  const e = (error && typeof error === "object" ? error : {}) as ErrorLike;
  const code = typeof e.code === "string" ? e.code : "";
  const message = typeof e.message === "string" ? e.message.toLowerCase() : String(error).toLowerCase();

  if (
    code === "invalid_url" ||
    code === "invalid_host" ||
    code === "invalid_repo" ||
    code === "path_traversal" ||
    code === "symlink_escape"
  ) {
    return "invalid_input";
  }
  if (code === "not_a_directory" || code === "github_commit_lookup_failed") {
    return "repo_not_found";
  }
  if (code === "file_cap_exceeded" || code === "size_cap_exceeded" || code === "github_tarball_failed") {
    return "repo_too_large";
  }
  if (message.includes("429") || message.includes("rate limit")) {
    return "provider_rate_limited";
  }
  if (
    code === "provider_error" ||
    message.includes("provider") ||
    message.includes("openrouter") ||
    message.includes("model") ||
    message.includes("timeout") ||
    message.includes("econn") ||
    message.includes("fetch failed")
  ) {
    return "provider_error";
  }
  return "internal_error";
}

export function safeErrorMessage(category: string): string {
  switch (category) {
    case "invalid_input":
      return "Invalid scan target.";
    case "repo_not_found":
      return "Repository not found.";
    case "repo_too_large":
      return "Repository exceeds scan limits.";
    case "provider_rate_limited":
      return "Scan provider rate limit exceeded. Please retry.";
    case "provider_error":
      return "Scan provider error. Please retry.";
    default:
      return "Internal scan error.";
  }
}

type MemoryState = { jobs: Map<string, ScanJob>; costs: ScanCost[] };
type GlobalJobs = typeof globalThis & { __busfactorScanJobs?: MemoryState };

function memoryState(): MemoryState {
  const g = globalThis as GlobalJobs;
  if (!g.__busfactorScanJobs) g.__busfactorScanJobs = { jobs: new Map(), costs: [] };
  return g.__busfactorScanJobs;
}

function cloneJob(job: ScanJob): ScanJob {
  return { ...job };
}

function nowIso(): string {
  return new Date().toISOString();
}

function createMemoryStore(): ScanJobStore {
  const state = memoryState();
  return {
    async create(input) {
      const now = nowIso();
      const job: ScanJob = {
        id: input.id,
        status: "running",
        createdAt: now,
        startedAt: now,
        completedAt: null,
        durationMs: null,
        reportSlug: null,
        errorCategory: null,
        cacheHit: false,
        model: null,
        engineVersion: input.engineVersion,
        rubricVersion: input.rubricVersion,
        promptVersion: input.promptVersion,
        costUsd: 0,
      };
      state.jobs.set(job.id, job);
      return cloneJob(job);
    },
    async complete(id, input) {
      const job = state.jobs.get(id);
      if (!job) return;
      job.status = "complete";
      job.completedAt = nowIso();
      job.durationMs = input.durationMs;
      job.reportSlug = input.reportSlug;
      job.cacheHit = input.cacheHit;
      job.costUsd = input.costUsd;
      job.model = input.model;
      job.engineVersion = input.engineVersion;
      job.rubricVersion = input.rubricVersion;
      job.promptVersion = input.promptVersion;
    },
    async fail(id, input) {
      const job = state.jobs.get(id);
      if (!job) return;
      job.status = "failed";
      job.completedAt = nowIso();
      job.durationMs = input.durationMs;
      job.errorCategory = input.errorCategory;
    },
    async get(id) {
      const job = state.jobs.get(id);
      return job ? cloneJob(job) : undefined;
    },
    async list(limit) {
      return [...state.jobs.values()]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
        .slice(0, Math.max(0, limit))
        .map(cloneJob);
    },
    async metrics(sinceDays) {
      const cutoff = Date.now() - Math.max(0, sinceDays) * 24 * 60 * 60 * 1000;
      const jobs = [...state.jobs.values()].filter((job) => Date.parse(job.createdAt) >= cutoff);
      return computeJobMetrics(jobs);
    },
    async recordCost(cost) {
      state.costs.push({ ...cost });
    },
    async costSummary(sinceDays) {
      const cutoff = Date.now() - Math.max(0, sinceDays) * 24 * 60 * 60 * 1000;
      // Memory costs don't have createdAt; include all for simplicity in no-db mode.
      void cutoff;
      const values = state.costs.map((cost) => cost.costUsd).sort((a, b) => a - b);
      if (values.length === 0) return { totalUsd: 0, averageUsd: 0, medianUsd: 0 };
      const totalUsd = values.reduce((sum, value) => sum + value, 0);
      const mid = Math.floor(values.length / 2);
      const medianUsd =
        values.length % 2 === 1 ? values[mid]! : (values[mid - 1]! + values[mid]!) / 2;
      return { totalUsd, averageUsd: totalUsd / values.length, medianUsd };
    },
  };
}

type JobRow = {
  id: string;
  status: ScanStatus;
  created_at: Date | string;
  started_at: Date | string;
  completed_at: Date | string | null;
  duration_ms: number | null;
  report_slug: string | null;
  error_category: string | null;
  cache_hit: boolean;
  model: string | null;
  engine_version: string | null;
  rubric_version: string | null;
  prompt_version: string | null;
  cost_usd: number | string | null;
};

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rowToJob(row: JobRow): ScanJob {
  return {
    id: String(row.id),
    status: row.status,
    createdAt: toIso(row.created_at) ?? nowIso(),
    startedAt: toIso(row.started_at) ?? nowIso(),
    completedAt: toIso(row.completed_at),
    durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
    reportSlug: row.report_slug ?? null,
    errorCategory: row.error_category ?? null,
    cacheHit: Boolean(row.cache_hit),
    model: row.model ?? null,
    engineVersion: row.engine_version ?? "",
    rubricVersion: row.rubric_version ?? "",
    promptVersion: row.prompt_version ?? "",
    costUsd: Number(row.cost_usd ?? 0),
  };
}

function createPostgresStore(): ScanJobStore {
  return {
    async create(input) {
      await ensureSchema();
      const result = await getPool().query<JobRow>(
        `INSERT INTO scan_jobs (id, status, engine_version, rubric_version, prompt_version)
         VALUES ($1, 'running', $2, $3, $4)
         RETURNING *`,
        [input.id, input.engineVersion, input.rubricVersion, input.promptVersion]
      );
      return rowToJob(result.rows[0]!);
    },
    async complete(id, input) {
      await ensureSchema();
      await getPool().query(
        `UPDATE scan_jobs
         SET status = 'complete',
             completed_at = now(),
             duration_ms = $2,
             report_slug = $3,
             cache_hit = $4,
             cost_usd = $5,
             model = $6,
             engine_version = $7,
             rubric_version = $8,
             prompt_version = $9
         WHERE id = $1`,
        [
          id,
          input.durationMs,
          input.reportSlug,
          input.cacheHit,
          input.costUsd,
          input.model,
          input.engineVersion,
          input.rubricVersion,
          input.promptVersion,
        ]
      );
    },
    async fail(id, input) {
      await ensureSchema();
      await getPool().query(
        `UPDATE scan_jobs
         SET status = 'failed',
             completed_at = now(),
             duration_ms = $2,
             error_category = $3
         WHERE id = $1`,
        [id, input.durationMs, input.errorCategory]
      );
    },
    async get(id) {
      await ensureSchema();
      const result = await getPool().query<JobRow>(`SELECT * FROM scan_jobs WHERE id = $1`, [id]);
      const row = result.rows[0];
      return row ? rowToJob(row) : undefined;
    },
    async list(limit) {
      await ensureSchema();
      const capped = Math.max(0, Math.floor(limit));
      const result = await getPool().query<JobRow>(
        `SELECT * FROM scan_jobs ORDER BY created_at DESC, id DESC LIMIT $1`,
        [capped]
      );
      return result.rows.map(rowToJob);
    },
    async metrics(sinceDays) {
      await ensureSchema();
      const days = Math.max(0, Math.floor(sinceDays));
      const result = await getPool().query(
        `SELECT
           count(*)::int AS total,
           count(*) FILTER (WHERE status = 'complete')::int AS complete,
           count(*) FILTER (WHERE status = 'failed')::int AS failed,
           count(*) FILTER (WHERE status = 'running')::int AS running,
           count(*) FILTER (WHERE status = 'complete' AND cache_hit = true)::int AS cache_hits,
           -- Percentile definitions (keep aligned with computeJobMetrics):
           -- median = interpolated median; p95 = nearest-rank p95.
           percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms)
             FILTER (WHERE duration_ms IS NOT NULL) AS median_duration_ms,
           percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms)
             FILTER (WHERE duration_ms IS NOT NULL) AS p95_duration_ms
         FROM scan_jobs
         WHERE created_at >= now() - ($1::text || ' days')::interval`,
        [String(days)]
      );
      const row = result.rows[0] ?? {};
      const total = Number(row.total ?? 0);
      const complete = Number(row.complete ?? 0);
      const failed = Number(row.failed ?? 0);
      const running = Number(row.running ?? 0);
      const cacheHits = Number(row.cache_hits ?? 0);
      const medianRaw = row.median_duration_ms;
      const p95Raw = row.p95_duration_ms;
      return {
        total,
        complete,
        failed,
        running,
        failRate: roundPct(failed, total),
        medianDurationMs: medianRaw === null || medianRaw === undefined ? null : Number(medianRaw),
        p95DurationMs: p95Raw === null || p95Raw === undefined ? null : Number(p95Raw),
        cacheHitRate: roundPct(cacheHits, complete),
      };
    },
    async recordCost(cost) {
      await ensureSchema();
      await getPool().query(
        `INSERT INTO scan_costs (
           scan_id, provider, model, input_tokens, output_tokens, cached_tokens, requests, cost_usd
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          cost.scanId,
          cost.provider,
          cost.model,
          cost.inputTokens,
          cost.outputTokens,
          cost.cachedTokens,
          cost.requests,
          cost.costUsd,
        ]
      );
    },
    async costSummary(sinceDays) {
      await ensureSchema();
      const days = Math.max(0, Math.floor(sinceDays));
      const result = await getPool().query(
        `SELECT
           COALESCE(sum(cost_usd), 0) AS total_usd,
           COALESCE(avg(cost_usd), 0) AS average_usd,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY cost_usd) AS median_usd
         FROM scan_costs
         WHERE created_at >= now() - ($1::text || ' days')::interval`,
        [String(days)]
      );
      const row = result.rows[0] ?? {};
      const median = row.median_usd;
      return {
        totalUsd: Number(row.total_usd ?? 0),
        averageUsd: Number(row.average_usd ?? 0),
        medianUsd: median === null || median === undefined ? 0 : Number(median),
      };
    },
  };
}

export const scanJobs: ScanJobStore = hasDatabase() ? createPostgresStore() : createMemoryStore();
