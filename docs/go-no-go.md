# Go / no-go audit (Gate C)

| Item | Status | Evidence |
| --- | --- | --- |
| 10+ seed reports live | NO | Only synthetic and external scan artifacts exist; no public reports published. |
| Landing page and docs live | PARTIAL | Landing page intentionally removed from this webapp and repository; it will live in a separate repo. Docs are live at `/docs` on Vercel production `https://heir-weld.vercel.app`. |
| Scan error rate under 3% | PARTIAL | Production scan → report → badge verified 200 after Neon persistence (`dpl_FinFhuyAXwfJqFXzvpef4xYb8KiM`); no sustained traffic sample yet to measure a rate. |
| Cost per scan inside cap | PARTIAL | Mock runs cost $0; live LLM cost not measured. |
| Kill switch tested | GO | `BUSFACTOR_KILL_SWITCH=1` returns 503. |
| Spend cap set | GO | `BUSFACTOR_DAILY_SPEND_CAP_USD` enforced in the scan route. |
| Terms, privacy, removal live | GO | `/terms`, `/privacy`, `/removal` return 200 on the production deployment. |
| CLI published | NO | Package is built locally; npm publish not done. |
| Repository public if open-source | NO | Repository is local only. |
| README done | PARTIAL | Root README not yet written. |
| Security regression green | GO | `pnpm gate` passes; dependency audit clean. |
| Gold set green | PARTIAL | 4 labeled repositories, 100% verdict agreement; PDR target is 20. |

## Fix prompts

- `docs/prompts/fix-1.md`: Write and publish terms, privacy, and removal-request pages.
- `docs/prompts/fix-2.md`: Prepare npm publication and README for the CLI.
- `docs/prompts/fix-3.md`: Add 16 more labeled repositories to the gold set.
- `docs/prompts/fix-4.md`: Deploy the web app and seed 10 public reports.
- `docs/prompts/fix-5.md`: Measure live scan cost and p50 duration.
- ~~`docs/prompts/fix-6.md`: Persist scans and reports outside a single serverless instance.~~ RESOLVED 20 Nov 2026 via Neon integration + async store adapter.
