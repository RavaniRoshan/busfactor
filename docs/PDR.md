# BusFactor — Product Design & Requirements (PDR / PRD)

| Field | Value |
| --- | --- |
| Working name | BusFactor (verify domain and trademark before committing) |
| Owner | Roshan Ravani |
| Version | v0.1 |
| Date | 19 Nov 2026 |
| Status | Draft, pre-validation |
| Canonical agent contract | [`../AGENTS.md`](../AGENTS.md) |
| Execution playbook | [`PROMPTS.md`](PROMPTS.md) |

This is the product requirements document and the product design reference. If the implementation and this document disagree, this document wins unless a later decision is recorded in `DECISIONS.md` and this document is updated.

---

## 0. How to read this

This is the whole product: everything we have thought of, from the first scan to launch day and beyond. Every item carries a tier:

- **MVP** — works end to end; ugly is fine.
- **V1** — launch-ready.
- **V2** — post-launch, ordered by real feedback.
- **PARK** — an idea, not committed.

Rule: nothing in V2 or PARK gets built until Gates A, B, and C in section 13 pass. If an item has no tier, it is not in the product.

---

## 1. One-liner

> **Could someone who didn't write this safely run it?**

Point it at a repository. Get an operability verdict, a risk map, an `OPERATE.md`, and a list of questions only the author can answer. Every claim cites a file and line.

---

## 2. Problem and evidence

### The problem

Teams and solo founders ship services built by agents that nobody has fully read. When the person who prompted it leaves, the operational knowledge leaves with them. Review gets skipped because it works.

Root cause: generated code volume outran human capacity to understand it. “I wrote it, so I know it” no longer holds.

### Evidence

- Arpit Bhayani's early-November post on vibe-coded production services that only one person understands.
- Hacker News threads on vibe-coding bugs and review quality.
- X threads on dangerous live apps.

Current workarounds: code comments, two-reviewer rules, and accepting the risk.

**Evidence strength: medium.** The qualitative signal is strong; quantitative evidence is thin. This PDR assumes the pain is real. Gate A tests that assumption with public posts before we build V1.

---

## 3. Users

### Primary user

Solo founders and 1–5 person teams shipping production code with Claude Code, Cursor, or Codex.

**Job to be done:** “Before I hand this off, go on leave, get acquired, or hire a contractor, show me what breaks and what only I know.”

### Secondary users

- The person inheriting the repository: a contractor, new hire, or acquirer doing diligence.
- Agencies delivering AI-built apps to clients.
- Engineering leads at companies with high AI-code velocity.

### Not for now

- Enterprise security teams.
- Non-technical owners who cannot act on a finding.

---

## 4. Positioning and competition

### Adjacent categories

- Repository explainers such as DeepWiki-style tools.
- AI review bots such as Greptile-style tools.
- Claude Code's own “explain this repository” capability.
- SAST and secret scanners.
- Agent-memory and harness projects.

As far as we know, none answers the handoff question with a verdict plus the author's knowledge gaps. Re-verify every competitor claim before it goes into launch copy.

### Our edge in three lines

1. A verdict, not a summary.
2. A score computed by code with evidence, so it is defensible.
3. The output is an artifact you commit (`OPERATE.md`), not a dashboard you visit.

### Biggest threat

This becomes a feature of Claude Code or a repository explainer.

**Defense:** remain neutral across agents, produce a shareable report, build benchmark data, and track score drift over time. If the Gate A posts get ignored, treat BusFactor as a feature, not a product.

---

## 5. Product principles (non-negotiable)

1. Every claim cites `file:line` or it gets dropped.
2. Code computes the score. The LLM explains and drafts; it never grades.
3. One artifact, not a platform.
4. No signup for public repositories.
5. Private code is not stored by default. The private path is the local CLI using the user's own key, first.
6. Repository contents are untrusted input. Prompt injection is a first-class threat.
7. “Unknown” beats a guess.
8. No public shaming. Named public scores are opt-in or limited to our own repositories.

---

## 6. Scope map: everything, by module

### A. Ingestion

- **A1 [MVP]** Local path and public GitHub URL, pinned to a commit SHA.
- **A2 [MVP]** Ignore rules for `node_modules`, build output, binaries, vendored code, and lockfile bodies; hard caps (default 5,000 files / 25 MB) with clear errors.
- **A3 [MVP]** Stack detection: JavaScript/TypeScript and Python first; anything else gets a limited-analysis banner.
- **A4 [V1]** Monorepo handling: detect services, score each plus the overall repository.
- **A5 [V1]** Cache by repository + SHA + engine version.
- **A6 [V2]** Private repositories via a GitHub App (read-only, ephemeral checkout).
- **A7 [V2]** GitLab and Bitbucket.
- **A8 [PARK]** Deep support for Go, Rust, Java, and Ruby; zip upload.

### B. Deterministic analysis

- **B1 [MVP]** Secrets in the tree, including committed `.env` files (patterns plus entropy; values always redacted).
- **B2 [MVP]** Dependency hygiene: lockfile present, wildcard or `latest` versions, deprecated packages (offline heuristics first).
- **B3 [MVP]** Tests and CI: tests exist, a test command exists, CI exists and actually runs tests.
- **B4 [MVP]** Runnability: README run steps, Dockerfile or Compose, scripts, ports.
- **B5 [MVP]** Config: environment variables used in code versus documented (`.env.example`).
- **B6 [V1]** Failure handling: swallowed errors, empty catches, network calls without timeout or retry, no health endpoint.
- **B7 [V1]** Observability: logging, error tracking, metrics hooks.
- **B8 [V1]** Critical-path detection: auth, payments, data deletion, migrations, webhooks; flag which have tests and which look unreviewed.
- **B9 [V1]** Data safety: migrations without rollback, destructive queries, no backup mention.
- **B10 [V1]** Git signals: single-author concentration (the literal bus factor), huge dump commits, AI-attribution trailers.
- **B11 [V2]** CVE lookup (OSV) and license check.
- **B12 [V2]** Deploy and infrastructure configuration checks (Terraform, Vercel, Fly, Render configs).
- **B13 [PARK]** Sandbox boot test: actually run the app and see if it starts. Strongest signal, highest cost and risk.

### C. LLM analysis

- **C1 [MVP]** Repository map: modules, entry points, data stores, external services.
- **C2 [MVP]** Intent extraction: what the system is for and its key flows.
- **C3 [MVP]** Risk review of critical paths found by deterministic scanners.
- **C4 [MVP]** Author questions: what cannot be answered from code or docs.
- **C5 [MVP]** Citation validator: re-read the cited file, check the range and quote; invalid claims are dropped and the drop rate is tracked.
- **C6 [V1]** Model tiering (cheap for the map, strong for risk review), token budgeting by file relevance, per-scan cost cap.
- **C7 [V1]** Prompt-injection defenses: delimited data, no tools during scans, schema-only output, hostile-repository fixtures.
- **C8 [V1]** Eval harness against a gold set.
- **C9 [V2]** Intent drift: compare stored intent notes against later changes.
- **C10 [PARK]** Own fine-tuned models; multi-model consensus.

### D. Scoring

- **D1 [MVP]** Rubric v0 (section 7).
- **D2 [V1]** Calibrated on the gold set; rubric versioned and shown on every report.
- **D3 [V1]** Top five reasons, each with a fix and effort estimate.
- **D4 [V2]** Score history and drift.

### E. Outputs

- **E1 [MVP]** Markdown and JSON report.
- **E2 [MVP]** `OPERATE.md`: what it is, run locally, environment variables, deploy, first-hour debugging, rollback, known risks.
- **E3 [MVP]** Author Questions list.
- **E4 [V1]** Web report page: verdict, top reasons, risk map, `OPERATE.md` preview, copy and download.
- **E5 [V1]** Shareable URL, OG image, SVG README badge.
- **E6 [V1]** Fix list export as a Markdown checklist or GitHub issues.
- **E7 [V2]** PDF and SARIF export.
- **E8 [V2]** Auto-PR that adds `OPERATE.md`.
- **E9 [PARK]** Auto-generated architecture diagram and video walkthrough.

### F. Surfaces

- **F1 [MVP]** CLI: `npx busfactor scan <path|url>`.
- **F2 [MVP]** Web: paste a URL, get a report, no signup.
- **F3 [V1]** Claude Code skill `/handoff`: runs the checks, interviews the user on the Author Questions, writes `OPERATE.md` into the repository.
- **F4 [V1]** MCP server: `scan_repo`, `get_report`, `generate_operate_md`.
- **F5 [V2]** GitHub Action: PR comment, score diff, threshold gate.
- **F6 [V2]** GitHub App.
- **F7 [PARK]** VS Code extension, Slack bot, browser extension on `github.com`.

### G. Growth

- **G1 [V1]** Reports are `noindex` by default; publishing is opt-in.
- **G2 [V1]** Share-text generator for X and LinkedIn.
- **G3 [V1]** README badge.
- **G4 [V1]** Seed gallery of at least 10 reports (own repositories, volunteers, consent only).
- **G5 [V2]** Opt-in public leaderboard.
- **G6 [V2]** Periodic “State of vibe-coded repositories” post built from anonymised aggregates.
- **G7 [PARK]** Referral loops and community.

### H. Accounts and money

- **H1 [V1]** Pro waitlist (email only).
- **H2 [V2]** GitHub OAuth and report history.
- **H3 [V2]** Stripe. Free: N public scans per day. Pro: private repositories, history, PDF, Action.
- **H4 [V2]** Teams: organisation dashboard and portfolio across repositories.
- **H5 [V2]** Second-reviewer gate: a named reviewer must answer the Author Questions before a handoff is marked complete.
- **H6 [PARK]** SSO, audit logs, on-premises deployment.

### I. Platform and operations

- **I1 [MVP]** Job queue and status polling.
- **I2 [V1]** Rate limits (IP and repository), global daily spend cap, kill switch.
- **I3 [V1]** Structured logs, error tracking, cost-per-scan metric.
- **I4 [V1]** Privacy-friendly funnel analytics: landing, scan, report view, share.
- **I5 [V1]** Feedback widget: “Would this have helped when the author left?” Yes/No plus note. This is the validation instrument.
- **I6 [V1]** Retention: source snapshots deleted after 7 days; only findings retained.
- **I7 [V1]** Terms, privacy policy, and a removal-request path (report offline within 24 hours).
- **I8 [V2]** Status page, backups, admin console.

### J. Launch deliverables (all V1, all required for Gate C)

- Landing page with a real report as the hero.
- Documentation: quickstart, rubric, limits, FAQ.
- Demo video or GIF, 30–60 seconds; five gallery images.
- Product Hunt tagline, description, maker's first comment; X thread; LinkedIn post.
- 10+ seed reports; pre-launch posts already published.
- DM and email list; launch-day runbook; reply bank for the top 10 objections.
- Open-source repository for the CLI and engine (recommended; see section 16); README; published npm package.
- Post-launch survey and retrospective template.

### PARK extras

- A living `OPERATE.md` maintained by the agent that writes the code.
- Diligence reports for acquirers (likely the highest willingness-to-pay segment; test after launch).
- Community-written rule packs.
- Scoring agent harness configs (`CLAUDE.md`, rules files) themselves.

---

## 7. Scoring rubric v0

Weights are a guess until calibrated on the gold set. Seven dimensions, 100 points:

| Dimension | Points | What it measures |
| --- | ---: | --- |
| Runnability | 20 | Documented run steps, documented environment, Dockerfile or scripts that exist |
| Secrets and config | 15 | No committed secrets; environment variables documented |
| Failure handling and observability | 15 | No swallowed errors, timeouts, logging, health check |
| Tests and CI | 15 | Tests exist; CI runs them |
| Critical paths | 15 | Auth, payments, deletion, migrations, webhooks have tests and are not obviously unreviewed |
| Dependencies | 10 | Lockfile, pinned versions, nothing deprecated |
| Knowledge capture | 10 | README quality, intent comments, architecture notes |

### Bands

- **85–100:** Handoff-ready.
- **70–84:** Operable with a briefing.
- **50–69:** Risky.
- **Below 50:** Only the author can run this.

### Hard caps

- A confirmed live secret caps the total at 49.
- No discoverable way to run the repository caps Runnability at 5.

### Rules

- Deterministic: same SHA + engine version + rubric version = same score.
- Versioned.
- Public rubric.

---

## 8. Architecture

### Stack (boring on purpose)

- TypeScript pnpm monorepo.
- `packages/core` — the engine.
- `packages/cli` — the command-line interface.
- `apps/web` — Next.js on Vercel.
- A separate worker if scans exceed serverless limits (decided by measurement).
- Postgres (Neon or Supabase) for jobs and reports.
- Object storage for artifacts.
- Anthropic API for LLM passes.
- One engine library feeds the CLI, web, skill, MCP server, and Action.

### Pipeline

```text
ingest
  → snapshot (SHA, filtered tree)
  → stack detection
  → deterministic scanners (parallel)
  → context builder (rank files, token budget)
  → LLM passes (map, intent, risk, questions, OPERATE.md)
  → citation validation
  → scoring
  → render (Markdown, JSON, HTML)
  → persist and share
```

### Data model

- `scans`: `id`, `repo_url`, `sha`, `status`, `engine_version`, `rubric_version`, `cost_usd`, `duration_ms`.
- `findings`: `scan_id`, `dimension`, `rule_id`, `severity`, `file`, `line_start`, `line_end`, `message`, `source`, `validated`.
- `reports`: `scan_id`, `score`, `verdict`, `json`, `markdown`, `public`, `slug`.
- `feedback`: `scan_id`, `helpful`, `note`.
- `usage`: `ip_hash`, `day`, `count`.
- `waitlist`: `email`.

V2 adds `users`, `orgs`, `installs`, `subscriptions`, and `signoffs`.

### Endpoints

- `POST /api/scan`
- `GET /api/scan/:id`
- `GET /r/:slug`
- `GET /badge/:slug.svg`
- MCP tools as defined in F4.

### LLM contract

- Structured JSON only.
- Each finding carries a file, a line range, and a quote of 200 characters or less.
- The validator re-reads the file.
- Dropped claims are counted.
- Cost target: median at or below $0.30 per public scan; hard cap $1. Measured in MVP, not assumed.

---

## 9. Security and privacy

- Only `github.com` URLs; size caps; zip-bomb, symlink, and path-traversal guards. No execution of repository code in MVP or V1.
- Untrusted repository text goes to the model as delimited data. No tools are available during a scan. Output only through the schema.
- Ship a hostile-repository fixture set (README and comment injections) as a regression suite.
- Secrets are redacted everywhere (first 4 characters at most) and never stored raw, including in logs.
- Retention per I6; reports of third-party repositories are `noindex`.
- Removal requests are honoured within 24 hours.
- Abuse controls: rate limits, global spend cap, kill switch, CAPTCHA past a threshold.

---

## 10. Non-functional requirements

- p50 report within 90 seconds for repositories up to 50,000 LOC.
- Hard timeout at 5 minutes returns a partial report.
- The score is deterministic; the prose may vary.
- Partial results beat errors: “could not analyze X” appears in the report.
- Report page is readable on mobile and keyboard-navigable.

---

## 11. Evaluation

### Gold set

20 repositories:

- 10 vibe-coded.
- 5 hand-written and solid.
- 5 deliberately bad fixtures we build.

Roshan hand-labels the verdict and known issues.

### Targets (provisional)

- 100% of citations valid after validation.
- Dropped-claim rate under 15%; higher means the prompts are bad.
- Secret precision 95%+.
- Verdict within one band of the hand label on 80%+ of repositories.
- 60%+ of feedback says it would have helped.

### Regression gate

Any change to the engine, rubric, or prompts reruns the gold set and diffs it. A swing over 10 points needs a written reason.

---

## 12. Content ethics for seed reports

Publish named scores only for our own repositories, volunteers, or maintainers who said yes. Everything else is anonymised or aggregate.

Framing: “Here is what a handoff would hit,” never “this developer is careless.” Every public report links the removal path.

---

## 13. Gates and kill criteria

### Gate A — before any V1 work

Post findings from 5–10 seed repositories on X and LinkedIn.

**Pass:** at least 5 strangers ask to run it on their own repository.

The threshold is provisional. Change it before posting, never after.

### Gate B — V1 complete

- Gold-set targets met.
- 5 external users ran it on their own repositories.
- At least 3 said it would have helped.

### Gate C — go/no-go

- 10+ seed reports live.
- Landing page and documentation live.
- Scan error rate under 3%.
- Cost per scan inside the cap.
- Kill switch and spend cap tested.
- Terms, privacy policy, and removal path live.
- CLI published.

### Kill or narrow

If Gate A fails, do not build V1. Either narrow to the skill-only `OPERATE.md` generator or drop the project.

### Launch success is audience-driven

Aim to have roughly 300 people ready to show up on day one. Rank is an outcome, not a goal.

Track:

- Scans run.
- Reports shared.
- Badges installed.
- Waitlist emails.
- Repository stars.
- Feedback score.

---

## 14. Roadmap and launch timeline

Solo founder plus Claude Code. Estimates, not promises.

### Days 1–7

- MVP: engine, CLI, minimal web.
- Seed reports.
- Post findings.

Gate A at day 7–10.

### Days 8–21

- V1: hardening, eval, share pages, skill, MCP, landing page, documentation.

### Pre-launch

- **T-30 days:** start posting findings publicly and keep going weekly.
- **T-21:** landing page and waitlist live.
- **T-14:** seed gallery done.
- **T-7:** assets final, outreach sent.
- **T-3:** full dry run.
- **T-1:** schedule the post.

### Launch day (pick Tuesday–Thursday)

- Post at the start of the Product Hunt day.
- First comment up immediately.
- Reply to every comment fast.
- X thread and LinkedIn at the same time.
- Work the DM list.
- Do not ask for upvotes or run vote rings. Invite people to try it and give feedback.
- Verify Product Hunt's current rules, field limits, and daily reset time before the day.

### Post-launch

- **T+1:** thank-you post with real numbers.
- **T+7:** retrospective; feed feedback into V2 order.

---

## 15. Risks

1. **Feature, not product.** Speed, cross-agent neutrality, and benchmark data are the defense. Gate A is the test.
2. **Hallucination destroys trust.** Citation validator, deterministic score, and “unknown” is allowed.
3. **Launch-day cost blowup.** Cache, caps, kill switch, and test before launch.
4. **Hostile repositories and injection.** Static-only analysis, no tools, fixtures, dedicated security pass.
5. **Backlash for shaming.** Section 12.
6. **Score looks arbitrary.** Public rubric, calibration, version stamp.
7. **Solo capacity and scope creep.** PARK list, scope guard in every prompt, one launch at a time.
8. **No audience.** Pre-launch posting starts at T-30.
9. **Legal.** Analysing public code is routine, but publishing scores about named repositories needs consent. Keep retention minimal. Not legal advice; get it checked if this becomes a company.

---

## 16. Open decisions

- **Name and domain.** Unverified.
- **Open-source the engine and CLI?** Recommendation: yes. It earns trust and distribution; hosted reports, private repositories, and teams are the paid layer.
- **Pricing.** Undecided. Launch free with daily limits and a waitlist; set prices from waitlist behaviour.
- **Languages beyond JavaScript/TypeScript and Python.** Decide from what the seed repositories actually are.
- **LLM provider.** Anthropic for hosted; bring-your-own-key for the CLI.
