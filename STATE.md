phase: MVP
last_prompt: P2.5 (explicit user override; Gate A still unvalidated) @ 8ef9551
status: PASS
gates:
  p0_bootstrap: pass
  url_ingest: stale
  llm_live: stale
  gate_a: not_started
  web_design_system: pass
  web_landing_build: pass
  web_deploy: pass (production, dpl_AyAFEW7WBZEa8tQBVGxULJ7QBpMw, 20 Nov 2026)
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
open_blockers: []
next: Webapp is rebuilt, verified and deployed. Remaining items are external or human-controlled: Gate A public posts, 10+ seed reports, live cost/p50 measurement (no ANTHROPIC_API_KEY present), custom domain. Do not mark Gates A/B/C passed.
