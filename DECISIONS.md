# Decisions

## 2026-11-20 — Groq backend and verified defect fixes

- Decision: Use Groq as the hosted LLM backend and fix every deterministic verification finding before invoking any gate.
- Branch taken: `GroqProvider` uses the OpenAI-compatible endpoint `https://api.groq.com/openai/v1/chat/completions` with bearer auth and default model `openai/gpt-oss-120b`; `createDefaultProvider()` prefers `GROQ_API_KEY`, then `ANTHROPIC_API_KEY`, then the heuristic fallback. Four unit tests cover headers, model override, error handling and selection.
- Why: Groq's OpenAI-compatible API needs no new SDK and keeps the provider interface unchanged; no key is present in this environment, so live LLM gates remain `stale` rather than fabricated.
- Fixes verified: cached scans persist jobs; report contrast passes 4.5:1; mobile report stacks and header no longer clips; Space UI cards use the dark surface; Vercel Analytics removed entirely so no tracker loads pre-consent.
- Evidence: `pnpm gate` 64 tests pass; `pnpm verify` 20/20 pass; audit report updated. Gates A/B/C and legal identity are still human-controlled and were not declared passed.

## 2026-11-20 — Autonomous verification harness

- Decision: Build a deterministic local verification harness before any further UI improvements, from four research rounds plus adversarial verification (`research/autonomous-ui-verification-tooling.md`).
- Branch taken: `pnpm verify` = build + `playwright test` with four suites: functional (Playwright), accessibility (`@axe-core/playwright`), layout (`overflowlint/playwright` plus custom geometry assertions), network/consent (Playwright request/storage capture). `pnpm gate` remains the unit gate and still passes (60 tests).
- Why: the research rejected SaaS visual tools, LLM-assigned grades (forbidden by `AGENTS.md` §4.2/§13), immature 0-star vision frameworks, and the snap Chromium wrapper in favour of Playwright's bundled Chromium.
- Ruling: the visually hidden skip link is a known `interactive-covered` false positive and is suppressed with `data-ol-ignore`; no other failures were suppressed. OverflowLint alone missed the mobile stacking defect, so a deterministic geometry assertion was added.
- Evidence: final clean run 15 passed / 5 failed, all five genuine defects; axe measured active tab contrast 1.07:1; cache-hit polling returns 404; mobile body computes `display: flex` with header 484px scroll width in a 340px viewport; analytics script loads before consent.
- Not a legal certification: keyboard focus order, screen-reader output, consent wording and jurisdiction-specific rules still require human review.

## 2026-11-20 — Operator dashboard and dashboard skills

- Decision: Rebuild `/admin/metrics` as an operator dashboard organised around four questions — is it working, where does it fail, is it helping, what should I do.
- Branch taken: `lib/ops-summary.ts` computes job status counts/fail rate and feedback yes/no from real store rows; `store.jobs.values()` added to both memory and Neon KV implementations; server-rendered CSS bars replace Chart.js.
- Why: Roshan invoked `dashboard-builder` and installed `build-dashboard`. That skill emits a standalone HTML file with CDN Chart.js, which conflicts with this app's `connect-src 'self'` CSP and the project rule against invented data. The operator-question method was kept; the format was adapted to the app. Recorded as a deviation, not a skill failure.
- Evidence: `pnpm gate` passes (25 core + 35 web tests); authorized render verified locally with a temporary test token (all four section headings, provisional 5% threshold note); production `dpl_8jCa5D8jpDF6bsLTF1Mrkn939P2V` scan 200 → report 200, root 307 → `/scan`.
- Open: `BUSFACTOR_ADMIN_TOKEN` is not set on Vercel, so production `/admin/metrics` correctly shows Unauthorized. Roshan must set the secret before the dashboard is usable in production. No token was invented or committed.

## 2026-11-20 — Report panel cleanup and dashboard skills

- Decision: Remove the scenic backdrop from the report workspace and stop Base UI from warning about link-based nav tabs.
- Branch taken: Deleted `public/dusk-road.webp`, removed `report-backdrop` CSS and its wrapper, set `nativeButton={false}` on `TabsTab` links, and added a source-level guard for that prop. Updated `docs/report-workspace-design.md` so the spec matches the shipped UI.
- Why: The backdrop was a presentation prop from the Figma reference and added noise without operator value; Base UI tabs rendered `<a>` elements while defaulting to native-button semantics.
- Evidence: `pnpm gate` passes (25 core + 30 web tests), build passes, fresh dev request produced zero `nativeButton` warnings, production deployment `dpl_Cd4AayCjE5QyNZDSM14D5zyuBAhm` has scan 200 → report 200 with zero backdrop references in the HTML.
- Also installed: `.agents/skills/build-dashboard` (Safe / 0 Socket alerts / low Snyk) at Roshan's request. `dashboard-builder` principles are available for the next design decision; no dashboard surface was changed in this commit.

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

## 2026-11-22 — Task 11 (Full Verification, Documentation, and Handoff)

- Decision: Run full Task 11 verification across main and marketing worktrees, record actual results, update project state/docs, and copy the session plan into the repository. No deployment, no push to main, no npm publish.
- Branch taken: Executed required main commands (`pnpm install --frozen-lockfile`, `pnpm gate`, `pnpm verify:build`, `pnpm verify`) and marketing commands (`npm ci --legacy-peer-deps`, `npm test`, `npm run typecheck`, `npm run build`, robots/sitemap/CTA checks). Ran local security scenarios against `next start` on :3199 with controlled env vars; recorded observed HTTP statuses/bodies. Marked PostHog live verification BLOCKED due missing keys.
- Why: The Task 11 brief requires evidence-based handoff and forbids inventing verification results or performing human-gated deployment/publication actions.
- Evidence:
  - Main install: PASS (`pnpm install --frozen-lockfile`, lockfile up to date, pnpm v10.15.0).
  - Main gate: PASS (`pnpm gate` = typecheck+lint+test). Tests: `packages/core` 14 files/48 tests passed; `apps/web` 19 files/91 tests passed.
  - Main verify:build: PASS (Next build compiled, 16/16 static pages generated).
  - Main verify: Initially FAIL (Playwright 20 passed / 1 failed / 21 total). Failing: `tests/functional.spec.ts:68 "API gates reject invalid input and protect admin metrics"` expected `"BusFactor operations"`, but current page heading is `"BusFactor KPI dashboard"` (`apps/web/app/admin/metrics/page.tsx:281`) after Task 7 rename. Follow-up fix updated the stale assertion to `"BusFactor KPI dashboard"`; rerun `pnpm gate` PASS and `pnpm verify` PASS (21 passed / 0 failed / 21 total, 10.9s).
  - Marketing: PASS install/test/typecheck/build/robots. `npm ci --legacy-peer-deps` reported 2 high severity audit warnings; vitest 1 file/3 tests passed; `tsc --noEmit` passed; Vite build passed. `dist/robots.txt` contains sitemap. Scan CTA URL not in static `dist/index.html` but present in built JS/source (`VITE_APP_URL` default `https://heir-weld.vercel.app`).
  - Local security scenarios (actual): local path `fixtures/repos/clean` -> 400 `invalid_input`; `http://169.254.169.254/latest/meta-data` -> 400 `invalid_input`; `https://github.com.evil.com/a/b` -> 400 `invalid_input`; `GET /admin/metrics?token=test-admin-token` without cookie -> 307 `Location: /admin/login`; feedback missing slug -> 404 `{"error":"report not found"}`; kill switch server (`BUSFACTOR_KILL_SWITCH=1`) POST `/api/scan` public repo -> 503 `{"error":"scans are temporarily disabled","category":"unavailable"}`.
  - Analytics live verification: BLOCKED: PostHog keys not supplied.
- Alternatives rejected: Changing the dashboard heading back to "BusFactor operations" (would regress Task 7 naming); fabricating PostHog live-event evidence; running deployment/publish commands.

## 2026-11-22 — Final whole-branch review fix wave

- Decision: Address the two Important final-review findings: add same-origin checks to admin mutation routes and scope PostHog HogQL metrics by `properties.surface`. Keep all deferred minors as tracked follow-ups.
- Branch taken: Added shared `isSameOrigin`/`assertSameOrigin` in `apps/web/lib/admin-auth.ts` and applied it to admin session POST/DELETE and both admin record-deletion routes. Scoped marketing summary/breakdown queries to `surface = 'marketing'` and product/qualified-scan queries to `surface = 'product'`. Aligned the privacy "Last updated" date with terms/removal.
- Why: The final review flagged destructive admin routes without the origin defense already used at login, and mixed product/marketing metrics in a shared PostHog project.
- Evidence: Commit `fee428d`; focused tests 28/28; `pnpm gate` PASS (core 48 tests, web 99 tests); `pnpm verify` PASS (Playwright 21/21); scoped re-review clean.
- Alternatives rejected: A second fix wave (not needed); hardcoding a single PostHog surface filter across the mixed summary query (would hide one surface's metrics).
- Residual: The unscoped total `visitors` count is intentionally a cross-surface total; all per-metric counts and funnels are surface-scoped. PostHog live verification remains blocked on keys.
