phase: MVP
last_prompt: P2.5 (explicit user override; Gate A still unvalidated) @ d13e3d9
status: BLOCKED
gates:
  p0_bootstrap: pass
  url_ingest: stale
  llm_live: stale
  gate_a: not_started
  web_deploy: pass (production, dpl_5mVHWV4GvK5Ahsq8kn7qsU6xFybQ, 20 Nov 2026)
  web_navigation: pass (app shell: / → /scan ↔ /docs ↔ /r/:slug)
  web_landing_removed: pass (no landing artifacts in webapp or repo)
  web_scan_e2e: fail (local pass, production 404: in-memory store lost across serverless instances; see BLOCKERS.md)
env:
  pkg_manager: pnpm@10.15.0 (activated via corepack)
  node: v24.21.0
  deploy_target: Vercel project heir — https://heir-weld.vercel.app
  db: unset
  llm_key_present: false
measured:
  scan_p50_s: null
  cost_per_scan_usd: null
  citation_drop_rate: null
  gold_agreement: null
  seed_repos_scanned: 0
open_blockers: [production report persistence needs DATABASE_URL — see BLOCKERS.md]
next: BLOCKED on a persistent store decision and DATABASE_URL before the hosted scan flow works. Then Gate A posts, 10+ seed reports, and live cost/p50 measurement. Do not mark Gates A/B/C passed.
