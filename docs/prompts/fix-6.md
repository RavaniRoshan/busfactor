# fix-6 — Persist scans and reports outside a single serverless instance

```text
PRECONDITION: Roshan has chosen a Postgres provider (Neon or Supabase) and set
DATABASE_URL on the Vercel project. Do not start without it — the adapter target
is otherwise unknown. See BLOCKERS.md (2026-11-20).

READS: PDR sections 8 (data model, endpoints) and 13 (Gate C); AGENTS.md section 11.
BLOCKED BY: DATABASE_URL (human credential + provider decision).

TASK
1. Add a store adapter interface in apps/web/lib/store.ts for jobs, reports,
   reportCache, rateLimits and spend. Keep the current Map implementation as the
   local/test fallback; add a Postgres implementation selected by DATABASE_URL.
2. Schema from PDR section 8: scans, findings, reports, feedback, usage, waitlist.
   Store only findings and report JSON — never raw source snapshots.
3. Replace direct Map use in /api/scan, /api/scan/[id], /api/report/[slug],
   /api/report/[slug]/{publish,fixes,download}, /api/feedback, /api/waitlist,
   /r/[slug], /badge/[slug] and /admin/metrics with the adapter.
4. Keep static metadata.robots noindex on /r/[slug]. Keep rate limits and the
   daily spend cap global across instances.
5. Tests: a report written by one adapter instance is readable by another;
   noindex present; removal path deletes a stored report.

GATE: `pnpm gate` passes; deployed POST /api/scan followed by GET /r/:slug
returns 200 on the Vercel production URL with the same score and SHA.

BRANCH: IF DATABASE_URL is absent -> STOP, BLOCKED, no code written.
        IF report retrieval still 404s after deploy -> R1; after 3 attempts
        update BLOCKERS.md with both options and stop.
```
