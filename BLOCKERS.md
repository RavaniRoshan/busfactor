# Blockers

None.

## Resolved 2026-11-20 — production report persistence

- Neon Vercel Marketplace integration set `DATABASE_URL` (hidden secret) on the `heir` project for Production and Preview.
- Deployed `dpl_FinFhuyAXwfJqFXzvpef4xYb8KiM`.
- Verified on production: `POST /api/scan` 200 → `GET /r/:slug` 200 → `GET /api/report/:slug` 200 → `GET /badge/:slug.svg` 200. A second identical scan returned the same slug from the shared cache, proving cache and rate-limit state are now shared across serverless instances.
- No connection string or password was written to the repository or to logs.
