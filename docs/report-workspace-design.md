# Report Workspace — Visual and Interaction Spec

Version 0.1, 20 Nov 2026. Source: four reference screenshots supplied by Roshan (dark report window, four views). This document is the design spec for `apps/web/app/r/[slug]`; `docs/PDR.md` remains authoritative for product rules.

## Scope

The reference shows the **report workspace**: a dark, rounded panel floating over a dusk-road photograph, with a left section navigator, a content column, and a floating bottom toolbar. It does not describe the landing page (which is a separate repo) or the docs/legal pages.

## Layout

- Full-bleed `dusk-road.webp` background behind a centred panel, `max-width: 1536px`, margin ~24px, radius ~14px.
- Panel header (~64px): brand mark, repository label in mono, a lavender badge, score aligned right in mono (`64/100` in the reference).
- Body: left nav ~280px with a right divider; content column centred, `max-width: 768px`, generous vertical padding.
- Four nav entries, in order: **Verdict** (gauge icon), **Risk map** (map icon), **OPERATE.md** (file icon), **Author questions** (question icon).
- Bottom-centred pill toolbar repeats the four icons; the active entry is highlighted with a lavender fill.
- Active left-nav entry is lavender text; inactive entries are muted grey.

## Colour and type (approximated from screenshots; verify against a render)

| Role | Value |
| --- | --- |
| Panel surface | near-black charcoal, ~`oklch(0.19 0.012 265)` |
| Panel border | subtle white ~10% |
| Primary text | near-white |
| Secondary text | mid grey ~`oklch(0.70 0.01 265)` |
| Accent / active | lavender-indigo ~`oklch(0.62 0.16 275)` |
| Success | green ~`oklch(0.72 0.17 150)` |
| Warning | amber ~`oklch(0.82 0.15 85)` |
| Danger | red ~`oklch(0.62 0.21 25)` |
| Citation chip | darker inset grey, mono, ~11px |

Type: Instrument Sans for headings/body; JetBrains Mono for repository label, score, citation chips and numbers. Eyebrow labels are uppercase, ~11px, wide tracking, muted.

## View contents

1. **Verdict** — eyebrow `OPERABILITY VERDICT`, heading from the score band (PDR §7), one-sentence explanation, large `NN / 100` figure, then up to five findings with severity badges and `file:line` citation chips.
2. **Risk map** — eyebrow `RISK MAP`, heading "Where a handoff breaks first", explanation, then one bar per `report.dimensions` entry. Bar uses accent when score ≥ 50, warning below 50. Each bar exposes an `aria-label` with the value and finding count.
3. **OPERATE.md** — eyebrow `OPERATE.md`, heading "Operating <repository label>", explanation, then sections parsed from the engine's `## ` headings with numbered steps and citation chips where the text contains them.
4. **Author questions** — eyebrow `AUTHOR QUESTIONS`, heading "Only the original author can answer", explanation, then one card per question with its evidence chip.

## Interaction / user flow

1. `/scan` submits → report page opens on **Verdict**.
2. Left nav or bottom toolbar selects a view; selection is carried in `?view=verdict|risks|operate|questions` so it is linkable and testable without client state.
3. Header, left nav and toolbar persist across all four views.
4. Downloads, "scan another", documentation and the feedback widget stay available below the window.
5. All controls are keyboard operable; the current view is exposed with `aria-current="page"` on nav links and `aria-pressed` on toolbar links.

## Data truth rules

- The reference's `acme/payments-api`, "Example report" badge and `64/100` are **prototype content**. A real report must show its own score, its own label (use the report slug when no repository URL is stored), and a truthful badge. Never fabricate a repository name, score, verdict, citation or question.
- The reference's dimension names (Setup, Configuration, …) are prototype labels. Real reports use the PDR's seven dimensions from `report.dimensions`.
- No claim without evidence: render a citation chip only when the finding/question supplies evidence. Missing content uses the engine's `UNKNOWN` text, not invented copy.
- Score and verdict are displayed, never recomputed in the UI.
- Report routes keep `export const metadata = { robots: { index: false, follow: false } }`.

## Non-goals

- No new landing page, no marketing sections, no chart library, no animation beyond CSS transitions.
- No change to engine scoring, rubric, or the `OPERATE.md` generator.
