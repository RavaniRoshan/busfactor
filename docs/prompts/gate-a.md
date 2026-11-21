# Gate A — demand validation

Role: You are running Gate A for BusFactor. Read `AGENTS.md`, `docs/PDR.md` §13, `docs/validation.md`, and `docs/SEED_FINDINGS.md` first.

Preconditions:
- Posts must be published from **Roshan's** X and LinkedIn accounts. Do not use an agent-owned account and do not fabricate posts, replies, or requests.
- The pass threshold was fixed before posting: **at least 5 strangers ask to run BusFactor on their own repository**. Do not change it.
- Use only the five drafts in `docs/validation.md`. Every claim must be backed by a cited finding there.

Task:
1. If browser/social tooling is available and authenticated as Roshan, publish the five drafts (staggered, one per day or as agreed) on X and LinkedIn. Record date, platform and URL in the "Record of public posts" table in `docs/validation.md`.
2. Monitor replies/DMs for 7–10 days. For every stranger who asks to run BusFactor on their own repository, record date, requester, repository and link in the "Record of stranger requests" table.
3. Do not publish named scores for third-party repositories without consent. Do not imply reviews or customer counts.

Then R0.
GATE: pass if the table contains >=5 distinct stranger requests with links; otherwise `PARTIAL` with the count and STOP.

BRANCH:
- IF no authenticated social access -> STOP and give Roshan the drafts plus exact posting steps; do not mark Gate A started.
- IF requests <5 after the observation window -> write the result in `docs/validation.md`, run the narrowing decision with Roshan (skill-only OPERATE.md generator or stop), and STOP.
- ELSE -> log the pass in `DECISIONS.md` with evidence and run R0.

Never declare this gate passed without real recorded URLs.
