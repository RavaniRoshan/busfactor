phase: MVP
last_prompt: Task 11 (Full Verification, Documentation, and Handoff) @ 0bfadaa
status: PARTIAL
gates:
  p0_bootstrap: pass
  url_ingest: stale
  llm_live: pass (Groq free tier, live scan valid, costUsd 0)
  gate_a: not_started (posts drafted in docs/validation.md; not published)
  web_deploy: pass (production, dpl_8jCa5D8jpDF6bsLTF1Mrkn939P2V, 20 Nov 2026; remote main synced)
  web_navigation: pass (app shell: / → /scan ↔ /docs ↔ /r/:slug)
  web_landing_removed: pass (no landing artifacts in webapp or repo)
  web_scan_e2e: pass (production POST 200 → report 200 → badge 200, deployment dpl_FinFhuyAXwfJqFXzvpef4xYb8KiM)
  web_persistence_code: pass (Neon adapter + async store API, 35 tests)
  report_workspace: pass (four-view dark workspace, no decorative backdrop, Space UI MIT primitives, 60 tests, fresh review Clean/approve)
  operator_dashboard: pass (real store data, 60 tests, token-gated; production token not set)
  deterministic_verify: fail (pnpm verify 20/21 passed, 1 failed; see measured)
  task11_main_install: pass (pnpm install --frozen-lockfile; lockfile up to date; pnpm v10.15.0)
  task11_main_gate: pass (pnpm gate: typecheck PASS, lint PASS, test PASS; core 14 files/48 tests, web 19 files/91 tests)
  task11_main_verify_build: pass (pnpm verify:build: core build PASS, web Next build PASS, 16/16 static pages)
  task11_main_verify: fail (pnpm verify: 20 passed, 1 failed; functional.spec.ts:68 expects "BusFactor operations" but /admin/metrics heading is "BusFactor KPI dashboard")
  task11_marketing_install: pass (npm ci --legacy-peer-deps; 290 packages; 2 high severity audit warnings reported)
  task11_marketing_test: pass (vitest: 1 file, 3 tests passed)
  task11_marketing_typecheck: pass (tsc --noEmit)
  task11_marketing_build: pass (vite build; dist contains robots.txt + sitemap.xml)
  task11_marketing_robots: pass (dist/robots.txt contains Sitemap: https://ravaniroshan.github.io/busfactor-landing-page/sitemap.xml)
  task11_security_local: pass (local next start on :3199; local path 400 invalid_input; metadata IP 400 invalid_input; github.com.evil.com 400 invalid_input; admin ?token redirect 307 /admin/login; feedback missing slug 404; kill switch 503 unavailable)
  task11_analytics_live: blocked (PostHog keys not supplied)
env:
  pkg_manager: pnpm@10.15.0 (activated via corepack); npm used for marketing worktree
  node: v24.21.0
  deploy_target: Vercel project heir — https://heir-weld.vercel.app (no deployment performed in Task 11)
  db: Neon Postgres (Vercel integration, DATABASE_URL secret; pooled connection)
  llm_key_present: true (GROQ_API_KEY hidden Vercel secret; never in repo/logs)
measured:
  scan_p50_s: null
  cost_per_scan_usd: null
  citation_drop_rate: null
  gold_agreement: null
  seed_repos_scanned: 0
  task11_main_install: PASS (pnpm install --frozen-lockfile, 1.1s)
  task11_main_gate: PASS (pnpm gate; typecheck PASS; lint PASS; test PASS — packages/core 14 files/48 tests, apps/web 19 files/91 tests)
  task11_main_verify_build: PASS (pnpm verify:build; Next compiled successfully; 16/16 static pages)
  task11_main_verify: FAIL (pnpm verify; Playwright 20 passed / 1 failed / 21 total, 11.4s). Failure: [chromium] tests/functional.spec.ts:68 "API gates reject invalid input and protect admin metrics" — expected authenticated /admin/metrics page text to contain "BusFactor operations", but current page heading/content is "BusFactor KPI dashboard" (apps/web/app/admin/metrics/page.tsx:281). Received HTML title was app home shell. Stale test expectation; not modified in Task 11.
  task11_marketing_install: PASS (npm ci --legacy-peer-deps; 290 packages; 2 high severity npm audit warnings, no remediation)
  task11_marketing_test: PASS (vitest run; 1 file, 3 tests)
  task11_marketing_typecheck: PASS (tsc --noEmit)
  task11_marketing_build: PASS (vite build; 501ms; chunk-size warning only)
  task11_marketing_robots: PASS (dist/robots.txt has Sitemap: https://ravaniroshan.github.io/busfactor-landing-page/sitemap.xml)
  task11_marketing_cta: PASS with note (static dist/index.html does not include scan URL; built JS contains heir-weld.vercel.app CTA wiring; source uses VITE_APP_URL default https://heir-weld.vercel.app)
  task11_security_local_path: PASS (POST /api/scan {"target":"fixtures/repos/clean"} -> 400 {"error":"Invalid scan target.","category":"invalid_input"})
  task11_security_internal_host: PASS (POST /api/scan {"target":"http://169.254.169.254/latest/meta-data"} -> 400 invalid_input)
  task11_security_evil_domain: PASS (POST /api/scan {"target":"https://github.com.evil.com/a/b"} -> 400 invalid_input)
  task11_security_admin_query_token: PASS (GET /admin/metrics?token=test-admin-token, no cookie, maxRedirects=0 -> 307 Location: /admin/login)
  task11_security_feedback_missing_slug: PASS (POST /api/feedback {"slug":"nonexistent-slug-does-not-exist","helpful":true} -> 404 {"error":"report not found"})
  task11_security_kill_switch: PASS (separate local server with BUSFACTOR_KILL_SWITCH=1; POST /api/scan {"target":"https://github.com/owner/repo"} -> 503 {"error":"scans are temporarily disabled","category":"unavailable"})
  task11_analytics_live: BLOCKED: PostHog keys not supplied
open_blockers:
  - "pnpm verify fails: tests/functional.spec.ts:68 expects 'BusFactor operations' after admin login, current /admin/metrics heading is 'BusFactor KPI dashboard' (stale test expectation; 20/21 Playwright tests pass)"
  - "BUSFACTOR_ADMIN_TOKEN not set on Vercel — /admin/metrics shows Unauthorized (human-owned)"
  - "BUSFACTOR_ADMIN_SESSION_SECRET not set/configured on Vercel (human-owned; recommended)"
  - "BUSFACTOR_LLM_RATES_JSON not set (human-owned if paid inference; free tier records $0)"
  - "PostHog keys not supplied — analytics live verification blocked (human-owned)"
  - "npm auth not supplied — CLI publication blocked (human-owned)"
  - "Jurisdiction [NEEDED] in legal copy before publication (human-owned)"
  - "Consented demo report URL not supplied (human-owned)"
  - "Gate A/B evidence and human deployment approval/checks pending (human-owned)"
next: "Resolve stale Playwright admin-metrics assertion (tests/functional.spec.ts expects 'BusFactor operations'; page renders 'BusFactor KPI dashboard'), then rerun pnpm verify. Human-only: supply PostHog keys for live analytics verification, set BUSFACTOR_ADMIN_TOKEN/BUSFACTOR_ADMIN_SESSION_SECRET (+ BUSFACTOR_LLM_RATES_JSON if paid inference) on Vercel, provide npm auth/jurisdiction/consented demo report, complete Gate A/B evidence, approve deployment."
