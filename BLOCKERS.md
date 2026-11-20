# Blockers

## 2026-11-20 — Production report persistence

- What failed: on the deployed site, `POST /api/scan` with a public GitHub URL returned HTTP 200 and a complete report (`slug: dg9idy16`, score 76). But `GET /r/dg9idy16` and `GET /api/report/dg9idy16` returned 404 on three consecutive attempts. The rebuilt report UI itself is fine — the data is gone by the time the browser follows the link.
- Cause: `apps/web/lib/store.ts` keeps jobs, reports, cache, rate limits and spend in `globalThis` Maps. Each Vercel serverless invocation can run in a separate instance, so the report written during the POST is not visible to the GET. Locally (single Node process) the flow works; on Vercel it does not.
- What was tried: reproduced the live scan, retried the report URL three times, checked `/api/report/:slug`, and read `lib/store.ts` plus the scan/report route source. This is not a flaky network or UI issue.
- Option A: Add Postgres (Neon or Supabase) via `DATABASE_URL`, replace the Maps with a small store adapter (jobs, reports, cache, rate_limits, spend), add tests, and redeploy. Restores shareable report URLs and makes rate limits and spend caps actually global.
- Option B: Keep the in-memory store and have the scan form render the POST response client-side without navigating to `/r/:slug`. Smaller change, but breaks shareable report URLs, badge/OG routes, and the `noindex` report page — all PDR requirements.
- Recommendation: Option A. It needs a decision from Roshan on the provider plus a `DATABASE_URL` secret on the Vercel project. No code should be written until that exists, because the adapter target is otherwise unknown.
- Evidence: deployment `dpl_AyAFEW7WBZEa8tQBVGxULJ7QBpMw`, production URL `https://heir-weld.vercel.app`.
