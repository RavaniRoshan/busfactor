# BusFactor Acquisition-to-Activation Funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing BusFactor scan pipeline durable and correctly measured, then connect the GitHub Pages marketing site to the hosted scanner with consent-gated analytics, UTM attribution, and a real KPI dashboard — so the PDR's demand and product gates can be evaluated on trustworthy data.

**Architecture:** Harden the existing Next.js/Neon application in place. No rewrite, no queue, no second database. Add durable relational records for waitlist, feedback, scan jobs, scan costs, and daily spend; persist every scan outcome; capture provider-reported token usage; pin report caching to the resolved commit SHA; replace the query-string admin token with a signed HttpOnly cookie. Add PostHog on both surfaces with a shared event vocabulary and consent gate, plus a server-side HogQL read path for the operator dashboard. The marketing site remains a static Vite app; it gains a primary scanner CTA, UTM propagation, and a conditional consented demo report.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Neon Postgres (`@neondatabase/serverless`), Vitest, Playwright, Vite 8, React 19, Tailwind CSS v4, PostHog (`posthog-js` plus the HogQL Query API).

**Spec:** `docs/PDR.md` and the user-supplied "BusFactor: Complete Product, Growth, Analytics & Monetization Master Plan" (2026-11-22), §3–§19. This plan implements the code-executable P0–P2 portion. P3–P6 remain gated by `AGENTS.md` §8/§13 and are listed under **Gated work** at the end.

## Global Constraints

- Node >= 20 (workspace `engines`); pnpm 10.15.0; TypeScript strict; Vitest; ESLint/Prettier. The standard gate is `pnpm gate` (typecheck + lint + test).
- Two separate deployables: marketing is static Vite on GitHub Pages under `/busfactor-landing-page/`; product is Next.js on Vercel. No shared runtime. Connect them with absolute URLs from environment variables.
- The hosted scanner accepts public `https://github.com/<owner>/<repo>` URLs only in production. Local filesystem paths remain CLI-only. Never execute submitted repository code.
- Never send raw repository contents, repository URLs, local paths, report bodies, secrets, email addresses, or customer data to analytics or logs.
- Use the existing Neon database and `@neondatabase/serverless`. Do not add an ORM, a migration framework, or a second database provider.
- No fabricated metrics, users, revenue, costs, demo reports, or feedback. Empty states must say `No data yet` or `Not tracked`.
- Third-party reports stay `noindex` by default. Publishing remains an explicit opt-in action.
- Admin access uses a signed HttpOnly cookie only. Query-string admin tokens are removed.
- Analytics is consent-gated. No session recording, no autocapture, no repository properties.
- No accounts, authentication for end users, billing, subscriptions, or checkout in this plan. They are gated by the PDR.
- Every task ends with its named tests passing and a commit. Do not claim a gate passed without the real command output.

## Review Focus

These are the failure modes most likely to hurt a real user if the tasks are implemented carelessly. Each has a test pinned to the owning task.

1. **A provider failure leaves a scan stuck in `running` and invisible in metrics.** A scan that throws must persist `status = failed` with a safe category and a completion timestamp. Test in Task 2.
2. **A repository changes but the same URL serves a stale cached report.** Cache identity must include the resolved commit SHA and engine/rubric/prompt versions; the SHA must be resolved before the cache lookup. Test in Task 5.
3. **A hostile target reaches internal infrastructure.** `file://`, `http://169.254.169.254/...`, `https://github.com.evil.com/...`, local paths, and redirecting fetches must be rejected before any outbound request. Test in Task 5.
4. **Two concurrent scans both pass the spend cap.** Reservations must be atomic in Postgres; only one of two scans may reserve the remaining budget. Test in Task 4.
5. **Admin access is forged or leaks through the URL.** A tampered or expired cookie must fail, a query-string token must never authorize, and feedback for a nonexistent report must be rejected. Tests in Tasks 1 and 6.
6. **Analytics leaks repository identity.** The event helper must drop target/repository/path properties. Test in Task 8.

---

## Current State (verified 2026-11-22)

The repositories below were cloned and inspected before writing this plan. The spec's snapshot is still accurate in the places this plan touches.

| Area | Verified current state | Path |
|---|---|---|
| Waitlist | Writes `data/waitlist.json` on the server filesystem | `apps/web/app/api/waitlist/route.ts` |
| Feedback | Writes `data/feedback.json`; does not verify the report exists | `apps/web/app/api/feedback/route.ts` |
| Scan job | Job is only written after success; failure returns an error and records nothing | `apps/web/app/api/scan/route.ts` |
| Spend | Lifetime cumulative counter, not date-keyed; no atomic reservation | `apps/web/lib/store.ts` |
| Cost | `costUsd: 0` hardcoded; provider usage discarded | `packages/core/src/scan.ts`, `packages/core/src/llm/*` |
| Cache | Keyed by raw submitted target; no commit SHA, TTL, or version | `apps/web/app/api/scan/route.ts` |
| Web input | Accepts local paths and resolves them server-side | `apps/web/app/api/scan/route.ts:58-61` |
| Admin | Token compared in a query parameter; no cookie session | `apps/web/app/admin/metrics/page.tsx` |
| Analytics | None in either repository | — |
| Marketing CTA | Hero is a copy-only CLI button; no link to the hosted app | `busfactor-landing-page/src/App.tsx:725-761` |
| Marketing SEO | `robots.index: true`, canonical, OG image, sitemap present; no `robots.txt` | `.figma/make/site.json`, `public/sitemap.xml` |
| Marketing tests | No test runner installed | `busfactor-landing-page/package.json` |

Existing strengths to preserve: the Neon KV store, report workspace, Playwright suite, `pnpm gate`, and the noindex report route already work. Do not replace them.

## File Structure

**Main app — new files**

- `apps/web/lib/db.ts` — single Neon pool, schema bootstrap for all relational tables, `hasDatabase()`.
- `apps/web/lib/records.ts` — waitlist and feedback validation plus durable reads/writes/deletes.
- `apps/web/lib/scan-jobs.ts` — job lifecycle, metrics, cost rows.
- `apps/web/lib/spend.ts` — date-keyed atomic daily spend ledger.
- `apps/web/lib/admin-auth.ts` — signed admin session cookie.
- `apps/web/lib/posthog.ts` — server-side HogQL summary query with graceful fallback.
- `apps/web/lib/metrics.ts` — pure dashboard aggregation and formatting.
- `apps/web/lib/analytics.ts` — client event helpers, consent, attribution, property sanitization.
- `apps/web/components/analytics-provider.tsx` — consent banner and PostHog initialization.
- `apps/web/components/tracked-link.tsx` — client link that emits a named event.
- `apps/web/components/report-trackers.tsx` — `report_viewed`, download, share, and badge tracking.
- `apps/web/app/admin/login/page.tsx` — operator login form.
- `apps/web/app/api/admin/session/route.ts` — login/logout.
- `apps/web/app/api/admin/waitlist/route.ts` — authenticated waitlist deletion.
- `apps/web/app/api/admin/feedback/route.ts` — authenticated feedback deletion.
- `apps/web/.env.example` — documented environment variables, no secrets.

**Main app — modified files**

- `apps/web/lib/store.ts` — reuse `db.ts`; remove the lifetime spend counter.
- `apps/web/app/api/waitlist/route.ts`, `apps/web/app/api/feedback/route.ts` — durable records plus rate limits.
- `apps/web/app/api/scan/route.ts` — validate input, resolve SHA, cache check, reserve spend, persist running/complete/failed, record cost.
- `apps/web/app/api/scan/[id]/route.ts` — read the relational job.
- `apps/web/app/admin/metrics/page.tsx` — six-section dashboard.
- `apps/web/app/r/[slug]/page.tsx` — tracked report actions, share link, report view event.
- `apps/web/components/scan-form.tsx` — hosted-only input copy, lifecycle events, cached/duration display.
- `apps/web/app/scan/page.tsx`, `app/docs/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/removal/page.tsx` — accurate hosted-vs-CLI and retention copy.
- `apps/web/components/site-chrome.tsx` — link back to the marketing site.
- `apps/web/app/layout.tsx` — analytics provider.
- `apps/web/next.config.mjs` — PostHog `connect-src` in the CSP.
- `playwright.config.ts`, `tests/functional.spec.ts`, `tests/accessibility.spec.ts`, `apps/web/app-shell.test.ts` — updated for cookie auth and hosted-only input.
- `packages/core/src/snapshot.ts`, `llm/*`, `scan.ts`, `types.ts`, `version.ts`, `index.ts` — SHA resolution, fetch hardening, usage/cost, prompt version.

**Marketing — new files**

- `src/lib/app-links.ts` — absolute app URL builder with UTM propagation (pure, tested).
- `src/lib/app-links.test.ts`.
- `src/lib/analytics.ts` — consent-gated PostHog wrapper and event properties.
- `src/components/ConsentBanner.tsx`.
- `src/components/AppLink.tsx` — tracked outbound link.
- `src/components/ViewTracker.tsx` — one-shot IntersectionObserver event.
- `.env.example`, `public/robots.txt`.

**Marketing — modified files**

- `src/App.tsx` — hero/nav/footer CTAs, “after scan”, free-hosted, conditional demo, tracking.
- `src/docs/content.ts` — hosted scan vs CLI distinction.
- `src/docs/DocsPage.tsx` — link to the hosted scanner and app docs.
- `vite.config.ts` — no change expected; env is read through `import.meta.env`.
- `src/vite-env.d.ts` — typed env.
- `package.json` — `posthog-js`, `vitest`, `test`, `typecheck`.
- `.github/workflows/deploy.yml` — build-time env from repository variables.

---

## Task 1: Durable Waitlist and Feedback in Neon

**Files:**
- Create: `apps/web/lib/db.ts`
- Create: `apps/web/lib/records.ts`
- Create: `apps/web/lib/records.test.ts`
- Modify: `apps/web/lib/store.ts`
- Modify: `apps/web/app/api/waitlist/route.ts`
- Modify: `apps/web/app/api/feedback/route.ts`
- Modify: `apps/web/app/admin/metrics/page.tsx` (remove JSON-file reads only)

**Interfaces:**
- Consumes: existing `store.reports.get(slug)` and `store.rateLimits.consume(key, day, max)`.
- Produces:
  - `hasDatabase(): boolean`, `getPool(): Pool`, `ensureSchema(): Promise<void>` from `lib/db.ts`.
  - `normalizeEmail(raw: unknown): string | null`.
  - `normalizeFeedback(raw: unknown): { reportSlug: string; helpful: boolean; note: string } | null`.
  - `records.addWaitlist({ email, source?, campaign? }): Promise<{ created: boolean }>`.
  - `records.addFeedback({ reportSlug, helpful, note? }): Promise<{ id: string }>`.
  - `records.countWaitlist(): Promise<number>`.
  - `records.feedbackSummary(): Promise<{ yes: number; no: number; answered: number }>`.
  - `records.deleteWaitlist(email: string): Promise<number>`.
  - `records.deleteFeedback(id: string): Promise<boolean>`.

**Schema (exact):**

```sql
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  source text,
  campaign text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','unsubscribed','deleted'))
);
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_entries_email_lower_idx
  ON waitlist_entries (lower(email));
CREATE INDEX IF NOT EXISTS waitlist_entries_created_at_idx
  ON waitlist_entries (created_at DESC);

CREATE TABLE IF NOT EXISTS report_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_slug text NOT NULL,
  helpful boolean NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_feedback_slug_idx ON report_feedback (report_slug);
CREATE INDEX IF NOT EXISTS report_feedback_created_at_idx
  ON report_feedback (created_at DESC);
```

- [ ] **Step 1: Write the failing records tests**

```ts
import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizeFeedback, records } from "./records";

describe("durable records", () => {
  it("normalizes and rejects email input", () => {
    expect(normalizeEmail("  User@Example.com ")).toBe("user@example.com");
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail("a".repeat(250) + "@example.com")).toBeNull();
  });

  it("normalizes feedback and requires a boolean", () => {
    expect(normalizeFeedback({ slug: "abc123", helpful: true })).toEqual({
      reportSlug: "abc123",
      helpful: true,
      note: "",
    });
    expect(normalizeFeedback({ slug: "abc123", helpful: "yes" })).toBeNull();
    expect(normalizeFeedback({ slug: "", helpful: true })).toBeNull();
  });

  it("does not create duplicate waitlist entries", async () => {
    const email = `dup-${Date.now()}@example.com`;
    expect((await records.addWaitlist({ email })).created).toBe(true);
    expect((await records.addWaitlist({ email: email.toUpperCase() })).created).toBe(false);
    expect(await records.countWaitlist()).toBeGreaterThan(0);
  });

  it("summarizes explicit feedback answers", async () => {
    await records.addFeedback({ reportSlug: `r-${Date.now()}`, helpful: true });
    await records.addFeedback({ reportSlug: `r-${Date.now()}`, helpful: false });
    const summary = await records.feedbackSummary();
    expect(summary.answered).toBe(summary.yes + summary.no);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @busfactor/web exec vitest run lib/records.test.ts`
Expected: FAIL because `./records` does not exist. The test suite assumes `DATABASE_URL` is unset so the memory adapter runs; do not add a test database.

- [ ] **Step 3: Implement `lib/db.ts`, `lib/records.ts`, and reuse the pool from `store.ts`**

`db.ts` owns the only `Pool` instance and one `ensureSchema()` promise. Move the connection-string lookup and `neonConfig.poolQueryViaFetch` setup out of `store.ts`. `ensureSchema()` creates `busfactor_store` plus the new tables; `store.ts` imports `getPool`/`ensureSchema` from `db.ts` and no longer opens its own pool. `records.ts` selects a Postgres implementation when `hasDatabase()` is true and an in-memory implementation otherwise, so Vitest works without `DATABASE_URL`.

Validation rules: email is trimmed, lowercased, must match a single-address shape and be at most 254 characters; `source`/`campaign` are trimmed to 64 characters; feedback slug must match `^[a-z0-9-]{3,64}$`; note is trimmed and capped at 1000 characters; `helpful` must be a boolean. Insert waitlist with `ON CONFLICT (lower(email)) DO NOTHING` and return `created` from `rowCount === 1`.

- [ ] **Step 4: Rewrite the waitlist and feedback routes**

Waitlist route: parse JSON, normalize, return `400` for invalid input; consume `waitlist:${hashIp(ip)}` with a daily max of 5; call `records.addWaitlist` with optional `source`/`campaign`; always return `{ ok: true }` for a valid email so the endpoint does not reveal whether an address is already present. Never log the email.

Feedback route: parse JSON, normalize, return `400` for invalid input; consume `feedback:${hashIp(ip)}` with a daily max of 20; verify `await store.reports.get(reportSlug)` exists and return `404` if not; insert the feedback; return `{ ok: true }`. Remove `node:fs` imports from both routes.

- [ ] **Step 5: Replace JSON-file reads in the admin page**

Read waitlist count and feedback summary from `records` instead of `data/*.json`. Keep the existing “Email addresses are never displayed” note. This task only swaps the data source; Task 7 rewrites the whole dashboard.

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm --filter @busfactor/web exec vitest run lib/records.test.ts lib/store.test.ts`
Expected: PASS.
Run: `pnpm --filter @busfactor/web typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/db.ts apps/web/lib/records.ts apps/web/lib/records.test.ts apps/web/lib/store.ts apps/web/app/api/waitlist/route.ts apps/web/app/api/feedback/route.ts apps/web/app/admin/metrics/page.tsx
git commit -m "feat: persist waitlist and feedback in Neon"
```

---

## Task 2: Persist Every Scan Job Outcome

**Files:**
- Create: `apps/web/lib/scan-jobs.ts`
- Create: `apps/web/lib/scan-jobs.test.ts`
- Modify: `apps/web/app/api/scan/route.ts`
- Modify: `apps/web/app/api/scan/[id]/route.ts`
- Modify: `apps/web/app/admin/metrics/page.tsx` (use job list instead of `store.jobs`)
- Modify: `apps/web/app-shell.test.ts`
- Modify: `apps/web/store.test.ts`

**Interfaces:**
- Consumes: `hasDatabase`, `getPool`, `ensureSchema` from Task 1; `store.reports`, `store.reportCache`, `store.rateLimits`.
- Produces:
  - `type ScanStatus = "running" | "complete" | "failed"`.
  - `interface ScanJob { id; status; createdAt; startedAt; completedAt; durationMs; reportSlug; errorCategory; cacheHit; model; engineVersion; rubricVersion; promptVersion; costUsd }`.
  - `interface JobMetrics { total; complete; failed; running; failRate; medianDurationMs; p95DurationMs; cacheHitRate }`.
  - `interface ScanCost { scanId; provider; model; inputTokens; outputTokens; cachedTokens; requests; costUsd }`.
  - `scanJobs.create({ id, engineVersion, rubricVersion, promptVersion }): Promise<ScanJob>`.
  - `scanJobs.complete(id, { reportSlug, durationMs, cacheHit, costUsd, model, engineVersion, rubricVersion, promptVersion }): Promise<void>`.
  - `scanJobs.fail(id, { errorCategory, durationMs }): Promise<void>`.
  - `scanJobs.get(id): Promise<ScanJob | undefined>`.
  - `scanJobs.list(limit): Promise<ScanJob[]>`.
  - `scanJobs.metrics(sinceDays): Promise<JobMetrics>`.
  - `scanJobs.recordCost(cost: ScanCost): Promise<void>`.
  - `scanJobs.costSummary(sinceDays): Promise<{ totalUsd; averageUsd; medianUsd }>`.
  - `computeJobMetrics(jobs: ScanJob[]): JobMetrics`.
  - `categorizeScanError(error: unknown): string`.

**Schema additions:** `scan_jobs` and `scan_costs` exactly as listed in Task 1's `db.ts` implementation; use the columns from the spec (`created_at`, `started_at`, `completed_at`, `duration_ms`, `report_slug`, `error_category`, `cache_hit`, `model`, `engine_version`, `rubric_version`, `prompt_version`, `cost_usd`, plus `scan_costs.provider`, `input_tokens`, `output_tokens`, `cached_tokens`, `requests`).

- [ ] **Step 1: Write the failing job lifecycle and metrics tests**

```ts
import { describe, expect, it } from "vitest";
import { computeJobMetrics, scanJobs } from "./scan-jobs";

const base = {
  createdAt: "2026-11-22T00:00:00.000Z",
  startedAt: "2026-11-22T00:00:00.000Z",
  completedAt: "2026-11-22T00:00:01.000Z",
  reportSlug: null,
  errorCategory: null,
  cacheHit: false,
  model: null,
  engineVersion: "0.1.0",
  rubricVersion: "0.1.0",
  promptVersion: "0.1.0",
  costUsd: 0,
} as const;

it("persists a running job, then a completed job", async () => {
  const id = `job-${Date.now()}`;
  await scanJobs.create({ id, engineVersion: "0.1.0", rubricVersion: "0.1.0", promptVersion: "0.1.0" });
  expect((await scanJobs.get(id))?.status).toBe("running");
  await scanJobs.complete(id, {
    reportSlug: "abc123",
    durationMs: 42000,
    cacheHit: false,
    costUsd: 0.001,
    model: "openai/gpt-oss-20b",
    engineVersion: "0.1.0",
    rubricVersion: "0.1.0",
    promptVersion: "0.1.0",
  });
  expect(await scanJobs.get(id)).toMatchObject({ status: "complete", reportSlug: "abc123", durationMs: 42000 });
});

it("persists a failed job with a safe category", async () => {
  const id = `job-${Date.now()}-fail`;
  await scanJobs.create({ id, engineVersion: "0.1.0", rubricVersion: "0.1.0", promptVersion: "0.1.0" });
  await scanJobs.fail(id, { errorCategory: "provider_error", durationMs: 12000 });
  expect(await scanJobs.get(id)).toMatchObject({ status: "failed", errorCategory: "provider_error" });
});

it("computes median, p95 and fail rate", () => {
  const jobs = [1000, 2000, 3000, 4000].map((durationMs, index) => ({
    ...base,
    id: `j${index}`,
    status: index === 3 ? ("failed" as const) : ("complete" as const),
    durationMs,
  }));
  expect(computeJobMetrics(jobs)).toMatchObject({
    total: 4,
    failed: 1,
    failRate: 25,
    medianDurationMs: 2500,
    p95DurationMs: 4000,
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @busfactor/web exec vitest run lib/scan-jobs.test.ts`
Expected: FAIL because `./scan-jobs` does not exist.

- [ ] **Step 3: Implement `scan-jobs.ts` with Postgres and memory adapters**

Use `ensureSchema()` before every operation. `create` inserts `status = 'running'`, `started_at = now()`. `complete` sets `status = 'complete'`, `completed_at = now()`, `duration_ms`, `report_slug`, `cache_hit`, `cost_usd`, and version/model fields. `fail` sets `status = 'failed'`, `completed_at = now()`, `duration_ms`, and `error_category` only; never store `error.message`. `metrics` filters by `created_at >= now() - ($1 || ' days')::interval`, computes counts in SQL where practical, and uses `percentile_cont(0.5)`/`percentile_cont(0.95)` for durations. The memory adapter must implement the same behavior for tests.

Percentiles: nearest-rank on the sorted duration array (`Math.ceil(p * n) - 1`), null when no completed durations exist. `failRate` is rounded to an integer percentage. `cacheHitRate` is complete cache hits divided by complete jobs, rounded, 0 when none.

`categorizeScanError` maps: `SnapshotError.code` values `invalid_url`, `invalid_host`, `invalid_repo`, `path_traversal`, `symlink_escape` → `invalid_input`; `not_a_directory`/`github_commit_lookup_failed` → `repo_not_found`; `file_cap_exceeded`/`size_cap_exceeded`/`github_tarball_failed` → `repo_too_large`; messages containing `429` or `rate limit` → `provider_rate_limited`; everything else → `provider_error` or `internal_error`. Keep the mapping pure and tested.

- [ ] **Step 4: Record the running job before the scan and every outcome after it**

In `POST /api/scan`, after validation/rate limit and before the cache/scan work:

```ts
const id = randomUUID();
const startedAt = Date.now();
await scanJobs.create({ id });
```

Replace the success path's `store.jobs.set` with `scanJobs.complete(id, ...)`. In the `catch`, call `scanJobs.fail(id, { errorCategory: categorizeScanError(error), durationMs: Date.now() - startedAt })`, then return `{ error: safeMessage(category), category }` with status 500. The message must be one of the safe category labels; never return `error.message`. For a cache hit, still create a complete job with `cacheHit: true`, `durationMs: 0`, and `costUsd: 0`.

- [ ] **Step 5: Point `/api/scan/[id]` and the dashboard at the new job store**

`GET /api/scan/[id]` returns `scanJobs.get(id)` or 404. Update the dashboard's job table to `await scanJobs.list(20)` and its counts to `await scanJobs.metrics(30)`. Update `app-shell.test.ts` so it no longer asserts `store.jobs.values()`, and remove the obsolete job test from `store.test.ts`.

- [ ] **Step 6: Run tests, typecheck, and lint**

Run: `pnpm --filter @busfactor/web exec vitest run lib/scan-jobs.test.ts store.test.ts app-shell.test.ts`
Expected: PASS.
Run: `pnpm gate`
Expected: PASS. If the core build is required first, run `pnpm verify:build` once.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/scan-jobs.ts apps/web/lib/scan-jobs.test.ts apps/web/app/api/scan/route.ts 'apps/web/app/api/scan/[id]/route.ts' apps/web/app/admin/metrics/page.tsx apps/web/app-shell.test.ts apps/web/store.test.ts
git commit -m "feat: persist scan job lifecycle and metrics"
```

---

## Task 3: Provider-Reported Token Usage and Cost Accounting

**Files:**
- Modify: `packages/core/src/llm/provider.ts`
- Modify: `packages/core/src/llm/groq.ts`
- Modify: `packages/core/src/llm/anthropic.ts`
- Modify: `packages/core/src/llm/mock.ts`
- Create: `packages/core/src/llm/cost.ts`
- Create: `packages/core/src/llm/cost.test.ts`
- Modify: `packages/core/src/scan.ts`
- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/src/version.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/src/__snapshots__/types.test.ts.snap`
- Modify: `apps/web/app/api/scan/route.ts` (record the cost row)

**Interfaces:**
- Consumes: `scanJobs.recordCost` and `scanJobs.complete` from Task 2.
- Produces:
  - `interface LLMUsage { provider: string; model: string; inputTokens: number; outputTokens: number; cachedTokens: number; requests: number }`.
  - `LLMProvider.getUsage?(): LLMUsage`.
  - `emptyUsage(provider: string, model?: string): LLMUsage`.
  - `estimateCostUsd(usage: LLMUsage, rate?: ModelRate): number`.
  - `rateFor(usage: { provider: string; model: string }, rawJson?: string): ModelRate | undefined`.
  - `report.meta.promptVersion: string` and `report.meta.usage: LLMUsage`.

- [ ] **Step 1: Write the failing usage and cost tests**

Add to `packages/core/src/llm/groq.test.ts`:

```ts
it("accumulates provider-reported token usage across calls", async () => {
  const fetchImpl = vi.fn(async () =>
    jsonResponse({
      choices: [{ message: { content: "{}" } }],
      usage: { prompt_tokens: 120, completion_tokens: 30 },
    })
  );
  const provider = new GroqProvider({ apiKey: "k", fetchImpl });
  await provider.complete({ system: "s", user: "u" });
  await provider.complete({ system: "s", user: "u" });
  expect(provider.getUsage()).toEqual({
    provider: "groq",
    model: "openai/gpt-oss-20b",
    inputTokens: 240,
    outputTokens: 60,
    cachedTokens: 0,
    requests: 2,
  });
});
```

Create `packages/core/src/llm/cost.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { estimateCostUsd, rateFor } from "./cost.js";

const usage = {
  provider: "groq",
  model: "openai/gpt-oss-20b",
  inputTokens: 1_000_000,
  outputTokens: 500_000,
  cachedTokens: 0,
  requests: 1,
};

it("prices input and output tokens per million", () => {
  expect(estimateCostUsd(usage, { inputPerMTokUsd: 0.075, outputPerMTokUsd: 0.3 })).toBeCloseTo(0.225);
});

it("returns zero when no rate is configured", () => {
  expect(estimateCostUsd(usage)).toBe(0);
});

it("reads rates from a provider/model JSON map", () => {
  const raw = JSON.stringify({ "groq/openai/gpt-oss-20b": { inputPerMTokUsd: 1, outputPerMTokUsd: 2 } });
  expect(rateFor(usage, raw)).toEqual({ inputPerMTokUsd: 1, outputPerMTokUsd: 2 });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @ravaniroshan/busfactor-core exec vitest run src/llm/cost.test.ts src/llm/groq.test.ts`
Expected: FAIL because `getUsage`/`cost.js` do not exist.

- [ ] **Step 3: Implement usage capture and cost calculation**

Add `LLMUsage` and `getUsage?()` to `provider.ts`. Add `readonly model` to both providers (Groq default `openai/gpt-oss-20b`, Anthropic default from `BUSFACTOR_MODEL`). Each provider keeps a private mutable accumulator; `complete` adds `requests += 1` and, when the response body has a `usage` object, adds `prompt_tokens`/`completion_tokens` (Groq) or `input_tokens`/`output_tokens`/`cache_read_input_tokens` (Anthropic). Missing usage fields default to 0; never throw because usage is absent. `MockProvider` and `HeuristicProvider` return zeroed usage with their own names.

`cost.ts` exports `ModelRate`, `estimateCostUsd`, and `rateFor`. `rateFor` reads `BUSFACTOR_LLM_RATES_JSON` when `rawJson` is not supplied, parses it defensively (malformed JSON → undefined), and looks up `${provider}/${model}`. No rate means cost 0; the usage record is still stored. This is deliberate: Groq's free tier has no billed inference cost, and paid rates must be supplied by the operator rather than invented in code.

In `scan.ts`, after `runLlmPasses`, call `const usage = provider.getUsage?.() ?? emptyUsage(provider.name)` and `const costUsd = estimateCostUsd(usage, rateFor(usage))`. Add `usage` and `promptVersion: PROMPT_VERSION` to `report.meta`. Add `PROMPT_VERSION = "0.1.0"` to `version.ts`.

In `types.ts`, add a strict `llmUsageSchema` with nonnegative integer fields and require it in `reportMetaSchema`; add `promptVersion`. Update snapshots with `pnpm --filter @ravaniroshan/busfactor-core exec vitest run -u`.

In the web scan route, after a successful scan and before `scanJobs.complete`, call:

```ts
await scanJobs.recordCost({
  scanId: id,
  provider: report.meta.usage.provider,
  model: report.meta.usage.model,
  inputTokens: report.meta.usage.inputTokens,
  outputTokens: report.meta.usage.outputTokens,
  cachedTokens: report.meta.usage.cachedTokens,
  requests: report.meta.usage.requests,
  costUsd: report.meta.costUsd,
});
```

Pass `model: report.meta.usage.model`, `costUsd: report.meta.costUsd`, and `promptVersion: report.meta.promptVersion` to `scanJobs.complete`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @ravaniroshan/busfactor-core exec vitest run src/llm/cost.test.ts src/llm/groq.test.ts src/scan.test.ts`
Expected: PASS.
Run: `pnpm gate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/llm packages/core/src/scan.ts packages/core/src/types.ts packages/core/src/version.ts packages/core/src/index.ts packages/core/src/__snapshots__ apps/web/app/api/scan/route.ts
git commit -m "feat: measure LLM token usage and scan cost"
```

---

## Task 4: Atomic Daily Spend Ledger

**Files:**
- Create: `apps/web/lib/spend.ts`
- Create: `apps/web/lib/spend.test.ts`
- Modify: `apps/web/lib/db.ts` (add `daily_spend`)
- Modify: `apps/web/lib/store.ts` (remove the lifetime `spend` store)
- Modify: `apps/web/store.test.ts`
- Modify: `apps/web/app/api/scan/route.ts`

**Interfaces:**
- Produces:
  - `utcDay(now?: Date): string` (`YYYY-MM-DD` in UTC).
  - `spendStore.get(day: string): Promise<number>`.
  - `spendStore.reserve(day: string, amountUsd: number, capUsd: number): Promise<{ ok: boolean; usd: number }>`.
  - `spendStore.settle(day: string, reservedUsd: number, actualUsd: number): Promise<{ usd: number }>`.

- [ ] **Step 1: Write the failing concurrency test**

```ts
import { describe, expect, it } from "vitest";
import { spendStore } from "./spend";

it("allows only reservations that fit under the daily cap", async () => {
  const day = `test-${Date.now()}`;
  const results = await Promise.all([
    spendStore.reserve(day, 0.02, 0.05),
    spendStore.reserve(day, 0.02, 0.05),
    spendStore.reserve(day, 0.02, 0.05),
  ]);
  expect(results.filter((result) => result.ok)).toHaveLength(2);
  expect(await spendStore.get(day)).toBeCloseTo(0.04);
});

it("settles a reservation down to the actual cost", async () => {
  const day = `test-${Date.now()}-settle`;
  await spendStore.reserve(day, 0.02, 1);
  await spendStore.settle(day, 0.02, 0.005);
  expect(await spendStore.get(day)).toBeCloseTo(0.005);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @busfactor/web exec vitest run lib/spend.test.ts`
Expected: FAIL because `./spend` does not exist. The test uses the memory adapter; keep `DATABASE_URL` unset.

- [ ] **Step 3: Implement the atomic ledger**

Postgres table:

```sql
CREATE TABLE IF NOT EXISTS daily_spend (
  day date PRIMARY KEY,
  usd numeric(12,6) NOT NULL DEFAULT 0
);
```

Reservation must be one statement:

```sql
INSERT INTO daily_spend (day, usd) VALUES ($1, $2)
ON CONFLICT (day) DO UPDATE SET usd = daily_spend.usd + $2
WHERE daily_spend.usd + $2 <= $3
RETURNING usd;
```

If no row is returned, the reservation was refused; read the current value and return `{ ok: false, usd }`. Settlement is one statement: `UPDATE daily_spend SET usd = GREATEST(0, usd - $2 + $3) WHERE day = $1 RETURNING usd`. The memory adapter must serialize reservations through a single promise chain or perform the check-and-add synchronously; `Promise.all` in the test must still yield exactly two successes.

- [ ] **Step 4: Integrate reservation and settlement into the scan route**

Read `BUSFACTOR_DAILY_SPEND_CAP_USD` (default `10`) and `BUSFACTOR_SCAN_RESERVATION_USD` (default `0.05`). Resolve the cache first; only a cache miss reserves budget. On a refused reservation return `503 { error: "daily spend cap reached" }` without creating a job. After the scan, settle with the actual `report.meta.costUsd`; on any failure settle with `0`. Settlement failure must not change the scan response; it may be retried by the next request only if the code records it, so keep it best-effort and never log repository data.

Optional alert: if `BUSFACTOR_ALERT_WEBHOOK_URL` is set and the settled ledger is at or above 80% of the cap, POST `{ type: "spend_warning", day, usd, cap }` fire-and-forget. Do not let an alert failure block or fail a scan.

- [ ] **Step 5: Remove the lifetime counter**

Delete the `SpendStore` interface, memory `spend` map, Postgres `spend` implementation, and the `accumulates spend` test. Update any imports. The admin dashboard's “current spending” value comes from `spendStore.get(utcDay())` in Task 7.

- [ ] **Step 6: Run tests and the gate**

Run: `pnpm --filter @busfactor/web exec vitest run lib/spend.test.ts store.test.ts`
Expected: PASS.
Run: `pnpm gate`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/spend.ts apps/web/lib/spend.test.ts apps/web/lib/db.ts apps/web/lib/store.ts apps/web/store.test.ts apps/web/app/api/scan/route.ts
git commit -m "feat: add atomic daily spend reservations"
```

---

## Task 5: GitHub-Only Hosted Input, SHA-Pinned Cache, and Fetch Hardening

**Files:**
- Modify: `packages/core/src/snapshot.ts`
- Modify: `packages/core/src/snapshot.test.ts`
- Create: `packages/core/src/report-cache.ts`
- Create: `packages/core/src/report-cache.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/src/scan.ts` (dispose snapshots on failure)
- Create: `apps/web/lib/scan-target.ts`
- Create: `apps/web/lib/scan-target.test.ts`
- Modify: `apps/web/lib/store.ts` (cache entry `createdAt`)
- Modify: `apps/web/app/api/scan/route.ts`
- Modify: `apps/web/components/scan-form.tsx`
- Modify: `apps/web/app/scan/page.tsx`
- Modify: `apps/web/app/docs/page.tsx`
- Modify: `playwright.config.ts`
- Modify: `tests/functional.spec.ts`
- Modify: `tests/accessibility.spec.ts`

**Interfaces:**
- Consumes: `scanJobs`, `spendStore`, `store.reportCache`, `store.reports`.
- Produces:
  - `resolveGitHubRepo(input: string, options?: SnapshotOptions): Promise<{ owner: string; repo: string; sha: string; canonicalUrl: string }>`.
  - `createSnapshotFromGitHub(input: string, options: SnapshotOptions & { sha?: string }): Promise<Snapshot>`.
  - `reportCacheKey(input: { owner; repo; sha; engineVersion; rubricVersion; promptVersion }): string`.
  - `validateHostedTarget(raw: string, allowLocal: boolean): { kind: "github"; url: string } | { kind: "local"; path: string }` (throws `SnapshotError` for rejected input).
  - Cache value: `{ report: unknown; slug: string; createdAt?: number }`.

- [ ] **Step 1: Write the failing input and cache tests**

```ts
import { describe, expect, it } from "vitest";
import { parseGitHubUrl, resolveGitHubRepo } from "./snapshot.js";
import { reportCacheKey } from "./report-cache.js";

it("rejects non-GitHub and internal hosts", () => {
  expect(() => parseGitHubUrl("https://github.com.evil.com/a/b")).toThrow();
  expect(() => parseGitHubUrl("http://169.254.169.254/a/b")).toThrow();
  expect(() => parseGitHubUrl("file:///etc/passwd")).toThrow();
  expect(() => parseGitHubUrl("https://github.com/owner")).toThrow();
});

it("keys cache identity by commit and prompt/rubric versions", () => {
  const base = { owner: "a", repo: "b", sha: "1".repeat(40), engineVersion: "e", rubricVersion: "r", promptVersion: "p" };
  expect(reportCacheKey(base)).not.toBe(reportCacheKey({ ...base, sha: "2".repeat(40) }));
  expect(reportCacheKey(base)).not.toBe(reportCacheKey({ ...base, promptVersion: "p2" }));
});
```

Add to `snapshot.test.ts` a mocked-fetch test asserting the commit lookup and tarball request both use `redirect: "error"`, a timeout signal, and an `Authorization` header when a token is supplied.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @ravaniroshan/busfactor-core exec vitest run src/snapshot.test.ts src/report-cache.test.ts`
Expected: FAIL because `resolveGitHubRepo`/`report-cache` support is missing.

- [ ] **Step 3: Harden GitHub fetching and expose SHA resolution**

`parseGitHubUrl` must require exactly `https:` or `http:` and hostname `github.com`; validate owner/repo against `^[A-Za-z0-9_.-]{1,100}$` and reject `.`/`..`. `resolveGitHubRepo` calls `api.github.com/repos/<owner>/<repo>/commits[ /<ref>]` with `Accept: application/vnd.github+json`, `User-Agent: BusFactor`, optional `Authorization: Bearer ${GITHUB_TOKEN}`, `redirect: "error"`, and `signal: AbortSignal.timeout(options.timeoutMs ?? 20000)`. It returns the SHA and canonical `https://github.com/<lowercase owner>/<lowercase repo>`.

`createSnapshotFromGitHub` accepts `options.sha`; when present and 40 hex characters, skip the commit lookup and download `https://codeload.github.com/<owner>/<repo>/tar.gz/<sha>`. Use the same `redirect: "error"` and timeout signal. Check `content-length` before downloading and the actual byte length after; reject over `sizeCapBytes`. Keep the tar filter that rejects absolute paths, `..`, and link entries.

Add `GITHUB_TOKEN` to the request headers only when set. Never log the token.

- [ ] **Step 4: Ensure snapshots are disposed on every path**

`scanTarget` must use `try/finally` around `scanSnapshot` and call `snapshot.dispose?.()` even when the scan throws. Add a unit test with a fake snapshot that records `dispose` and a provider that throws; expect `dispose` to be called once.

- [ ] **Step 5: Implement the hosted target validator and rewrite the scan route order**

`apps/web/lib/scan-target.ts`:

```ts
export function validateHostedTarget(raw: string, allowLocal: boolean) {
  if (allowLocal && !/^https?:\/\//i.test(raw)) return { kind: "local", path: raw } as const;
  if (!/^https:\/\//i.test(raw)) throw new SnapshotError("invalid_url", "Only public GitHub URLs are supported");
  const parsed = parseGitHubUrl(raw);
  return { kind: "github", url: raw } as const;
}
```

Production must pass `allowLocal = false`. Playwright sets `BUSFACTOR_ALLOW_LOCAL_TARGETS=1` in `playwright.config.ts` so the existing fixture scans keep working. Add a unit test that `allowLocal: false` rejects `fixtures/repos/clean` and `file:///etc/passwd`.

Final scan route order:

1. Kill switch → 503.
2. Parse body and validate target (hosted-only unless the test flag is on).
3. Rate limit by hashed IP (10/day).
4. For GitHub targets: `resolveGitHubRepo`; for local test targets: create the snapshot and use its SHA.
5. Build `reportCacheKey` from owner/repo/SHA plus `ENGINE_VERSION`, `RUBRIC_VERSION`, `PROMPT_VERSION`. Local test targets skip the cache because they have no canonical repository identity.
6. Create a `running` job.
7. Read `store.reportCache.get(key)`; if fresh (`createdAt` within `BUSFACTOR_CACHE_TTL_HOURS`, default 720) complete the job with `cacheHit: true`, return the cached report and `cached: true`.
8. Reserve daily spend; on refusal fail the job with `error_category: "spend_cap"` and return 503.
9. Create the snapshot pinned to the resolved SHA, scan, save the report, write the cache entry with `createdAt: Date.now()`, record the cost, complete the job, settle spend.
10. On any error: fail the job with the safe category, settle spend with 0, return `{ error, category }` with a safe message.

Cache TTL: treat entries with no `createdAt` as stale. Keep the report itself in `store.reports` indefinitely until removal.

- [ ] **Step 6: Update the scanner UI and docs copy**

`scan-form.tsx`: placeholder `https://github.com/owner/repo`; helper text `Public GitHub repositories only. For local folders, use the CLI. Nothing is executed.` Keep the existing progress/elapsed behavior. Parse JSON errors into `{error, category}`; display the safe message. If the response has `cached: true`, show a small `Cached result` badge.

`app/scan/page.tsx` metadata description: “Scan a public GitHub repository with BusFactor and get an operability verdict.” Add a sentence linking local-path users to `/docs` and the CLI.

`app/docs/page.tsx`: state that the hosted scanner accepts public GitHub URLs only; local paths are for `npx busfactor scan ./my-repo`. Do not claim npm publication; say “when published” or point to the repository.

- [ ] **Step 7: Update the Playwright fixtures**

Add `BUSFACTOR_ALLOW_LOCAL_TARGETS: "1"` to `webServer.env` in `playwright.config.ts`. Update functional tests that expect raw error text to assert the category-safe message. Add a test that a malicious URL (`https://169.254.169.254/a/b` or `file:///etc/passwd`) returns 400/500 with `category: "invalid_input"` and no job `complete`.

- [ ] **Step 8: Run tests and the gate**

Run: `pnpm --filter @ravaniroshan/busfactor-core exec vitest run src/snapshot.test.ts src/report-cache.test.ts`
Expected: PASS.
Run: `pnpm --filter @busfactor/web exec vitest run lib/scan-target.test.ts`
Expected: PASS.
Run: `pnpm gate`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/snapshot.ts packages/core/src/snapshot.test.ts packages/core/src/report-cache.ts packages/core/src/report-cache.test.ts packages/core/src/index.ts packages/core/src/scan.ts apps/web/lib/scan-target.ts apps/web/lib/scan-target.test.ts apps/web/lib/store.ts apps/web/app/api/scan/route.ts apps/web/components/scan-form.tsx apps/web/app/scan/page.tsx apps/web/app/docs/page.tsx playwright.config.ts tests
git commit -m "feat: pin scans to commit SHAs and harden hosted input"
```

---

## Task 6: Signed Admin Session and Data Deletion

**Files:**
- Create: `apps/web/lib/admin-auth.ts`
- Create: `apps/web/lib/admin-auth.test.ts`
- Create: `apps/web/app/admin/login/page.tsx`
- Create: `apps/web/app/api/admin/session/route.ts`
- Create: `apps/web/app/api/admin/waitlist/route.ts`
- Create: `apps/web/app/api/admin/feedback/route.ts`
- Modify: `apps/web/app/admin/metrics/page.tsx`
- Modify: `tests/functional.spec.ts`
- Modify: `apps/web/app-shell.test.ts`

**Interfaces:**
- Consumes: `records.deleteWaitlist`, `records.deleteFeedback` from Task 1; `store.rateLimits`, `hashIp`.
- Produces:
  - `ADMIN_COOKIE = "bf_admin"`.
  - `signSession(now?: number): string`.
  - `verifySession(value: string | undefined, now?: number): boolean`.
  - `adminCookieOptions(): { httpOnly: true; secure: boolean; sameSite: "strict"; path: "/"; maxAge: number }`.
  - `isAdminRequest(): Promise<boolean>` (reads `cookies()`).

- [ ] **Step 1: Write the failing session tests**

```ts
import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./admin-auth";

process.env.BUSFACTOR_ADMIN_TOKEN = "test-token";
process.env.BUSFACTOR_ADMIN_SESSION_SECRET = "test-secret";

it("round-trips a valid session and rejects tampering", () => {
  const cookie = signSession(1_000);
  expect(verifySession(cookie, 1_001)).toBe(true);
  expect(verifySession(cookie + "x", 1_001)).toBe(false);
  expect(verifySession("not-a-session", 1_001)).toBe(false);
});

it("rejects an expired session", () => {
  const cookie = signSession(1_000);
  expect(verifySession(cookie, 1_000 + 9 * 60 * 60 * 1000)).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @busfactor/web exec vitest run lib/admin-auth.test.ts`
Expected: FAIL because `./admin-auth` does not exist.

- [ ] **Step 3: Implement the signed cookie and login route**

Sign `${base64url(JSON.stringify({ exp }))}.${hmacSha256(payload, key)}` with `BUSFACTOR_ADMIN_SESSION_SECRET`, falling back to `BUSFACTOR_ADMIN_TOKEN`. Session lifetime is 8 hours. Verification must use `timingSafeEqual` on fixed-length digests, reject malformed payloads, and reject `exp <= now`. If neither secret nor token is configured, signing throws and verification returns false.

`POST /api/admin/session` accepts `{ token }`, checks the `Origin` header when present against `new URL(request.url).origin`, rate-limits login attempts by hashed IP (10/day), compares SHA-256 digests with `timingSafeEqual`, and on success sets the cookie via `NextResponse.json({ ok: true })` + `response.cookies.set(ADMIN_COOKIE, signSession(), adminCookieOptions())`. Wrong token → 401. `DELETE /api/admin/session` clears the cookie. Do not accept the token in the URL.

`app/admin/login/page.tsx` is a client form with a password input and an error state. It posts to the session route and redirects to `/admin/metrics` on success. Metadata: `robots: { index: false, follow: false }`. `adminCookieOptions().secure` is true in production **unless** `PLAYWRIGHT_TEST === "1"`, because the Playwright server runs over plain HTTP; never set that flag in production.

- [ ] **Step 4: Protect the dashboard and add deletion endpoints**

`/admin/metrics` calls `isAdminRequest()`; if false, `redirect("/admin/login")`. Remove the `searchParams.token` path entirely. Add a logout form/button that sends `DELETE /api/admin/session` and returns to login.

`DELETE /api/admin/waitlist` requires `isAdminRequest()`, normalizes `{ email }`, calls `records.deleteWaitlist`, returns `{ deleted }`. `DELETE /api/admin/feedback` requires `isAdminRequest()`, validates `{ id }` as a UUID, calls `records.deleteFeedback`, returns `{ deleted }`. Both return 401/403 without a valid cookie and 400 for invalid bodies. They are the deletion mechanism behind the public removal page.

- [ ] **Step 5: Update the Playwright auth test**

Replace the query-token assertions with:

```ts
const unauthenticated = await request.get("/admin/metrics", { maxRedirects: 0 });
expect([307, 308]).toContain(unauthenticated.status());

const wrong = await request.post("/api/admin/session", { data: { token: "nope" } });
expect(wrong.status()).toBe(401);

const login = await request.post("/api/admin/session", { data: { token: "audit-test-token" } });
expect(login.status()).toBe(200);
const authenticated = await request.get("/admin/metrics");
expect(authenticated.status()).toBe(200);
```

The Playwright `request` fixture keeps cookies across calls, so the dashboard request uses the session cookie. Add a test that `GET /admin/metrics?token=audit-test-token` without the cookie still redirects. Add `PLAYWRIGHT_TEST: "1"` to `webServer.env` in `playwright.config.ts` so the admin cookie is not marked `Secure` over the local HTTP server.

- [ ] **Step 6: Run tests and the gate**

Run: `pnpm --filter @busfactor/web exec vitest run lib/admin-auth.test.ts app-shell.test.ts`
Expected: PASS.
Run: `pnpm verify:build`
Expected: PASS.
Run: `pnpm verify`
Expected: PASS (Playwright starts the built app).

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/admin-auth.ts apps/web/lib/admin-auth.test.ts apps/web/app/admin apps/web/app/api/admin tests/functional.spec.ts apps/web/app-shell.test.ts
git commit -m "feat: protect admin with signed sessions and add record deletion"
```

---

## Task 7: Six-Section KPI Dashboard

**Files:**
- Create: `apps/web/lib/metrics.ts`
- Create: `apps/web/lib/metrics.test.ts`
- Create: `apps/web/lib/posthog.ts`
- Create: `apps/web/lib/posthog.test.ts`
- Modify: `apps/web/app/admin/metrics/page.tsx`
- Modify: `apps/web/lib/ops-summary.ts` (remove or reduce to pure helpers)
- Modify: `apps/web/app-shell.test.ts`

**Interfaces:**
- Consumes: `scanJobs.metrics`, `scanJobs.costSummary`, `spendStore.get`, `records`, `store.reports.count`, `store.rateLimits`.
- Produces:
  - `interface AnalyticsSummary { available: boolean; visitors: number | null; landingVisitors: number | null; scannerCtaClicks: number | null; scanPageViews: number | null; reportViews: number | null; reportDownloads: number | null; reportsShared: number | null; feedbackSubmitted: number | null; qualifiedScans7d: number | null; campaigns: Array<{ campaign: string; visitors: number }>; sources: Array<{ source: string; visitors: number }> }`.
  - `getAnalyticsSummary(days: number): Promise<AnalyticsSummary>`.
  - `buildDashboardMetrics(input: DashboardMetricsInput): DashboardMetrics`.
  - `dashboardRange(searchParams: { days?: string }): 7 | 30 | 90` (default 30).

```ts
interface DashboardMetricsInput {
  jobs: ScanJob[];
  costs: { totalUsd: number; averageUsd: number | null; medianUsd: number | null };
  waitlist: number;
  feedback: { yes: number; no: number; answered: number };
  reports: number;
  spendTodayUsd: number;
  analytics: AnalyticsSummary | null;
}

interface DashboardMetrics {
  business: { totalScans: number; successfulScans: number; reports: number; waitlist: number; feedbackAnswers: number; payingCustomers: null; mrrUsd: null };
  acquisition: { available: boolean; visitors: number | null; landingVisitors: number | null; scannerCtaClicks: number | null; scanPageViews: number | null; landingConversionPct: number | null; campaigns: AnalyticsSummary["campaigns"]; sources: AnalyticsSummary["sources"] };
  engagement: { scanStarts: number; successes: number; failures: number; completionRatePct: number; reportViews: number | null; reportDownloads: number | null; reportsShared: number | null; feedbackSubmitted: number | null; positiveFeedbackRate: number | null; repeatScanRate: number | null; qualifiedScans7d: number | null };
  operations: { successRatePct: number; failureRatePct: number; medianDurationMs: number | null; p95DurationMs: number | null; runningJobs: number; failedJobs: number; cacheHitRatePct: number; databaseHealth: "ok" | "memory" | "error"; providerErrors: number; spendTodayUsd: number; spendCapUsd: number; spendPct: number };
  revenue: { enabled: false; mrrUsd: null; arrUsd: null; activeSubscriptions: null };
  unitEconomics: { totalLlmCostUsd: number; averageCostPerAttemptUsd: number | null; medianCostPerAttemptUsd: number | null; costPerSuccessfulScanUsd: number | null; notTracked: string[] };
}
```

- [ ] **Step 1: Write the failing dashboard tests**

```ts
import { describe, expect, it } from "vitest";
import { buildDashboardMetrics, dashboardRange } from "./metrics";

it("uses only real inputs and returns null/zero for absent data", () => {
  const metrics = buildDashboardMetrics({
    jobs: [],
    costs: { totalUsd: 0, averageUsd: null, medianUsd: null },
    waitlist: 0,
    feedback: { yes: 0, no: 0, answered: 0 },
    reports: 0,
    spendTodayUsd: 0,
    analytics: null,
  });
  expect(metrics.business.totalScans).toBe(0);
  expect(metrics.engagement.positiveFeedbackRate).toBeNull();
  expect(metrics.acquisition.available).toBe(false);
});

it("computes positive feedback only from explicit answers", () => {
  const metrics = buildDashboardMetrics({
    jobs: [],
    costs: { totalUsd: 0, averageUsd: null, medianUsd: null },
    waitlist: 0,
    feedback: { yes: 3, no: 1, answered: 4 },
    reports: 0,
    spendTodayUsd: 0,
    analytics: null,
  });
  expect(metrics.engagement.positiveFeedbackRate).toBe(75);
});

it("accepts only 7, 30 or 90 days", () => {
  expect(dashboardRange({ days: "7" })).toBe(7);
  expect(dashboardRange({ days: "365" })).toBe(30);
  expect(dashboardRange({})).toBe(30);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @busfactor/web exec vitest run lib/metrics.test.ts`
Expected: FAIL because `./metrics` does not exist.

- [ ] **Step 3: Implement `posthog.ts` with a hard failure boundary**

If `POSTHOG_PERSONAL_API_KEY` or `POSTHOG_PROJECT_ID` is absent, return `{ available: false, ...nulls }` without calling `fetch`. Otherwise POST to `${POSTHOG_API_HOST ?? "https://us.posthog.com"}/api/projects/${projectId}/query/` with `Authorization: Bearer <key>`, a 10-second `AbortSignal.timeout`, and a HogQL query. Use a whitelist for `days` (7/30/90) before interpolation. Any non-OK response or malformed body returns the unavailable shape; never throw into the page.

Summary query (adjust only if the live project rejects a function during Task 11; do not substitute fake data):

```sql
SELECT
  uniq(distinct_id) AS visitors,
  uniqIf(distinct_id, event = 'landing_viewed') AS landing_visitors,
  countIf(event = 'scanner_cta_clicked') AS scanner_cta_clicks,
  countIf(event = 'scan_page_viewed') AS scan_page_views,
  countIf(event = 'report_viewed') AS report_views,
  countIf(event = 'report_downloaded') AS report_downloads,
  countIf(event = 'report_shared') AS reports_shared,
  countIf(event = 'feedback_submitted') AS feedback_submitted
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY
```

Replace `30` with the validated `days` value before sending; never interpolate an unvalidated string.

Campaign/source breakdown: `SELECT properties.campaign AS campaign, uniq(distinct_id) AS visitors FROM events WHERE event = 'landing_viewed' AND properties.campaign IS NOT NULL GROUP BY campaign ORDER BY visitors DESC LIMIT 10` (analogous for `properties.source`). Qualified scans: a `scan_succeeded` subquery joined to any of `report_downloaded`/`report_shared`/`feedback_submitted` for the same `distinct_id` within 7 days; if HogQL rejects it, return `null` and show “—” rather than a fabricated number. Add unit tests with a mocked `fetch` for the unavailable path and a successful summary path.

- [ ] **Step 4: Implement pure aggregation in `metrics.ts`**

`buildDashboardMetrics` returns:

- `business`: total scans, successful scans, reports, waitlist, feedback answers, paying customers (`null` until billing), MRR (`null`).
- `acquisition`: `available`, visitors, landing visitors, scanner CTA clicks, scan page views, landing conversion (`scanPageViews / landingVisitors`, null when the denominator is 0), campaigns, sources.
- `engagement`: scan starts, successes, failures, completion rate, report views, downloads, shares, feedback submissions, positive feedback rate, repeat scan rate (`null` unless PostHog provides it).
- `operations`: success rate, failure rate, median/P95 duration, running/failed jobs, cache hit rate, database health (`ok` if `SELECT 1` succeeds, `memory` when no DB), provider error count, spend today, cap, spend percentage.
- `revenue`: `enabled: false` and null values.
- `unitEconomics`: total LLM cost, average cost per attempt, median cost per attempt, cost per successful scan, and `notTracked: ["hosting", "database", "payment processing"]`.

No rounding that hides small costs: display USD with 4–6 decimals where needed. All percentages rounded to integers.

- [ ] **Step 5: Rebuild the dashboard page**

Keep `export const metadata = { robots: { index: false, follow: false } }`. Render six sections with stable headings:

- **A. Business overview** — scans, reports, waitlist, feedback, customers/MRR marked `Not enabled`.
- **B. Acquisition** — PostHog numbers or “PostHog not configured”; conversion; campaign/source tables. Add a link to the PostHog project when `POSTHOG_PROJECT_ID` is set.
- **C. Activation and engagement** — scan lifecycle counts, completion rate, report views/downloads/shares, positive feedback rate, North Star card.
- **D. Operational health** — success/failure rates, median/P95 duration, active/failed jobs, cache hit rate, DB health, provider errors, spend vs cap.
- **E. Revenue** — one honest line: `Billing is not enabled in this build; no revenue data exists.`
- **F. Unit economics** — LLM cost totals/averages from `scan_costs`; hosting/database/payment marked `Not tracked`.

Add a range selector (`7`, `30`, `90` days) as links carrying `?days=`. Keep the existing answer-first visual language and `Kpi`/`Section` helpers where possible. Never print emails. Do not insert sample rows.

- [ ] **Step 6: Update the source-level shell test**

Replace the old question assertions if headings change; assert that the page contains all six section labels and still contains `robots: { index: false, follow: false }`. Do not assert on fake metric values.

- [ ] **Step 7: Run tests and the gate**

Run: `pnpm --filter @busfactor/web exec vitest run lib/metrics.test.ts lib/posthog.test.ts app-shell.test.ts`
Expected: PASS.
Run: `pnpm verify:build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/metrics.ts apps/web/lib/metrics.test.ts apps/web/lib/posthog.ts apps/web/lib/posthog.test.ts apps/web/app/admin/metrics/page.tsx apps/web/lib/ops-summary.ts apps/web/app-shell.test.ts
git commit -m "feat: build six-section KPI dashboard from real data"
```

---

## Task 8: Product Analytics, Consent, and UTM Attribution in the App

**Files:**
- Modify: `apps/web/package.json` (add `posthog-js`)
- Create: `apps/web/lib/analytics.ts`
- Create: `apps/web/lib/analytics.test.ts`
- Create: `apps/web/components/analytics-provider.tsx`
- Create: `apps/web/components/tracked-link.tsx`
- Create: `apps/web/components/report-trackers.tsx`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/scan/page.tsx`
- Modify: `apps/web/components/scan-form.tsx`
- Modify: `apps/web/app/r/[slug]/page.tsx`
- Modify: `apps/web/app/r/[slug]/FeedbackWidget.tsx`
- Modify: `apps/web/next.config.mjs`
- Create: `docs/analytics.md`

**Interfaces:**
- Consumes: scan response fields from Task 5 (`cacheHit`, `durationMs`, `model`, `rubricVersion`, `stack`, `fileCount`).
- Produces:
  - Event union: `scan_page_viewed`, `scan_started`, `scan_succeeded`, `scan_failed`, `report_viewed`, `report_downloaded`, `fixes_downloaded`, `badge_clicked`, `report_shared`, `feedback_submitted`, `repeat_scan_completed`.
  - `initAnalytics(): void`, `capture(event, properties?): void`, `getConsent()`, `setConsent(value)`, `getAttribution()`, `buildAttribution(search: string)`, `bucketFileCount(count: number)`, `sanitizeAnalyticsProperties(properties)`.
  - `TrackedLink({ href, event, properties, className, children })` where `event` is an analytics event name.
  - `ReportViewTracker({ slug, fileCount, stack, rubricVersion })`.

- [ ] **Step 1: Write the failing analytics helper tests**

```ts
import { describe, expect, it } from "vitest";
import { buildAttribution, bucketFileCount, sanitizeAnalyticsProperties } from "./analytics";

it("parses UTM attribution", () => {
  expect(buildAttribution("?utm_source=reddit&utm_medium=community&utm_campaign=beta_launch")).toEqual({
    source: "reddit",
    medium: "community",
    campaign: "beta_launch",
  });
  expect(buildAttribution("")).toEqual({});
});

it("buckets file counts without exposing the repository", () => {
  expect(bucketFileCount(0)).toBe("0-100");
  expect(bucketFileCount(100)).toBe("100-500");
  expect(bucketFileCount(499)).toBe("100-500");
  expect(bucketFileCount(500)).toBe("500-2000");
  expect(bucketFileCount(2000)).toBe("2000+");
});

it("drops repository-identifying properties", () => {
  expect(
    sanitizeAnalyticsProperties({
      target: "https://github.com/acme/private-repo",
      repository: "acme/private-repo",
      path: "/Users/me/code",
      cache_hit: true,
      duration_ms: 42000,
    })
  ).toEqual({ cache_hit: true, duration_ms: 42000 });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @busfactor/web exec vitest run lib/analytics.test.ts`
Expected: FAIL because `./analytics` does not exist.

- [ ] **Step 3: Implement the client analytics layer**

Install `posthog-js` (`pnpm --filter @busfactor/web add posthog-js`). `analytics.ts` is client-only: guard on `typeof window === "undefined"` and return early on the server. Consent key: `busfactor.analytics.consent.v1` with values `granted`/`denied`. Initialize only when `process.env.NEXT_PUBLIC_POSTHOG_KEY` is set and consent is `granted`; use `posthog.init(key, { api_host, autocapture: false, capture_pageview: false, disable_session_recording: true, person_profiles: "identified_only", persistence: "localStorage" })`. On init, register super properties `{ surface: "product", source, medium, campaign }` from `getAttribution()`. `getAttribution()` reads the current URL once and persists to `sessionStorage` under `busfactor.attribution.v1`; later pages reuse it. `capture` merges super properties and calls `sanitizeAnalyticsProperties`.

`sanitizeAnalyticsProperties` removes keys `target`, `repository`, `repo`, `path`, `url`, `slug`; and drops any string value containing `github.com/` or starting with `file://`. Page paths such as `/scan` are allowed; they describe the site, not a repository.

- [ ] **Step 4: Add the provider and consent banner**

`analytics-provider.tsx` is a client component mounted once in `app/layout.tsx`. If `NEXT_PUBLIC_POSTHOG_KEY` is absent, render children with no banner. If consent is `granted`, call `initAnalytics()` in an effect. If consent is null, render a compact non-blocking banner: “BusFactor uses privacy-friendly analytics (PostHog) to understand which pages and actions are useful. No repository contents, URLs, or paths are sent.” Buttons `Accept` and `Decline` persist the choice. No analytics request is made before `Accept`.

Update `next.config.mjs`: `connect-src 'self' https://*.posthog.com` (keep the rest of the CSP). Add a source comment explaining the analytics host.

- [ ] **Step 5: Instrument the scan and report surfaces**

- `app/scan/page.tsx`: add a small client `ScanPageTracker` (can live in `analytics-provider.tsx` or its own file) that captures `scan_page_viewed` once per session (module-level `Set` keyed by path).
- `scan-form.tsx`: capture `scan_started` before `fetch`; on success capture `scan_succeeded` with `{ cache_hit, duration_ms, model, rubric_version, stack, file_count_bucket }`; on failure capture `scan_failed` with `{ error_category }`; on a later success, if `localStorage["busfactor.scan.completed"] === "1"`, also capture `repeat_scan_completed`; then set the flag. Never include the target.
- `report-trackers.tsx`: `ReportViewTracker` captures `report_viewed` once per slug per session using `sessionStorage`; `ReportActions` renders the download, fixes, badge, and a new `Copy report link` button. Use `tracked-link.tsx` for downloads/badge and emit `report_downloaded`, `fixes_downloaded`, `badge_clicked`. On successful clipboard copy emit `report_shared`; if the clipboard API fails, show the URL in a selectable input and do not emit.
- `FeedbackWidget.tsx`: after a successful feedback POST, capture `feedback_submitted` with `{ helpful }`.

- [ ] **Step 6: Document the event catalog**

Create `docs/analytics.md` with: one project, `surface` = `marketing`/`product`; the event names above plus reserved monetization names (`signup_started`, `signup_completed`, `checkout_started`, `payment_succeeded`, `subscription_created`, `subscription_cancelled`, `subscription_renewed`, `refund_issued`) that must not be emitted until billing exists; required properties (`surface`, `source`, `medium`, `campaign`, `device_type`); explicitly forbidden properties (repository URL, path, file contents, slug, email, secrets, full report); consent and retention notes. Reference this file from the privacy page.

- [ ] **Step 7: Run tests and the gate**

Run: `pnpm --filter @busfactor/web exec vitest run lib/analytics.test.ts`
Expected: PASS.
Run: `pnpm gate`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/lib/analytics.ts apps/web/lib/analytics.test.ts apps/web/components/analytics-provider.tsx apps/web/components/tracked-link.tsx apps/web/components/report-trackers.tsx apps/web/app/layout.tsx apps/web/app/scan/page.tsx apps/web/components/scan-form.tsx 'apps/web/app/r/[slug]/page.tsx' 'apps/web/app/r/[slug]/FeedbackWidget.tsx' apps/web/next.config.mjs docs/analytics.md
git commit -m "feat: add consent-gated product analytics and attribution"
```

---

## Task 9: Marketing Conversion, Hosted-Scanner Routing, Analytics, and SEO

**Files:**
- Modify: `busfactor-landing-page/package.json` (add `posthog-js`, `vitest`, scripts)
- Create: `busfactor-landing-page/src/lib/app-links.ts`
- Create: `busfactor-landing-page/src/lib/app-links.test.ts`
- Create: `busfactor-landing-page/src/lib/analytics.ts`
- Create: `busfactor-landing-page/src/components/ConsentBanner.tsx`
- Create: `busfactor-landing-page/src/components/AppLink.tsx`
- Create: `busfactor-landing-page/src/components/ViewTracker.tsx`
- Modify: `busfactor-landing-page/src/App.tsx`
- Modify: `busfactor-landing-page/src/docs/content.ts`
- Modify: `busfactor-landing-page/src/docs/DocsPage.tsx`
- Modify: `busfactor-landing-page/src/vite-env.d.ts`
- Create: `busfactor-landing-page/.env.example`
- Create: `busfactor-landing-page/public/robots.txt`
- Modify: `busfactor-landing-page/.github/workflows/deploy.yml`

**Interfaces:**
- Produces:
  - `buildAppLink({ path, search, base }: { path: string; search: string; base: string }): string`.
  - `AppLink({ path, event, className, children })`.
  - `ViewTracker({ event, children? })` with a one-shot `IntersectionObserver`.
  - Marketing events: `landing_viewed`, `hero_cta_clicked`, `scanner_cta_clicked`, `docs_clicked`, `cli_command_copied`, `pricing_viewed`, `campaign_clicked`.
  - `track(event, properties)`, `getMarketingConsent()`, `setMarketingConsent(value)`, `initMarketingAnalytics()`.

- [ ] **Step 1: Write the failing link tests**

```ts
import { describe, expect, it } from "vitest";
import { buildAppLink } from "./app-links";

it("preserves campaign UTMs on the way to the app", () => {
  expect(
    buildAppLink({
      path: "/scan",
      search: "?utm_source=reddit&utm_medium=community&utm_campaign=beta_launch",
      base: "https://app.example",
    })
  ).toBe("https://app.example/scan?utm_source=reddit&utm_medium=community&utm_campaign=beta_launch");
});

it("defaults to landing-page referral attribution", () => {
  expect(buildAppLink({ path: "/scan", search: "", base: "https://app.example/" })).toBe(
    "https://app.example/scan?utm_source=landing_page&utm_medium=referral"
  );
});

it("does not duplicate slashes in the base URL", () => {
  expect(buildAppLink({ path: "/docs", search: "", base: "https://app.example/" })).toContain(
    "https://app.example/docs"
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `busfactor-landing-page`): `npm install -D vitest && npx vitest run src/lib/app-links.test.ts`
Expected: FAIL because the test runner/script/module do not exist.

- [ ] **Step 3: Add the test runner and link helper**

Add `vitest` as a dev dependency and scripts `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`. `buildAppLink` trims trailing slashes from `base`, joins `path` with exactly one slash, copies `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` from `search`, and adds `utm_source=landing_page&utm_medium=referral` only when no source is present. It must be a pure function so it can be tested without a DOM.

- [ ] **Step 4: Add marketing analytics and consent**

Install `posthog-js`. `src/lib/analytics.ts` mirrors the app's consent behavior with key `busfactor.analytics.consent.v1`. `initMarketingAnalytics()` only runs when `VITE_POSTHOG_KEY` is set and consent is `granted`; it initializes with `autocapture: false`, `capture_pageview: false`, `disable_session_recording: true`, `person_profiles: "identified_only"`, and captures `landing_viewed` with `surface: "marketing"`, `page`, `device_type`, and attribution. `track` merges those base properties. `ConsentBanner` is a small, dismissible banner rendered above the footer or in the hero area; it must not block the primary CTA. If no key is configured, render nothing.

- [ ] **Step 5: Rework the hero, navigation, and footer**

In `src/App.tsx`:

- Hero: primary `<a>` “Scan your repository” → `buildAppLink({ path: "/scan", search: window.location.search, base: APP_URL })`, styled as the primary button; secondary `CopyButton` for `npx busfactor scan ./my-repo` with the label “Copy CLI command”. Add the note: “Free hosted scan for public GitHub repositories. No signup. Nothing is executed.”
- Header: add a `Scan` CTA linking to the app `/scan`; keep the existing section anchors and `Docs`. Track `scanner_cta_clicked` on the CTA and `docs_clicked` on Docs.
- Footer: add `Scan`, `Docs`, `Privacy`, `Terms`, and `Removal` links. The last three go to the app pages. Track `scanner_cta_clicked` on Scan.
- `CopyButton`: call `track("cli_command_copied", { command: "scan" })` when the copy succeeds. Do not send the command text.

- [ ] **Step 6: Add the conversion sections**

Add three compact sections to `App.tsx`:

1. **After a scan** — four steps: submit a public GitHub URL; BusFactor downloads a temporary snapshot and never executes it; you get a verdict, risk map, OPERATE.md, and author questions with citations; download, share, or send feedback. Include a link to the app `/docs`.
2. **Free while in beta** — what is free (hosted public-repo scans, standard reports, CLI, MCP, skill), what data is processed, and links to `/privacy` and `/removal`. Use `ViewTracker` to emit `pricing_viewed` once when this section enters the viewport.
3. **Consented demo report** — render only when `VITE_DEMO_REPORT_URL` is non-empty. Label it “Consented demo repository report” and link to the URL. When it is empty, render nothing. Never fabricate a repository name, score, or report.
4. Wrap outbound app links in `AppLink`, which also emits `campaign_clicked` when the incoming URL carries a `utm_source` or `utm_campaign`.

- [ ] **Step 7: Update docs and environment typing**

`src/vite-env.d.ts` declares `VITE_APP_URL`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `VITE_DEMO_REPORT_URL`, `VITE_DEMO_REPORT_LABEL` as `string | undefined`. `.env.example` lists them with the production defaults and no secrets. `src/docs/content.ts` must distinguish: hosted scan = public GitHub URL; CLI = local paths and GitHub URLs; hosted scans do not execute code. `DocsPage.tsx` adds a visible “Open the hosted scanner” link.

- [ ] **Step 8: Fix SEO plumbing and deployment env**

Add `public/robots.txt`:

```text
User-agent: *
Allow: /

Sitemap: https://ravaniroshan.github.io/busfactor-landing-page/sitemap.xml
```

Keep `robots.index: true`, canonical, OG image, and sitemap. In `.github/workflows/deploy.yml`, pass:

```yaml
env:
  FIGMA_PUBLIC_URL: /busfactor-landing-page
  VITE_APP_URL: ${{ vars.BUSFACTOR_APP_URL || 'https://heir-weld.vercel.app' }}
  VITE_POSTHOG_KEY: ${{ vars.BUSFACTOR_POSTHOG_KEY }}
  VITE_POSTHOG_HOST: ${{ vars.BUSFACTOR_POSTHOG_HOST || 'https://us.i.posthog.com' }}
  VITE_DEMO_REPORT_URL: ${{ vars.BUSFACTOR_DEMO_REPORT_URL }}
```

- [ ] **Step 9: Run tests, typecheck, and build**

Run: `npm test`
Expected: PASS (link helper tests).
Run: `npm run typecheck`
Expected: PASS.
Run: `npm run build`
Expected: PASS; `dist/robots.txt` exists and the built HTML contains the canonical URL and the app CTA target.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/lib src/components src/App.tsx src/docs src/vite-env.d.ts .env.example public/robots.txt .github/workflows/deploy.yml
git commit -m "feat: route marketing CTAs to hosted scanner with attribution"
```

---

## Task 10: Cross-App Trust, Retention, and Legal Copy

**Files:**
- Modify: `apps/web/app/privacy/page.tsx`
- Modify: `apps/web/app/terms/page.tsx`
- Modify: `apps/web/app/removal/page.tsx`
- Modify: `apps/web/components/site-chrome.tsx`
- Create: `apps/web/.env.example`
- Modify: `apps/web/app-shell.test.ts`

**Interfaces:**
- Consumes: final behavior from Tasks 1–8 (Neon records, immediate snapshot disposal, PostHog, sessions).
- Produces: `NEXT_PUBLIC_MARKETING_URL` footer link; accurate retention statements.

- [ ] **Step 1: Rewrite the privacy page's data inventory**

Replace the JSON-file and “no analytics” statements with the actual behavior:

- **Repository snapshots:** downloaded to a temporary directory, never executed, deleted when the scan finishes (success or failure). Selected excerpts may be sent to Groq when a key is configured.
- **Reports:** stored in Neon with an unguessable slug; retained until a removal request; `noindex` by default; published only by explicit opt-in.
- **Feedback:** stored in Neon (`report_feedback`) with slug, yes/no, optional note, timestamp; retained until removal.
- **Waitlist:** stored in Neon (`waitlist_entries`) with email, optional source/campaign, timestamp; retained until removal; never displayed in the dashboard.
- **Rate limiting:** salted, truncated SHA-256 of the IP address in a daily counter; the raw IP is not stored; the latest daily counter per hashed address remains in the rate-limit store.
- **Analytics:** consent-gated PostHog events with page path, device type, campaign attribution, and action names; never repository contents, URLs, local paths, slugs, or secrets. Declining analytics initializes no PostHog tracking and sends no events. Retention follows the PostHog project settings; requests can be sent to the contact address.
- **Admin sessions:** HttpOnly cookie, 8 hours.
- **Billing:** no accounts, payments, or subscriptions in this build.
- Keep the jurisdiction `[NEEDED]` placeholder and the note that this is not a legal certification.

- [ ] **Step 2: Update terms and removal**

Terms: add a short “Data processing” sentence naming Vercel, Neon, Groq, and PostHog; keep “no paid plans” accurate for this build. Removal: mention reports, waitlist entries, feedback records, and analytics deletion requests; keep the 24-hour target. Do not claim automated deletion if only the operator endpoint exists.

- [ ] **Step 3: Add the app → marketing link**

In `site-chrome.tsx`, read `const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://ravaniroshan.github.io/busfactor-landing-page/"` and add a footer link `Website` to it, plus a `rel="noreferrer"` external link. Keep `/scan` as the app home. Update `app-shell.test.ts` to assert the footer contains the marketing URL variable and the `Website` label.

- [ ] **Step 4: Add `apps/web/.env.example`**

Document, with placeholders only:

```text
DATABASE_URL=
GROQ_API_KEY=
GITHUB_TOKEN=
BUSFACTOR_KILL_SWITCH=0
BUSFACTOR_DAILY_SPEND_CAP_USD=10
BUSFACTOR_SCAN_RESERVATION_USD=0.05
BUSFACTOR_CACHE_TTL_HOURS=720
BUSFACTOR_LLM_RATES_JSON={}
BUSFACTOR_ADMIN_TOKEN=
BUSFACTOR_ADMIN_SESSION_SECRET=
BUSFACTOR_ALERT_WEBHOOK_URL=
NEXT_PUBLIC_MARKETING_URL=https://ravaniroshan.github.io/busfactor-landing-page/
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_PERSONAL_API_KEY=
POSTHOG_PROJECT_ID=
POSTHOG_API_HOST=https://us.posthog.com
```

Do not put real values in the file.

- [ ] **Step 5: Run tests and the gate**

Run: `pnpm --filter @busfactor/web exec vitest run app-shell.test.ts`
Expected: PASS.
Run: `pnpm gate`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/privacy/page.tsx apps/web/app/terms/page.tsx apps/web/app/removal/page.tsx apps/web/components/site-chrome.tsx apps/web/.env.example apps/web/app-shell.test.ts
git commit -m "docs: reconcile retention and cross-app trust copy"
```

---

## Task 11: Full Verification, Documentation, and Handoff

**Files:**
- Modify: `STATE.md`, `DECISIONS.md`, `BLOCKERS.md`, `PARKING.md` (per the repository contract)
- Copy this plan to: `docs/superpowers/plans/2026-11-22-busfactor-funnel.md`

- [ ] **Step 1: Run the main-repository gate and build**

```bash
cd /home/shiva/projects/busfactor
pnpm install --frozen-lockfile
pnpm gate
pnpm verify:build
```

Expected: all pass. Record the actual test counts in `STATE.md`; do not reuse old counts.

- [ ] **Step 2: Run the browser suite**

```bash
pnpm verify
```

Expected: PASS. If the suite requires a live `GITHUB_TOKEN` or network access, record the exact failing test and leave it as a blocker rather than mocking a pass.

- [ ] **Step 3: Run the marketing verification**

```bash
cd /home/shiva/projects/busfactor-landing-page
npm ci --legacy-peer-deps
npm test
npm run typecheck
npm run build
test -f dist/robots.txt && grep -q 'Sitemap:' dist/robots.txt
grep -q 'https://heir-weld.vercel.app/scan' dist/index.html || echo "check CTA injection"
```

Expected: all commands pass; the robots file has the sitemap; the built page contains the scanner CTA. If the CTA URL is injected at runtime rather than in the static HTML, verify it in a browser preview instead of failing on the grep.

- [ ] **Step 4: Exercise the security scenarios locally**

Start the app with `BUSFACTOR_ALLOW_LOCAL_TARGETS` unset and the kill switch off. Using `curl`:

- `POST /api/scan` with `{"target":"fixtures/repos/clean"}` → 400 with `category: "invalid_input"`.
- `POST /api/scan` with `{"target":"http://169.254.169.254/latest/meta-data"}` → 400 with `category: "invalid_input"`.
- `POST /api/scan` with `{"target":"https://github.com.evil.com/a/b"}` → 400.
- `GET /admin/metrics?token=<token>` without a cookie → redirect to `/admin/login`.
- `POST /api/feedback` with a nonexistent slug → 404.
- Start a second local server with `BUSFACTOR_KILL_SWITCH=1` and confirm `POST /api/scan` → 503. Stop it afterward.

Record the observed status codes in `STATE.md`. Do not deploy during this step.

- [ ] **Step 5: Verify analytics and dashboard behavior**

With PostHog keys configured in a local `.env.local` (never committed), grant consent, load the marketing page, click the scanner CTA, run a fixture scan, open the report, and download it. Confirm the events `landing_viewed`, `scanner_cta_clicked`, `scan_page_viewed`, `scan_started`, `scan_succeeded`, `report_viewed`, and `report_downloaded` appear in PostHog Live Events with no repository URL/path properties. Confirm the dashboard shows real scan counts and no fabricated revenue. If keys are unavailable, mark this step `BLOCKED: PostHog keys not supplied` in `BLOCKERS.md`; do not invent evidence.

- [ ] **Step 6: Update project state and decisions**

Append a `DECISIONS.md` entry for each material choice: relational tables over KV for records/jobs/spend; synchronous jobs; SHA-pinned cache; operator session cookie; env-supplied LLM rates; PostHog consent. Update `STATE.md` with the verified gates and remaining human blockers. Add to `PARKING.md` anything deferred (billing, accounts, content pipeline, domain migration). Keep `BLOCKERS.md` limited to human-owned items.

- [ ] **Step 7: Copy the plan into the repository and commit**

```bash
mkdir -p docs/superpowers/plans
cp <this-plan-file> docs/superpowers/plans/2026-11-22-busfactor-funnel.md
git add STATE.md DECISIONS.md BLOCKERS.md PARKING.md docs/superpowers/plans/2026-11-22-busfactor-funnel.md
git commit -m "docs: record funnel implementation state and plan"
```

- [ ] **Step 8: Production deployment — human approval required**

Do not run `vercel --prod` or push to `main` automatically. Ask the operator to approve the deployment, confirm the Vercel env vars, and verify after deploy:

- Marketing: `/robots.txt` returns 200 with the sitemap; canonical and OG tags present; the primary CTA opens `<app>/scan` with UTMs.
- App: `POST /api/scan` with a public GitHub URL completes; a forced provider failure appears as a failed job in `/admin/metrics`; the admin login sets an HttpOnly cookie; `?token=` does not authorize.
- Record the deployment IDs and observed results. Do not claim Gate C.

---

## Gated Work (Do Not Execute in This Plan)

These are deliberately excluded because `AGENTS.md` forbids building them before the PDR gates pass, and because several require human evidence or credentials.

1. **Gate A/B validation (human-owned).** Publish 5–10 consented seed reports; collect 5 stranger scan requests; interview 5 external users. No code task can satisfy these. Use the `scan_succeeded`, `report_downloaded`, `report_shared`, and `feedback_submitted` events to measure them, but do not treat synthetic fixtures as evidence.
2. **CLI publication.** Verify package metadata, `npm pack` contents, clean install, Node 20/24 compatibility, and `npx busfactor --version` from the tarball. Publishing requires the operator's npm authentication; do not claim npm availability until the published package installs and scans successfully. Only then add the `npx busfactor` primary claim to the marketing site.
3. **Accounts, report history, scheduled scans, team features.** Defer until Gate B shows retention demand. These require an auth provider and a new data model; do not smuggle them into the current anonymous flow.
4. **Billing (Polar/Razorpay/Paddle), subscriptions, webhooks, invoices, entitlements.** Defer until real willingness-to-pay is measured. The dashboard's Revenue section stays “not enabled” until then. Never trust a client-side plan flag when billing is added.
5. **Content/SEO program (six long-form articles, blog routing).** This is a separate subsystem (content routes, metadata, authoring). Plan it separately after the landing-page conversion work; do not stuff six articles into `App.tsx`.
6. **Domain migration (`app.` / `docs.` subdomains).** The env-driven `VITE_APP_URL` and `NEXT_PUBLIC_MARKETING_URL` make the switch possible later. Do not change canonical URLs, DNS, SSL, or GitHub Pages base paths without a redirect and deployment plan.
7. **Error monitoring (Sentry or equivalent).** Decide after reviewing real Vercel function logs. Add only if the existing logs are insufficient; do not add a second overlapping analytics product.
8. **Session recordings.** Require a separate privacy review and explicit consent; not part of this plan.
9. **Search Console and launch SEO checks (human-owned).** Submit the sitemap, verify indexing, canonical URLs, OG/Twitter previews, mobile usability, and broken links against the deployed marketing site. These cannot be verified from source code.
10. **Launch assets and distribution (human-owned).** Product demo video, real report screenshots, Product Hunt gallery, Show HN/Reddit/X/LinkedIn posts, and direct outreach. Do not publish named scores without consent, and do not treat coverage or signups as revenue validation.

---

## Assumptions

- **Groq remains the default inference provider.** Free-tier inference has an actual billed cost of $0; token usage is still recorded. Paid rates are supplied through `BUSFACTOR_LLM_RATES_JSON`; no rate constants are invented in code. If the operator does not set rates, the dashboard shows token usage and $0 cost with a note, not a guessed price.
- **The hosted scanner is public-GitHub-only.** Local paths remain the CLI's advantage. `BUSFACTOR_ALLOW_LOCAL_TARGETS=1` exists solely for the Playwright fixture suite and must never be set in production.
- **Jobs stay synchronous inside the request.** The current scan completes in under `maxDuration = 60`; introducing a queue would be a rewrite with new failure modes. The lifecycle is persisted around the synchronous call.
- **Neon is the only database.** Schema bootstrap uses `CREATE TABLE IF NOT EXISTS` at runtime, matching the existing store; no migration framework is added.
- **Admin auth is a single operator token exchanged for a signed cookie.** Full user accounts are deferred. `BUSFACTOR_ADMIN_TOKEN` is still the root secret; `BUSFACTOR_ADMIN_SESSION_SECRET` is recommended so rotating the token does not leave old cookies valid.
- **PostHog is optional at build time.** If keys are absent, both apps build and run with analytics disabled and no banner. When keys are present, consent is required before any event is sent.
- **The marketing demo report is human-supplied.** `VITE_DEMO_REPORT_URL` stays empty until a repository owner consents; no example is presented as real.
- **The current production URLs remain until a domain migration.** Defaults: marketing `https://ravaniroshan.github.io/busfactor-landing-page/`, app `https://heir-weld.vercel.app`.
- **Reports remain `noindex`.** Sharing is a copied link; public indexing requires a separate opt-in feature.
- **No fabricated dashboard values.** Sections with unavailable sources display `—`, `No data yet`, or `Not enabled`.
- **The spend reservation is an upper-bound estimate.** Set `BUSFACTOR_SCAN_RESERVATION_USD` above the P95 scan cost so concurrent scans cannot overshoot the cap. While Groq rates are unset (free tier), the ledger records $0 and the cap does not constrain notional token spend; set real rates before moving to paid inference.
- **PostHog figures are consent-gated.** Visitors who decline analytics are absent from acquisition and engagement numbers by design. Label the dashboard accordingly; do not infer totals from the missing population.

## Execution Recommendation

Use **subagent-driven development**. The tasks share interfaces across the scan route, schema, analytics event names, and the two repositories; a fresh reviewer per task catches cross-task drift (for example, a property name that changes between Task 5 and Task 8) before it compounds. The tasks are sequential enough that parallel implementation would create merge conflicts in `apps/web/app/api/scan/route.ts`; do not parallelize Tasks 2–5.
