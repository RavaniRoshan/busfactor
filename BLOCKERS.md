# Blockers

Human-owned blockers only. No deployment performed in Task 11.

## Human-owned

- **BUSFACTOR_ADMIN_TOKEN not set on Vercel** — `/admin/metrics` is unauthorized in production until operator sets token. Also set `BUSFACTOR_ADMIN_SESSION_SECRET` (recommended) so token rotation does not leave old cookies valid.
- **BUSFACTOR_LLM_RATES_JSON not set** — if paid inference is enabled, operator must supply real rates; until then dashboard/costs use free-tier $0 semantics and must not invent prices.
- **PostHog keys not supplied** — Task 11 analytics live verification is `BLOCKED: PostHog keys not supplied`. Operator must provide PostHog keys/config for consent-gated live-event verification.
- **npm auth not supplied** — CLI publication remains human-gated; do not claim npm availability until published package installs and scans successfully.
- **Jurisdiction `[NEEDED]` in legal copy** — operator must specify jurisdiction before publication.
- **Consented demo report not supplied** — `VITE_DEMO_REPORT_URL` remains empty until a repository owner consents; no example may be presented as real.
- **Gate A/B evidence / deployment approval** — human-owned: publish 5-10 consented seed reports, collect 5 stranger scan requests, interview 5 external users; operator approves deployment and verifies post-deploy checks.

## Resolved 2026-11-20 — production report persistence

- Neon Vercel Marketplace integration set `DATABASE_URL` (hidden secret) on the `heir` project for Production and Preview.
- Deployed `dpl_FinFhuyAXwfJqFXzvpef4xYb8KiM`.
- Verified on production: `POST /api/scan` 200 → `GET /r/:slug` 200 → `GET /api/report/:slug` 200 → `GET /badge/:slug.svg` 200. A second identical scan returned the same slug from the shared cache, proving cache and rate-limit state are now shared across serverless instances.
- No connection string or password was written to the repository or to logs.
