# Gate B — V1 complete / external validation

Role: You are running Gate B for BusFactor. Read `AGENTS.md`, `docs/PDR.md` §13, `docs/validation.md`, and `docs/go-no-go.md` first.

Preconditions:
- Gate A must be PASS before V1 work is considered complete.
- Requires **5 external users** who scanned their **own** repositories and **at least 3** who say the report would have helped.
- Do not invent users, repositories, or feedback. Do not mark answers "helpful" on behalf of anyone.

Task:
1. Invite the people who requested scans in Gate A (and direct volunteers) to run `https://heir-weld.vercel.app/scan`.
2. For each participant, record in the Gate B table in `docs/validation.md`: user, repository, the `would have helped` Yes/No answer in their own words, and notes/link.
3. Use the existing feedback widget on the report page; do not write rows into `apps/web/data/feedback.json` manually.
4. Cross-check `docs/go-no-go.md`: technical Gate C items must be GO or explicitly accepted before declaring V1 complete.

Then R0.
GATE: pass if there are >=5 distinct external users and >=3 explicit "would have helped" answers; otherwise `PARTIAL` with exact counts and STOP.

BRANCH:
- IF Gate A is not PASS -> STOP, run Gate A first.
- IF no external users yet -> prepare the invitation text and STOP for Roshan to send it; do not mark Gate B started.
- IF feedback is weak (<50% helpful) -> report it honestly; do not spin it.
- ELSE -> log the pass in `DECISIONS.md` with table evidence and run R0.

Never declare this gate passed without real participant records.
