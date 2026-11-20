# BusFactor — Execution Playbook (MVP → V1 → V2)

Companion to [`PDR.md`](PDR.md). Version 0.1, 19 Nov 2026. Run prompts in order. Use `R0` whenever unsure. The operating contract in [`../AGENTS.md`](../AGENTS.md) applies to every prompt.

## How this works

- Run prompts in order. After any prompt, run **R0 (Router)** if you are unsure. It reads project state and picks the next move, including repair loops.
- Rules live in `AGENTS.md`. Every prompt inherits them, which is why the prompts are short. Never paste the protocol again.
- Memory between prompts is files, not chat: `STATE.md` (where we are), `DECISIONS.md` (why, and which branch was taken), `PARKING.md` (ideas refused for now), `BLOCKERS.md` (what needs a human).
- Branches are written as IF / ELSE IF / ELSE. Take the first branch that matches and log it in `DECISIONS.md`.
- Three human gates exist: A (seed posts), B (external users), C (go/no-go). Prompts stop and tell you what to bring back.
- Use the strongest available model for `P1.5`, `P1.6`, `P2.3`, `P2.7`, and `R3`. A faster model is fine elsewhere.
- Bring a result back to Roshan only when it says `BLOCKED`. Paste the `RESULT` block plus `BLOCKERS.md`.
- Before starting, you need an Anthropic API key in the environment and 5–10 repositories that can be ethically published about (own repositories, volunteers, or run privately).

---

## Phase 0: Setup

### P0.1 Bootstrap (makes the project runnable)

```text
ROLE: You are the only engineer on BusFactor (working name): a tool that answers "could someone who didn't write this repository safely run it?" The spec is docs/PDR.md. Read it fully before acting.

PREFLIGHT
- IF docs/PDR.md is missing → STOP. Ask Roshan to restore it. Do not invent a spec.
- ELSE IF the directory already contains code → read it, do not overwrite. Adapt the layout in AGENTS.md to what exists and log the deviation in DECISIONS.md.
- ELSE → proceed.

TASK
1. pnpm TypeScript monorepo: packages/core, packages/cli, apps/web (empty shell), fixtures/, docs/. Strict TypeScript, vitest, eslint, prettier. Use the installed Node and pnpm. If something is missing, pick the closest option and record it in STATE.env.
2. Verify AGENTS.md exists and contains the operating protocol. CLAUDE.md must be a symlink to AGENTS.md. Do not overwrite either file.
3. Create STATE.md, DECISIONS.md, PARKING.md, and BLOCKERS.md from the templates in AGENTS.md section 9. STATE.md starts at phase P0 and next P0.1.
4. Add a `pnpm gate` script = typecheck + lint + test. It must pass on the empty shell.
5. git init if needed. Commit.

GATE: `pnpm gate` passes; the four state files exist; `git status` is clean.

BRANCH
- IF pnpm gate fails after 3 attempts → BLOCKED.
- ELSE → PASS, NEXT P1.1.
```

---

## Phase 1: MVP (engine first, web last)

### P1.1 Core contracts

```text
READS: PDR sections 5, 6 (C, D, E), 7
PREFLIGHT: STATE.last_prompt = P0.1 and status PASS. IF NOT → run R0.

TASK: In packages/core define Zod schemas and types: Evidence {file, lineStart, lineEnd, quote}; Finding {id, dimension, ruleId, severity, message, evidence[], source: deterministic|llm, validated}; the 7 Dimensions from PDR section 7; Snapshot; Report {score, verdict, dimensions[], findings[], authorQuestions[], operateMd, meta{engineVersion, rubricVersion, sha, costUsd, durationMs}}. Define a Scanner interface (snapshot) => Finding[] and a registry. Export JSON Schema. Add 3 hand-written sample reports as fixtures.

GATE: pnpm gate; samples validate; schema snapshot test.

BRANCH: IF the PDR and this prompt disagree on a dimension name or weight → follow the PDR, log it. ELSE → PASS, NEXT P1.2.
```

### P1.2 Ingestion and snapshot

```text
READS: PDR A1-A3, section 9
PREFLIGHT: P1.1 PASS, else R0.

TASK: Ingest a local path or a github.com URL (tarball via the GitHub API, no git clone dependency), pinned to a commit SHA. Apply the ignore rules and caps from the PDR (5k files / 25 MB default, configurable) with clean errors. Guard symlinks, path traversal, and archive bombs. Detect stack (JS/TS, Python). Produce a Snapshot: file list, lazy content loading, language stats, git author counts when local.

GATE: fixtures for a normal repository, an over-cap repository, a symlink escape, a binary-heavy repository, and an unsupported-stack repository (must return the limited-analysis flag, not crash).

BRANCH: IF URL ingest cannot be tested live here (network or rate limit) → mock HTTP, mark gate url_ingest=stale, continue; P1.8 must re-verify it. ELSE IF a guard test fails → fix it now; it is a security bug, not polish. ELSE → PASS, NEXT P1.3.
```

### P1.3 Deterministic scanners, batch 1

```text
READS: PDR B1-B5
PREFLIGHT: P1.2 PASS, else R0.

TASK: Implement B1-B5 as separate scanners with rule IDs, severities, and evidence. Secret values are always redacted in evidence. Each scanner gets fixtures with at least 3 positive and 3 negative cases. Then run all scanners over fixtures/ plus 3 real repositories on disk: ask Roshan for paths. IF none are provided, build good/mid/bad synthetic repositories and mark gate real_repo_validation=stale.

GATE: scanner tests pass; the clean fixture produces no high-severity findings; every seeded issue in the bad fixture is found.

BRANCH: IF a scanner flags the clean fixture → tighten the rule; IF still noisy after 3 attempts → disable that rule, log it, status PARTIAL. ELSE IF a scanner misses a seeded issue → widen the rule and add the case. ELSE → PASS, NEXT P1.4.
```

### P1.4 Scoring engine

```text
READS: PDR section 7
PREFLIGHT: P1.3 PASS or PARTIAL, else R0.

TASK: Pure function findings → dimension scores → total → verdict, with the hard caps from the PDR. Version it as rubric@0.1. Add explain(): top 5 reasons, each with a fix sentence and an effort tag (S/M/L).

GATE: same input gives same output; adding a high-severity finding never raises the score; caps work; good/mid/bad fixtures score in that order with gaps of 15+ points.

BRANCH: IF the fixtures do not order or gap correctly → adjust severity mapping or weights (not the fixtures), log the change; max 3 tries, then BLOCKED. ELSE → PASS, NEXT P1.5.
```

### P1.5 LLM passes and citation validator

```text
READS: PDR C1-C7, sections 8 and 9
PREFLIGHT: IF no API key in env → build against a mock provider, set STATE.env.llm_key_present=false, mark real-run gates stale, continue. ELSE continue live.

TASK: Provider interface (Anthropic + mock). Context builder: rank files by entry points, size, and deterministic findings; enforce a token budget. Passes: map, intent, risk review (only for critical paths detected by scanners; if none found, say so), author questions. Output via Zod-validated JSON. Citation validator: re-read the cited file, confirm range and quote, drop invalid claims, record the drop rate. Injection defense: file contents wrapped as delimited data, no tools during a scan. Build a hostile fixture repository with injection payloads in README, comments, and filenames.

Scope note: implement the security-critical subset of C6/C7 needed for a safe MVP. Full model tiering and the eval harness remain V1 work in P2.2/P2.3.

GATE: mock-mode tests pass. IF live: run on 3 fixtures and record citation_drop_rate; the hostile fixture must not change the output schema, leak instructions, or add fake findings.

BRANCH: IF injection succeeds → fix before anything else; BLOCKED if unfixed after 3 attempts. ELSE IF drop rate > 25% → run R3. ELSE IF a live run costs > $1 → shrink the context budget and rerun. ELSE → PASS, NEXT P1.6.
```

### P1.6 OPERATE.md and Author Questions

```text
READS: PDR E2, E3, section 5
PREFLIGHT: P1.5 PASS or PARTIAL, else R0.

TASK: Generate OPERATE.md from deterministic facts (scripts, env vars, ports, Dockerfile) plus LLM prose. Sections: What it is, Run locally, Env vars, Deploy, First-hour debugging, Rollback, Known risks, Things only the author knows. Every statement is either derived from a deterministic fact or cited. Anything unknown is written as "UNKNOWN: ask the author." Never invent commands: every command must exist in package.json, a Makefile, a Dockerfile, or the README. Author Questions come from missing-documentation findings and unanswerable intent gaps, each tied to evidence.

GATE: golden-file tests on 3 fixtures; a no-invented-commands test; every Author Question traces to evidence.

BRANCH: IF any invented command appears → tighten the generator constraint and add the case to tests. ELSE IF more than 30% of sections are UNKNOWN on a good fixture → the fact extraction is too weak; improve scanners before prompts. ELSE → PASS, NEXT P1.7.
```

### P1.7 CLI, seed run, Gate A pack

```text
READS: PDR E1, F1, sections 12 and 13
PREFLIGHT: P1.6 PASS or PARTIAL, else R0. IF docs/seed-repos.txt is missing → create a template and STOP; ask Roshan for 5–10 repositories he has consent to publish about (own, volunteers) or will only run privately.

TASK: `busfactor scan <path|url> --out <dir> --format md,json`, progress output, exit codes (0 ok, 2 when --fail-under trips). Run it on every repository in docs/seed-repos.txt. Write docs/SEED_FINDINGS.md: per repository the verdict, top 3 findings with evidence, and one surprising observation. Draft one X-length post per repository, using only findings that are cited. Flag anything that looks like a false positive for Roshan's manual review before posting.

GATE: CLI end-to-end test; seed run completes; a grep test proves no report contains an unredacted secret.

BRANCH: IF a seed repository fails to scan → classify (cap, unsupported stack, bug); bug → fix; otherwise record it as a known limitation. ELSE → PASS. Then STOP with: GATE A is human. Post the findings, record replies and requests in docs/validation.md (who asked to scan their repository, link, date), then run R0.
```

### P1.8 Web MVP (conditional on Gate A)

```text
READS: PDR F2, I1, sections 8 and 13; docs/validation.md
PREFLIGHT:
- IF docs/validation.md is missing or empty → STOP: complete Gate A first.
- ELSE IF it records Gate A as failed against the PDR threshold → do NOT build the web app. Write the narrowed alternative into DECISIONS.md (skill-only OPERATE.md generator: F3 + E2) and STOP for Roshan's decision.
- ELSE → proceed.

TASK: Next.js app: URL form → POST /api/scan → job → status polling → report page, using packages/core. No auth. Persist scans, findings, and reports in Postgres. Re-verify live URL ingest if gate url_ingest is stale. First measure scan duration on 5 repositories, then pick the runtime.

GATE: end-to-end test of the happy path plus failure paths (bad URL, over cap, unsupported stack); preview deploy works; record scan_p50_s and cost_per_scan_usd.

BRANCH: IF p50 < 45s and fits serverless limits → run inside a background function. ELSE IF 45–300s → separate worker with a DB-backed queue. ELSE → shrink the context budget first, re-measure, then decide. IF cost per scan > $0.30 → run P2.2's cost loop early. ELSE → PASS, NEXT P2.1.
```

---

## Phase 2: V1 (launch-ready)

### P2.1 Report page, share URLs, OG image, badge

```text
READS: PDR E4-E6, G1-G3
PREFLIGHT: P1.8 PASS, else R0.

TASK: Report page: verdict on top, 5 reasons with fixes, risk map by dimension, OPERATE.md preview with copy/download, Author Questions, rubric link, scanned SHA, and engine version. Unguessable slugs, noindex by default, publish toggle. OG image showing the score. SVG badge endpoint. A copy-share-text button (X and LinkedIn). Fix-list export as a Markdown checklist.

GATE: end-to-end test; OG image renders; badge renders; noindex header present on unpublished reports; page usable on mobile and by keyboard.

BRANCH: IF OG generation is slow at the edge → pre-render at scan completion. IF a report contains an unredacted secret → stop everything, fix, add a regression test. ELSE → PASS, NEXT P2.2.
```

### P2.2 Hardening: limits, cache, cost, abuse

```text
READS: PDR A5, C6, I2, I3, I6, section 9
PREFLIGHT: P2.1 PASS or PARTIAL, else R0.

TASK: Per-IP and per-repository rate limits; global daily spend cap with an env-flag kill switch; cache by repository + SHA + engineVersion; timeouts that return partial reports; friendly error taxonomy; github.com-only allowlist; retention job (snapshots deleted after 7 days); a final redaction pass over stored output; model tiering (cheap model for map, strong for risk review).

GATE: 50 concurrent scans on staging with a mocked LLM, then 10 live; the spend cap trips; the kill switch is tested; cache hit returns in under 2s.

BRANCH: IF median cost per scan > $0.30 → cost loop: (1) cheaper model for the map pass, (2) tighter context, (3) cache intermediate passes; re-measure each time, max 3 loops. IF still > $0.60 → BLOCKED with options (lower free scans per day, lower repository cap). ELSE → PASS, NEXT P2.3.
```

### P2.3 Eval harness and rubric calibration

```text
READS: PDR section 11, D2
PREFLIGHT: P2.2 PASS or PARTIAL, else R0.

TASK: Gold-set directory with label files (verdict, known issues). Runner prints a metrics table (citation validity, drop rate, secret precision, verdict agreement within one band). CI gate that reruns on any engine, rubric, or prompt change and diffs scores. Build the 5 deliberately bad fixtures if they do not exist.

GATE: runner works end to end; regression gate fails on a seeded regression.

BRANCH: IF fewer than 15 labeled repositories exist → run with what exists, mark gold_set_small, and list exactly what labels Roshan must provide. ELSE IF verdict agreement < 80% → STOP and show the top 5 disagreements; for each ask whether the tool or the label is wrong. Apply only what Roshan decides, bump rubric version, rerun. ELSE → PASS, NEXT P2.4.
```

### P2.4 Claude Code skill and MCP server

```text
READS: PDR F3, F4
PREFLIGHT: P2.3 PASS or PARTIAL, else R0.

TASK: Skill `handoff` (SKILL.md) that runs the scan, then interviews the user on the Author Questions and writes the answers into OPERATE.md in the repository. MCP server over stdio exposing scan_repo, get_report, generate_operate_md. Install docs for both.

GATE: run the skill end to end on a sample repository; list and call each MCP tool with a test client; show the real output.

BRANCH: IF the CLI is not published yet → point the skill at the local build, mark gate publish_cli=stale (P2.9 requires it). ELSE IF the interview flow produces UNKNOWN sections the user could fill → improve the question wording, rerun once. ELSE → PASS, NEXT P2.5.
```

### P2.5 Landing page, docs, waitlist

```text
READS: PDR J, G4, H1, section 4
PREFLIGHT: P2.1 PASS and at least 1 real seed report exists, else R0.

TASK: Landing page: one-sentence promise, a real report as the hero, 3-step how-it-works, the rubric explained, FAQ (privacy, accuracy, what it does not do), Pro waitlist (email only). Docs: quickstart, CLI, skill, MCP, rubric, limits. Copy style: sharp, short, no AI optimism. Every claim must be true of this build; check against STATE gates.

GATE: links check; waitlist submission is stored; Lighthouse performance and accessibility both 90+ on mobile.

BRANCH: IF a competitor comparison is requested → write TODO verify, do not assert. IF a claim has no passing gate behind it → remove it. ELSE → PASS, NEXT P2.6.
```

### P2.6 Observability, analytics, feedback

```text
READS: PDR I3-I5
PREFLIGHT: P2.2 PASS or PARTIAL, else R0.

TASK: Structured logs; error tracking; metrics for scans, failures, cost, and duration; privacy-friendly funnel events (landing, scan, report view, share); the feedback widget: "Would this have helped when the original author left?" Yes/No plus note, stored per scan; a token-protected /admin/metrics page.

GATE: events appear in the store; the widget submits; the admin page requires its token.

BRANCH: IF any analytics call sets cookies or stores raw IPs → change it to hashed, cookieless. ELSE → PASS, NEXT P2.7.
```

### P2.7 Security pass

```text
READS: PDR section 9
PREFLIGHT: P2.6 PASS or PARTIAL, else R0.

TASK: Walk the threat list: SSRF, path traversal, archive bombs, secrets in logs and reports, prompt injection (expand fixtures to 10 payload types), dependency audit, security headers and CSP, auth on admin routes, retention. Fix each finding and add a regression test.

GATE: all regression tests pass; dependency audit clean of high severity; injection suite passes.

BRANCH: IF a critical issue is found (secret leak, injection that changes the schema or leaks the prompt, SSRF) → fix it and rerun the whole pass; BLOCKED if unfixed after 3 attempts. ELSE IF only low or medium → fix the cheap ones and log the rest in DECISIONS.md as accepted risk with a reason. ELSE → PASS, NEXT P2.8.
```

### P2.8 Launch assets (from real data)

```text
READS: PDR J, section 14; docs/validation.md; STATE.measured
PREFLIGHT: IF docs/validation.md has no external-user feedback → STOP: Gate B needs 5 external users and at least 3 would-have-helped answers.

TASK: Generate: 10 tagline options (ranked, within Product Hunt's current limits; verify them), description, maker's first comment, X thread (8 posts), LinkedIn post, a 30–60s demo script with shot list, text for 5 gallery images, DM and email templates, a launch-day runbook with an hourly checklist, and a reply bank for the 10 likeliest objections. Style: sharp, concise, publish-ready. Every number comes from validation.md or STATE.measured; otherwise write [NUMBER NEEDED].

GATE: no unsourced number; no unverified competitor claim; every product claim maps to a passing gate.

BRANCH: IF feedback is weak (under 50% would-have-helped) → do not spin it. Write honest positioning around what did resonate and flag the weakness to Roshan. ELSE → PASS, NEXT P2.9.
```

### P2.9 Go / no-go gate

```text
READS: PDR section 13 (Gate C), J
PREFLIGHT: P2.8 PASS or PARTIAL, else R0.

TASK: Audit every Gate C item with evidence: 10+ seed reports live, landing page and docs live, scan error rate under 3%, cost per scan inside the cap, kill switch drill done, spend cap set, terms/privacy/removal live, CLI published, repository public if open-source, README done, security regression green, gold set green. Output a GO / NO-GO table. For each NO, write a focused fix prompt into docs/prompts/fix-<n>.md in this same format.

GATE: the table exists and every row cites evidence.

BRANCH: IF every row is GO → print the launch-week checklist and STOP. ELSE → run the generated fix prompts in order, then rerun P2.9.
```

---

## Phase 3: V2 (order decided by P3.0, not by this list)

### P3.0 Post-launch triage

```text
READS: PDR section 6 (V2 items), docs/validation.md, STATE.measured
PREFLIGHT: at least 7 days since launch, else STOP.

TASK: Read feedback, analytics, waitlist count, GitHub issues, and the replies Roshan pastes in docs/launch-notes.md. Rank the V2 items by evidence (number of requests × effort). Output a new order for P3.1–P3.8, what to skip, and why. Write it to STATE.next.

BRANCH: IF nobody asked for private repositories → push P3.1 down. IF paying intent is absent → skip P3.4. IF the most common feedback is outside the PDR → add it to PARKING.md and show Roshan the count before building. ELSE → follow the evidence.
```

### P3.1 to P3.8

Each follows the standard protocol; run in the order `P3.0` sets.

```text
P3.1 GitHub App and private repositories (A6): read-only, ephemeral checkout, no source persisted, encrypted tokens, install flow. GATE: private repository scans; nothing stored beyond findings. BRANCH: IF any source touches disk beyond the job → fix before shipping.
P3.2 GitHub Action (F5): PR comment, score diff, optional threshold gate. BRANCH: IF the score diff is noisy on unrelated PRs → scope to changed critical paths.
P3.3 Accounts, history, PDF export (H2, E7): GitHub OAuth, report history. BRANCH: IF PDF rendering needs a headless browser → choose the lightest option that passes the render test.
P3.4 Billing (H3): Stripe checkout, Free vs Pro limits. PREFLIGHT: P3.0 shows paying intent, else skip. BRANCH: IF webhooks fail the replay test → fix before charging anyone.
P3.5 Drift (D4): rescan on push, score history, alert on drop. BRANCH: IF alerts exceed 1 per repository per week in testing → raise the threshold.
P3.6 Second-reviewer gate (H5): named reviewer answers Author Questions before handoff is marked complete. BRANCH: IF reviewers ignore it in testing → shorten the question set.
P3.7 Teams and portfolio view (H4): organisation dashboard across repositories. PREFLIGHT: at least 3 teams asked, else skip.
P3.8 Benchmark post and opt-in leaderboard (G5, G6): aggregates only from consenting or anonymised data; never publish a named score without consent.
```

---

## Repair prompts

### R0 Router (run after any prompt, or when lost)

```text
Read AGENTS.md, STATE.md, BLOCKERS.md, PARKING.md, the last 20 lines of DECISIONS.md, `git status`, and `git log -10`. Decide in this order; the first match wins:
1. IF STATE.status = BLOCKED or BLOCKERS.md is non-empty → summarise the blocker in 5 lines, list the 2 options and your recommendation, STOP and wait for Roshan.
2. ELSE IF the working tree is dirty or `pnpm gate` fails now → run R1.
3. ELSE IF a gate is stale and the next prompt needs it → say which gate, give the exact thing Roshan must provide (path, key, URL, human step), STOP.
4. ELSE IF PARKING.md has more than 5 open items for the current phase → run R4.
5. ELSE IF scoring, rubric, or prompt code changed since the last recorded eval → run R2 before moving on.
6. ELSE IF last_prompt is PASS → run the prompt named in STATE.next (check its PREFLIGHT first).
7. ELSE IF last_prompt is PARTIAL → list what is missing, recommend finishing it or accepting it, and ask Roshan.
8. ELSE → run R5.
Print: DECISION: <rule number> → <action taken>.
```

### R1 Gate-failure fixer

```text
A gate is failing. Do not edit tests to make them pass unless a test is provably wrong (explain why).
1. Reproduce. Capture the exact failing output.
2. Classify: (a) real bug, (b) flaky or environment, (c) test outdated by an intentional decision in DECISIONS.md, (d) spec conflict.
3. (a) → minimal fix plus a regression test. (b) → pin or deflake, record the env fact in STATE. (c) → update the test and cite the decision. (d) → STOP and show both readings.
4. Same failure after 3 attempts → BLOCKERS.md and stop.
5. Rerun `pnpm gate`, then R0.
```

### R2 Regression hunt

```text
Scores or outputs changed and nobody knows why.
1. Run the gold set (or fixtures if docs/eval/last.json is absent; say which). Diff against the last recorded results.
2. IF any repository swings more than 10 points → bisect the commits and report the cause in 5 lines.
3. IF the cause was intended (a rubric or prompt change logged in DECISIONS.md) → update the baseline and bump the rubric or engine version. ELSE → revert or fix, and add a regression test.
4. Then R0.
```

### R3 LLM quality repair

```text
Symptoms: high citation drop rate, invented commands, vague findings, or an injection that worked.
1. Run the failing sample 5 times and record the variance.
2. IF an injection worked → fix it first and add the payload to fixtures. Everything else waits.
3. ELSE diagnose in this order: (a) context too big or irrelevant, (b) schema too loose, (c) the prompt asks for judgment instead of extraction, (d) wrong model tier for this pass.
4. Change ONE thing at a time. Re-measure on the same samples. Keep a change only if the metric improves by at least 20% relative. Max 3 iterations, then BLOCKED with what was learned.
```

### R4 Scope check

```text
Build nothing. Read PARKING.md and the PDR tier for the current phase. For each open parked item: is it required by a gate or a launch deliverable in the PDR? Yes → schedule it. No → leave it parked. Report: what we build next, what we are explicitly not building, and the estimated days left in this phase based on commit pace. IF days left exceed the PDR plan → recommend specific cuts, smallest scope first.
```

### R5 Resume after a context loss

```text
New session. Rebuild context without guessing: read AGENTS.md, STATE.md, the last 30 lines of DECISIONS.md, `git log -15`, then run `pnpm gate`. Check STATE against reality: does the last prompt's output actually exist? Correct STATE.md where it is wrong, then run R0.
```

### R6 Incident (launch day or after)

```text
Production incident: error spike, cost spike, abuse, or a report that should not be public.
1. Contain first. Flip the kill switch or lower the spend cap for cost or abuse; take the report offline for a content problem. Say exactly what was changed.
2. Diagnose from logs and metrics: bug, load, abuse, upstream outage, or bad data.
3. Minimal patch plus a regression test. Deploy, verify, restore service.
4. Write docs/incidents/<date>.md: timeline, cause, fix, prevention.
5. IF the incident exposed private code or secrets → stop everything else, list exactly what was exposed, and tell Roshan what needs to be disclosed.
```
