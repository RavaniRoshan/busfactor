phase: MVP
last_prompt: P2.5 (explicit user override; Gate A still unvalidated) @ 9e428ec
status: PASS
gates:
  p0_bootstrap: pass
  url_ingest: stale
  llm_live: stale
  gate_a: not_started
  web_deploy: pass (production, dpl_9Lfb2KuPG3GSpmnGGqNUjKUaGqei, 20 Nov 2026; remote main synced)
  web_navigation: pass (app shell: / → /scan ↔ /docs ↔ /r/:slug)
  web_landing_removed: pass (no landing artifacts in webapp or repo)
  web_scan_e2e: pass (production POST 200 → report 200 → badge 200, deployment dpl_FinFhuyAXwfJqFXzvpef4xYb8KiM)
  web_persistence_code: pass (Neon adapter + async store API, 35 tests)
env:
  pkg_manager: pnpm@10.15.0 (activated via corepack)
  node: v24.21.0
  deploy_target: Vercel project heir — https://heir-weld.vercel.app
  db: Neon Postgres (Vercel integration, DATABASE_URL secret; pooled connection)
  llm_key_present: false
measured:
  scan_p50_s: null
  cost_per_scan_usd: null
  citation_drop_rate: null
  gold_agreement: null
  seed_repos_scanned: 0
open_blockers: []
next: Gate A human demand test (posts + 5 stranger requests), then 10+ seed reports and live cost/p50 measurement. Gates A/B/C are not passed. A separate landing-page repo is owned by Roshan.
