# Go / no-go audit (Gate C)

| Item | Status | Evidence |
| --- | --- | --- |
| 10+ seed reports live | NO | Only synthetic fixture scans in `docs/SEED_FINDINGS.md`; no consented seed list. |
| Landing page and docs live | PARTIAL | Docs live at `/docs`; landing page intentionally in a separate repo owned by Roshan. |
| Scan error rate under 3% | UNVERIFIED | Smoke tests pass (scan 200 → report 200); no sustained traffic sample. |
| Cost per scan inside cap | GO | Groq free-tier `openai/gpt-oss-20b`; measured `costUsd: 0` on a live scan. |
| Kill switch tested | GO | `BUSFACTOR_KILL_SWITCH=1` → HTTP 503 (see `docs/validation.md`). |
| Spend cap set and tested | GO | `BUSFACTOR_DAILY_SPEND_CAP_USD=0` → HTTP 503 (see `docs/validation.md`). |
| Terms, privacy, removal live | PARTIAL | Rewritten from real data flows with operator name/email; jurisdiction `[NEEDED]`. |
| CLI published | NO | `npm whoami` → 401; no npm credentials available. |
| Repository public if open-source | GO | `https://github.com/RavaniRoshan/busfactor` returns 200. |
| README done | PARTIAL | `README.md` exists with quickstart, CLI and scoring sections. |
| Security regression green | GO | `pnpm gate` 66 tests; `pnpm verify` 20/20; no tracker before consent. |
| Gold set green | PARTIAL | 4 labeled fixtures; PDR target is 20. |
| Live LLM backend | GO | Groq key set as hidden Vercel secret; live scan produced valid report with no LLM pass failures. |

Launch decision: **NO-GO**. Gate A and Gate B are human-controlled and not started; the CLI is not published; the jurisdiction and admin token remain unresolved.

## Fix prompts

- `docs/prompts/fix-1.md`: Write and publish terms, privacy, and removal-request pages. (PARTIAL — jurisdiction needed)
- `docs/prompts/fix-2.md`: Prepare npm publication and README for the CLI. (BLOCKED — npm auth)
- `docs/prompts/fix-3.md`: Add 16 more labeled repositories to the gold set.
- `docs/prompts/fix-4.md`: Deploy the web app and seed 10 public reports. (needs consented seed list)
- `docs/prompts/fix-5.md`: Measure live scan cost and p50 duration. (cost = 0 on free tier; p50 still needed)
- `docs/prompts/fix-6.md`: Persist scans and reports outside a single serverless instance. (RESOLVED)
- Gate A/B: see `docs/validation.md` — drafts and templates are prepared, but only Roshan can publish posts and collect stranger requests.
