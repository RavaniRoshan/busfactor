# Decisions

## 2026-11-20 — Report workspace redesign (plan execution)

- Decision: Rebuild `/r/[slug]` as the dark four-view workspace from the reference screenshots using MIT Space UI community primitives.
- Branch taken: Five TDD tasks in an isolated worktree (`report-workspace-redesign`), merged fast-forward to `main`; `report-design.test.ts`, `report-view.test.ts`, view tests and shell tests pin each deliverable.
- Why: The screenshot was a design reference, not a product change — the spec `docs/report-workspace-design.md` pins that prototype labels (acme/payments-api, 64/100, Setup/Configuration) must never become real data.
- Rulings during execution: Space UI CLI wrote into `src/` and added theme tokens — relocated primitives into `components/ui` + `lib`, kept additive tokens, preserved legacy `danger` badge variant; added a Vitest `@` alias for Space UI's own imports; narrowed an old guard that forbade the restored backdrop; `TabsList` has no `orientation` prop (it belongs on `Tabs`); spec gaps (exact OPERATE heading, band explanation, provenance) fixed in one pass after review; unused `@usespaceui/squircle` dependency removed with its lockfile entry.
- Evidence: fresh whole-branch review graded Important first, then Clean / approve after two fix passes; `pnpm gate` passes (25 core + 29 web tests); production build passes; deployment `dpl_BByXDVv1ycGKt9czk5wHZgyba5xa`; production scan 200 → report 200, view markers and noindex present, root still 307 → `/scan`.
- Non-goal: the separate landing-page repo remains Roshan's work; Gates A/B/C remain unvalidated.

## 2026-11-20 — Production served stale remote `main`

- Decision: Push the local work to `origin/main`; a Neon-triggered git deployment had promoted a build from the stale remote branch, so `https://heir-weld.vercel.app/` served the old pre-rebuild page again.
- Branch taken: Keep the local tree (all rebuild, removal and persistence work) as the source of truth, re-add the remote PR's only real feature (`@vercel/analytics` + `<Analytics />`), allow its CSP endpoint, then merge remote history with `-s ours` so no work is lost from the log.
- Why: The remote PR was based on the old baseline and would have reverted 14 local commits if merged normally. Its analytics feature is preserved explicitly in our tree.
- Evidence: 14 local commits ahead of remote; remote PR #1 changed only `layout.tsx`, `package.json`, `pnpm-lock.yaml`. `pnpm gate` passes (35 tests) after re-adding analytics.

## 2026-11-20 — Neon persistence resolved in production

- Decision: Use the Neon Vercel Marketplace integration to supply `DATABASE_URL` rather than pasting the connection string into a file or a shell command.
- Branch taken: Custom Prefix left empty, so the integration created `DATABASE_URL` as a hidden secret on the `heir` project; deployed the already-implemented async store.
- Why: The secret never entered the repository, tool output, or logs. The pooled connection string is correct for serverless app traffic.
- Evidence: deployment `dpl_FinFhuyAXwfJqFXzvpef4xYb8KiM`; production `POST /api/scan` 200, `GET /r/:slug` 200, `GET /api/report/:slug` 200, `GET /badge/:slug.svg` 200; second scan returned the same slug from the shared cache. `git grep` found no secret in tracked files.
- Supersedes: the 2026-11-20 entries recording the persistence blocker. Gates A/B/C remain unvalidated.

## 2026-11-20 — Neon persistence adapter

- Decision: Use Neon as the Postgres provider and replace the in-memory Maps with an async `store` interface.
- Branch taken: `@neondatabase/serverless` `Pool` with `poolQueryViaFetch`, a single `busfactor_store` table, atomic SQL upserts for rate limits and spend, and a memory fallback when `DATABASE_URL` is absent so local dev and tests still work.
- Why: Roshan chose Neon; the Vercel Marketplace integration injects `DATABASE_URL` automatically. Memory-only state cannot survive separate serverless instances.
- Scope: all 10 callers updated to `await store.*`; added 3 store tests. `pnpm gate` passes (35 tests); production build passes; local scan → report → badge verified 200.
- Still blocked: `DATABASE_URL` is not set on Vercel (`vercel env ls` is empty). Deploying before it changes nothing, so deployment is deferred until the secret exists.

## 2026-11-20 — All landing-page artifacts removed

- Decision: Remove the landing page entirely from `apps/web` and from the repository. It will be built in a separate repo on another day.
- Branch taken: `/` now redirects to `/scan`; deleted the Figma Make source directory, the extracted design doc, the showcase/report-window and quickstart components, the dusk-road image, landing-only CSS tokens, the ESLint ignore, and the old landing-specific tests. Header/footer now contain only Scan and Docs.
- Why: The user decided the landing page belongs in its own repo. Keeping a second, prototyped landing surface inside the product app was confusing and could not share routing.
- Supersedes: the two earlier 2026-11-20 entries that added the landing page and wired it into this app. Those remain in the log as history, not as current state.
- Scope note: Product-level documents (PDR, PROMPTS, AGENTS) still mention a landing page as a Gate C deliverable; that is a product requirement, not an implementation artifact in this repo.

## 2026-11-20 — Landing page ⇄ webapp navigation and redeploy

- Decision: Keep the single Next.js app as both the landing page and the webapp; make navigation explicit in both directions instead of deploying the Figma Vite prototype as a second site.
- Branch taken: Added a primary "Scan" link to the shared header, hero CTAs to `/scan` and `/docs`, a hosted-scan link in Quickstart, and return links on `/scan`, `/docs` and `/r/[slug]`. Added a source-level regression test for these links.
- Why: The user asked for the landing page and main web app to be perfectly interconnected and both deployed on Vercel. One app with absolute routes gives real navigation and shareable URLs; a second Vite prototype would have no shared routing.
- Evidence: `pnpm gate` pass (30 tests); build pass; local dev full flow POST /api/scan 200 → GET /r/:slug 200; production redeploy `dpl_EQkH433gM8oiN72Ly1H1YYxdw5qX` with all routes 200 and links present in HTML.
- Scope note: `BusFactor Landing Page/` remains untouched. The production scan → report hop is still broken (in-memory store); see BLOCKERS.md. The local preview at `http://localhost:3000` completes the full flow because it runs in one process.

## 2026-11-20 — Vercel production deployment

- Decision: Deploy the root `heir` Vercel project (monorepo build config) rather than the separate `apps/web` project.
- Branch taken: `vercel --prod --yes` from the repo root after verifying the exact root build command locally.
- Why: `vercel.json` at the root builds core then web; the Vercel CLI is authenticated as `ravaniroshan`.
- Evidence: deployment `dpl_AyAFEW7WBZEa8tQBVGxULJ7QBpMw`, production URL `https://heir-weld.vercel.app`, READY. Public (unauthenticated) requests to `/`, `/scan`, `/docs`, `/terms`, `/privacy`, `/removal` returned 200; fonts self-hosted. `robots` noindex retained on report route.
- Scope note: Deployment Protection was reported as enabled, but unauthenticated production requests succeeded, so no setting change was made. Gate A/B/C remain unvalidated.

## 2026-11-20 — Web rebuild (explicit override of P2.5 / Gate A)

- Decision: Rebuild the `apps/web` UI with shadcn/ui on Base UI (`base-nova`) using a design system extracted from the read-only Figma landing page.
- Branch taken: `research/ui-component-libraries.md` (wide research + adversarial verification) → `apps/web/design.md` → token/component implementation in `apps/web` only.
- Why: The user explicitly asked for the webapp rebuild and confirmed the Gate-A override, matching the earlier P2.4 override pattern. Gate A remains human-controlled and unvalidated; no gate was declared passed.
- Alternatives rejected: Open Shadcn Blocks (no licence grant, no source repo, competitor CDN assets), AI SDK Agents (paid, AI-pattern catalogue), porting the Figma Vite app itself (user said leave it untouched). Space UI Pro components rejected; free MIT primitives only, with per-component licence check.
- Scope note: The Figma kit `@figma/astraui` is not installed locally, so exact hex values were unrecoverable; token names and scale formulas were extracted, and concrete OKLCH values were chosen and recorded in `apps/web/design.md` §3.
- Gate evidence: `pnpm gate` passed (typecheck, lint, 25 tests); `pnpm --filter @busfactor/web build` passed (12 static pages generated).

## 2026-11-20 — P2.4 (override)

- Decision: Implement the MCP server and handoff skill ahead of Gate A at the user's request.
- Branch taken: Manual JSON-RPC stdio server instead of adding an MCP SDK dependency; skill points at the local CLI build until publication.
- Why: The user explicitly asked for MCP and skill support. Gate A remains unvalidated, so this is an override, not gate completion.
- Scope: `packages/mcp` and `skills/handoff/SKILL.md`.


## 2026-11-20 — P1.7

- Decision: Implement the CLI as a thin wrapper over `scanTarget`, write Markdown, JSON, OPERATE.md, and author questions, and use exit code 2 for `--fail-under`.
- Branch taken: Build core and CLI to `dist` before typechecking, because the CLI imports the compiled package.
- Why: This keeps the CLI free of analysis logic and makes the engine reusable by the future web, skill, and MCP surfaces.
- Gate: P1.7 passes. Gate A remains human-controlled and is not started.


## 2026-11-20 — P0.1

- Decision: Use a pnpm workspace with `packages/core`, `packages/cli`, and an `apps/web` shell.
- Branch taken: Corepack path, because `pnpm` was not installed but Corepack was available.
- Why: The PDR calls for a TypeScript pnpm monorepo and one engine library shared by all surfaces. Activating pnpm 10.15.0 through the installed Node avoids changing the system package manager.
- Alternatives rejected: npm workspaces (would diverge from the documented commands); installing pnpm globally with npm (unnecessary global mutation).
- Environment note: No `ANTHROPIC_API_KEY` is present. Live LLM gates are marked `stale`; implementation will use the mock provider until a key is available.
- Scope note: `apps/web` is intentionally only a typed shell at P0.1. The web surface belongs to P1.8 and remains gated by Gate A.
