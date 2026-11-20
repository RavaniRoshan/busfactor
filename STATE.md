phase: MVP
last_prompt: P2.5 (explicit user override; Gate A still unvalidated) @ da6676a
status: PARTIAL
gates:
  p0_bootstrap: pass
  url_ingest: stale
  llm_live: stale
  gate_a: not_started
  web_deploy: pass (production, dpl_8jCa5D8jpDF6bsLTF1Mrkn939P2V, 20 Nov 2026; remote main synced)
  web_navigation: pass (app shell: / → /scan ↔ /docs ↔ /r/:slug)
  web_landing_removed: pass (no landing artifacts in webapp or repo)
  web_scan_e2e: pass (production POST 200 → report 200 → badge 200, deployment dpl_FinFhuyAXwfJqFXzvpef4xYb8KiM)
  web_persistence_code: pass (Neon adapter + async store API, 35 tests)
  report_workspace: pass (four-view dark workspace, no decorative backdrop, Space UI MIT primitives, 60 tests, fresh review Clean/approve)
  operator_dashboard: pass (real store data, 60 tests, token-gated; production token not set)
  deterministic_verify: pass (pnpm verify 20/20, 0 failures; 5 prior defects fixed)
env:
  pkg_manager: pnpm@10.15.0 (activated via corepack)
  node: v24.21.0
  deploy_target: Vercel project heir — https://heir-weld.vercel.app
  db: Neon Postgres (Vercel integration, DATABASE_URL secret; pooled connection)
  llm_key_present: false (Groq provider implemented; GROQ_API_KEY not set)
measured:
  scan_p50_s: null
  cost_per_scan_usd: null
  citation_drop_rate: null
  gold_agreement: null
  seed_repos_scanned: 0
open_blockers: [BUSFACTOR_ADMIN_TOKEN not set on Vercel — /admin/metrics shows Unauthorized]
next: Set GROQ_API_KEY on Vercel, set BUSFACTOR_ADMIN_TOKEN, supply operator legal identity/jurisdiction, then run Gate A. Gates A/B/C are not passed.
