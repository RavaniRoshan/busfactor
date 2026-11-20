# Decisions

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
