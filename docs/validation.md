# Validation evidence

## Gate A — demand

Status: **not started** — no posts have been published and no stranger requests have been received. An agent cannot complete this gate: it requires real public posts from Roshan's accounts and real replies from strangers.

Threshold fixed before posting: **at least 5 strangers ask to run BusFactor on their own repository** (`AGENTS.md` §8). This threshold must not be changed after posting.

### Draft posts (ready to publish, not published)

These use only findings already recorded in `docs/SEED_FINDINGS.md` and cited there. Do not publish a named repository score without consent.

1. **The clean baseline** — "A tiny repo with a README, lockfile, tests and CI scored 100/100. Not because it was large — because a stranger could run it without asking anyone."
2. **What one missing test costs** — "Same service, tests removed: the verdict dropped into 'Risky'. The code still worked. Only the handoff got worse."
3. **The committed secret cap** — "One secret-like value in `.env` caps the score at 49, no matter how good everything else is. A handoff is only as safe as its worst secret."
4. **Hostile input** — "We fed a repo with prompt-injection payloads in README and comments into the scan. The report schema held. Unknown stayed unknown."
5. **The author question** — "The most useful output isn't the score. It's the list of things only the original author can answer — written down before they leave."

### Record of public posts

| Date | Platform | Link | Stranger asked to scan their repo? | Notes |
| --- | --- | --- | --- | --- |

### Record of stranger requests

| Date | Requester | Repository | Link | Notes |
| --- | --- | --- | --- | --- |

## Gate B — V1 complete

Status: **not started**. Requires 5 external users who scanned their own repositories and at least 3 who said the report would have helped. An agent cannot fabricate users or their feedback.

| User | Repo | Would it have helped? | Notes |
| --- | --- | --- | --- |

## Gate C — go/no-go

Status: **partial**. Technical items below have evidence; human items remain.

| Item | Status | Evidence |
| --- | --- | --- |
| Live Groq backend | GO | Public scan of `RavaniRoshan/busfactor` returned a report with no LLM pass failures; 23 findings, 10 questions; `costUsd: 0` on Groq free tier. |
| Hosted scan → report | GO | Production scan 200, report 200, badge 200; verified after Neon integration. |
| Kill switch | GO | Local `BUSFACTOR_KILL_SWITCH=1` returned HTTP 503 with `{"error":"scans are temporarily disabled"}`. |
| Spend cap | GO | Local `BUSFACTOR_DAILY_SPEND_CAP_USD=0` returned HTTP 503 with `{"error":"daily spend cap reached"}`. |
| Deterministic verification | GO | `pnpm gate` 67 unit tests pass; `pnpm verify` 20/20 pass. |
| Legal pages live | PARTIAL | Privacy, terms and removal rewritten from real data flows with operator name and email; governing law/jurisdiction marked `[NEEDED]`. |
| Admin token | NOT SET | `BUSFACTOR_ADMIN_TOKEN` is absent on Vercel; `/admin/metrics` shows Unauthorized. |
| CLI published | BLOCKED | `npm whoami` returns 401 — no npm credentials in this environment. |
| 10+ seed reports live | NO | Only synthetic fixture findings exist; no consented seed-repository list. |
| Landing page | PARTIAL | Removed from this app by owner decision; separate repo is Roshan's work. |
| Sustained error rate | UNVERIFIED | Smoke tests pass; no production traffic sample exists. |
| Gate A / Gate B | NOT STARTED | Human-controlled; see above. |
