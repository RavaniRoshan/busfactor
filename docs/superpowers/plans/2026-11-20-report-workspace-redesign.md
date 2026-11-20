# Report Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/r/[slug]` report page into the dark four-view report workspace shown in the reference screenshots, using MIT-licensed Space UI primitives for the interactive shell and keeping all real report data and product rules intact.

**Architecture:** The report page becomes a thin server component that reads the stored report and a `?view=` parameter, then renders a single `ReportWindow` shell. The shell uses Space UI `Card`/`Tabs`/`Toolbar`/`Badge` primitives for the panel, view navigation and status badges; four pure view components render Verdict, Risk map, OPERATE.md and Author questions. View selection is a link backed by `?view=`, so it is keyboard accessible, shareable, and testable without client state.

**Tech Stack:** Next.js 16.4.6 App Router, React 19, Tailwind CSS v4, TypeScript strict, Vitest, Space UI community primitives (MIT) installed via the shadcn CLI into `components/ui/`, Base UI, lucide-react.

**Spec:** `docs/report-workspace-design.md` (visual spec from the four reference screenshots) and `docs/PDR.md` (sections 5, 7, 10, E4).

## Global Constraints

- TypeScript strict mode; `pnpm gate` = typecheck + lint + test and must pass on every commit.
- **Space UI licence boundary:** install only MIT community primitives. Do not run `shadcn init https://www.spaceui.one/r/lib-style.json` — that preset rewrites `globals.css` theme variables; the app's existing tokens stay. No Pro components, blocks, templates or shaders (source: https://www.spaceui.one/license).
- Installed component files are copied into `apps/web/components/ui/` and become ours to edit; track them in git and commit them.
- Verdict bands are exactly: `85–100: Handoff-ready`, `70–84: Operable with a briefing`, `50–69: Risky`, `below 50: Only the author can run this` (PDR §7).
- Seven scoring dimensions come from `report.dimensions`; never replace them with the prototype's Setup/Configuration labels (PDR §7, design spec §Data truth rules).
- "Every claim cites file:line or it gets dropped" (PDR §5). Render a citation chip only when evidence exists.
- "Unknown beats a guess" (PDR §5). Emit the engine's `UNKNOWN` text; never invent commands, questions or scores.
- Code computes the score; the UI displays `report.score` and never recomputes it (PDR §5).
- Static `export const metadata = { robots: { index: false, follow: false } }` stays on the report route (PDR G1).
- No fabricated repository name, score, verdict, badge text or citation. `acme/payments-api`, `Example report` and `64/100` are prototype-only content.
- Report routes must remain keyboard navigable and meet Lighthouse accessibility/performance 90+ on mobile (PDR §10).
- Backdrop must be same-origin (`img-src 'self'` in the existing CSP). `BusFactor Landing Page/` and any landing-page code stay out of this repo.

## Review Focus

- **Empty findings / dimensions / questions / OPERATE.md:** a freshly scanned repo can return empty arrays; each view must show explicit empty copy instead of blank panels — pinned by the empty-state tests in Task 3.
- **Score band boundaries (85 / 70 / 50 / 49):** an off-by-one changes the user's verdict while the score stays the same — pinned by `bandForScore` boundary tests in Task 2.
- **Hostile repository text in findings, questions and OPERATE.md:** scanned repos are untrusted input; React must escape it, never inject markup — pinned by the `<script>` escape test in Task 3.
- **Unknown `?view=` value:** a stale or hand-edited URL must fall back to Verdict, not crash the report — pinned by `parseReportView` tests in Task 2 and the page wiring assertion in Task 5.
- **Unstructured or missing OPERATE.md:** the engine may produce no `##` headings; the parser must return one section without throwing — pinned by the parser fallback test in Task 2.

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/public/dusk-road.webp` | Restored same-origin backdrop for the report workspace. |
| `apps/web/components/ui/{badge,card,tabs,toolbar}.tsx` | MIT Space UI primitives copied in by the shadcn CLI (Task 1); edited locally for the dark surface. |
| `apps/web/app/globals.css` | Scoped `.report-window` / `.rw-*` dark-surface classes; no change to existing theme tokens. |
| `apps/web/lib/report-view.ts` | `Report` type, view id type, score-band/tone/parser/param helpers. Pure, no React. |
| `apps/web/components/report/cite-chip.tsx` | One `file:line` chip component shared by all views. |
| `apps/web/components/report/verdict-view.tsx` | Verdict view. |
| `apps/web/components/report/risk-map-view.tsx` | Risk map view. |
| `apps/web/components/report/operate-view.tsx` | OPERATE.md view. |
| `apps/web/components/report/questions-view.tsx` | Author questions view. |
| `apps/web/components/report-window.tsx` | Persistent header, left nav, content slot and bottom toolbar built from Space UI primitives. |
| `apps/web/app/r/[slug]/page.tsx` | Reads store + `searchParams`, renders `ReportWindow`, keeps noindex and secondary actions. |
| Tests: `report-design.test.ts`, `report-view.test.ts`, `components/report/views.test.tsx`, `components/report-window.test.tsx`, `app-shell.test.ts` | One test file per deliverable. |

---

### Task 1: Install Space UI primitives, add scoped dark surface and backdrop

**Files:**
- Restore: `apps/web/public/dusk-road.webp`
- Create (via CLI, then commit): `apps/web/components/ui/badge.tsx`, `card.tsx`, `tabs.tsx`, `toolbar.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `apps/web/report-design.test.ts` (create)

**Interfaces:**
- Consumes: none.
- Produces (exact exported APIs from Space UI community primitives, verified at https://www.spaceui.one/llms.mdx/primitives/{badge,card,tabs,toolbar}):
  - `@/components/ui/badge` → `Badge`, props `variant: "default" | "destructive" | "error" | "info" | "outline" | "secondary" | "success" | "warning"`, `size: "sm" | "default" | "lg"`, `square?: boolean`, `render?`
  - `@/components/ui/card` → `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardPanel` (also `CardContent`), `CardFooter`
  - `@/components/ui/tabs` → `Tabs`, `TabsList`, `TabsTab` (also `TabsTrigger`), `TabsPanel` (also `TabsContent`), `TabsIndicator`
  - `@/components/ui/toolbar` → `Toolbar`, `ToolbarGroup`, `ToolbarButton`, `ToolbarSeparator`, `ToolbarLink`, `ToolbarInput`
  - CSS classes `.report-window`, `.rw-header`, `.rw-nav`, `.rw-nav-active`, `.rw-content`, `.rw-toolbar`, `.rw-toolbar-active`, `.rw-cite`, and `--rw-surface`, `--rw-accent`, `--rw-text`, `--rw-muted`, `--rw-success`, `--rw-warning`, `--rw-danger`.

- [ ] **Step 1: Install the four MIT primitives**

Run from `apps/web`:

```bash
pnpm dlx shadcn@latest add @spaceui/primitives-badge @spaceui/primitives-card @spaceui/primitives-tabs @spaceui/primitives-toolbar --yes
```

Do not run the Space UI preset/init command; it overwrites the existing theme. If the CLI asks about overwriting `components/ui/badge.tsx` (our local badge exists), choose skip and merge the Space UI variants into the existing file manually so `variant="success|warning|danger|secondary"` from current callers keeps working. Confirm the four files exist under `apps/web/components/ui/`.

- [ ] **Step 2: Write the failing test**

```ts
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("report workspace surface", () => {
  it("ships the same-origin backdrop", () => {
    expect(existsSync(path.join(root, "public/dusk-road.webp"))).toBe(true);
  });

  it("ships the Space UI primitive files", () => {
    for (const file of ["badge.tsx", "card.tsx", "tabs.tsx", "toolbar.tsx"]) {
      expect(existsSync(path.join(root, `components/ui/${file}`))).toBe(true);
    }
  });

  it("defines scoped dark-surface classes without rewriting the theme", () => {
    const css = readFileSync(path.join(root, "app/globals.css"), "utf8");
    for (const token of ["--rw-surface", "--rw-accent", "--rw-success", "--rw-warning", "--rw-danger"]) {
      expect(css).toContain(token);
    }
    for (const cls of [".report-window", ".rw-header", ".rw-nav-active", ".rw-content", ".rw-toolbar-active", ".rw-cite"]) {
      expect(css).toContain(cls);
    }
    expect(css).toContain("--color-brand-primary");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @busfactor/web exec vitest run report-design.test.ts`
Expected: FAIL — backdrop and classes absent (primitives may already exist from Step 1).

- [ ] **Step 4: Restore the backdrop and add scoped CSS**

Run: `mkdir -p apps/web/public && git show 395c017:apps/web/public/dusk-road.webp > apps/web/public/dusk-road.webp`

In `apps/web/app/globals.css`, add an `@layer components` block with `.report-window` declaring the `--rw-*` variables from `docs/report-workspace-design.md` §Colour and type, a charcoal surface, subtle border and `border-radius: 0.875rem`; add the `.rw-*` classes for header, navigator, active states, content column, citation chips, toolbar and risk bars. Use plain CSS scoped under `.report-window`, not Tailwind utilities, so the dark panel is independent of the app's light/dark theme toggle. Do not change existing `:root`, `.dark` or `@theme` tokens.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @busfactor/web exec vitest run report-design.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/public/dusk-road.webp apps/web/app/globals.css apps/web/components/ui apps/web/report-design.test.ts
git commit -m "feat(web): add Space UI primitives and report workspace surface"
```

---

### Task 2: Pure report view helpers

**Files:**
- Create: `apps/web/lib/report-view.ts`
- Test: `apps/web/report-view.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces (later tasks import these exact names):
  - `export type Report` — `{ score: number; verdict: string; dimensions: Array<{ label: string; score: number; findingCount: number }>; findings: Array<{ severity: string; message: string; evidence?: Array<{ file: string; lineStart: number }> }>; authorQuestions: Array<{ question: string; evidence: Array<{ file: string; lineStart: number }> }>; operateMd: string; meta: { sha: string; engineVersion: string; rubricVersion: string } }`
  - `export type ReportViewId = "verdict" | "risks" | "operate" | "questions"`
  - `export type OperateSection = { heading: string; lines: string[] }`
  - `export function bandForScore(score: number): string`
  - `export function severityTone(severity: string): "error" | "warning" | "success" | "info"` — matches Space UI `Badge` variant names.
  - `export function parseOperateMd(markdown: string): OperateSection[]`
  - `export function parseReportView(value: unknown): ReportViewId`

- [ ] **Step 1: Write the failing tests**

```ts
describe("bandForScore", () => {
  it("maps the PDR band boundaries exactly", () => {
    expect(bandForScore(100)).toBe("Handoff-ready");
    expect(bandForScore(85)).toBe("Handoff-ready");
    expect(bandForScore(84)).toBe("Operable with a briefing");
    expect(bandForScore(70)).toBe("Operable with a briefing");
    expect(bandForScore(69)).toBe("Risky");
    expect(bandForScore(50)).toBe("Risky");
    expect(bandForScore(49)).toBe("Only the author can run this");
    expect(bandForScore(0)).toBe("Only the author can run this");
  });
});

describe("severityTone", () => {
  it("maps severities to Space UI badge variants", () => {
    expect(severityTone("critical")).toBe("error");
    expect(severityTone("high")).toBe("error");
    expect(severityTone("medium")).toBe("warning");
    expect(severityTone("low")).toBe("success");
    expect(severityTone("info")).toBe("info");
  });
});

describe("parseOperateMd", () => {
  it("splits engine headings into sections", () => {
    const md = ["# OPERATE.md", "", "## What it is", "A service.", "", "## Run locally", "- `npm install`", "", "## Rollback", "UNKNOWN: ask the author", ""].join("\n");
    expect(parseOperateMd(md)).toEqual([
      { heading: "What it is", lines: ["A service."] },
      { heading: "Run locally", lines: ["- `npm install`"] },
      { heading: "Rollback", lines: ["UNKNOWN: ask the author"] },
    ]);
  });

  it("keeps unstructured markdown in one section", () => {
    expect(parseOperateMd("plain text")).toEqual([{ heading: "OPERATE.md", lines: ["plain text"] }]);
  });
});

describe("parseReportView", () => {
  it("accepts known views and defaults everything else to verdict", () => {
    expect(parseReportView("risks")).toBe("risks");
    expect(parseReportView("operate")).toBe("operate");
    expect(parseReportView("questions")).toBe("questions");
    expect(parseReportView("nonsense")).toBe("verdict");
    expect(parseReportView(undefined)).toBe("verdict");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @busfactor/web exec vitest run report-view.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `apps/web/lib/report-view.ts`**

Implement the four exported functions with the exact signatures above. `bandForScore` uses the PDR boundaries; `severityTone` returns Space UI `Badge` variant strings; `parseOperateMd` splits on lines beginning with `## `, ignores the leading `# OPERATE.md`, drops blank lines, and falls back to heading `OPERATE.md`; `parseReportView` returns only the four allowed ids. No DOM or React imports.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @busfactor/web exec vitest run report-view.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/report-view.ts apps/web/report-view.test.ts
git commit -m "feat(web): add pure report view helpers"
```

---

### Task 3: Four report view components

**Files:**
- Create: `apps/web/components/report/cite-chip.tsx`
- Create: `apps/web/components/report/verdict-view.tsx`
- Create: `apps/web/components/report/risk-map-view.tsx`
- Create: `apps/web/components/report/operate-view.tsx`
- Create: `apps/web/components/report/questions-view.tsx`
- Test: `apps/web/components/report/views.test.tsx` (create)

**Interfaces:**
- Consumes: `Report`, `OperateSection`, `bandForScore`, `severityTone`, `parseOperateMd` from Task 2; `Badge` from `@/components/ui/badge`, `Card*` from `@/components/ui/card`, `Empty*` from `@/components/ui/empty` if installed (otherwise keep `.rw-*` empty states); CSS classes from Task 1.
- Produces:
  - `CiteChip({ file, line }: { file: string; line: number })`
  - `VerdictView({ report }: { report: Report })`
  - `RiskMapView({ report }: { report: Report })`
  - `OperateView({ report }: { report: Report })`
  - `QuestionsView({ report }: { report: Report })`
  - Exact empty-state copy: `"No findings were recorded."`, `"No dimensions were scored."`, `"No author questions were recorded."`.

- [ ] **Step 1: Write the failing tests**

Use `renderToStaticMarkup` from `react-dom/server`; build a `Report` fixture inline with `score: 64`, one finding, one dimension, one question and a short `operateMd`. Assert:

```tsx
it("renders the score band, severity and citation", () => {
  const html = renderToStaticMarkup(<VerdictView report={fixture} />);
  expect(html).toContain("Risky");
  expect(html).toContain("config/secrets.ts:18");
});

it("escapes hostile repository text", () => {
  const html = renderToStaticMarkup(<VerdictView report={{ ...fixture, findings: [{ severity: "high", message: "<script>alert(1)</script>", evidence: [{ file: "a.ts", lineStart: 3 }] }] }} />);
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>alert(1)</script>");
});

it("shows empty states", () => {
  const empty = { ...fixture, findings: [], dimensions: [], authorQuestions: [], operateMd: "" };
  expect(renderToStaticMarkup(<VerdictView report={empty} />)).toContain("No findings were recorded.");
  expect(renderToStaticMarkup(<RiskMapView report={empty} />)).toContain("No dimensions were scored.");
  expect(renderToStaticMarkup(<QuestionsView report={empty} />)).toContain("No author questions were recorded.");
});

it("marks low risk-map bars with warning tone and an accessible label", () => {
  const html = renderToStaticMarkup(<RiskMapView report={{ ...fixture, dimensions: [{ label: "Secrets", score: 25, findingCount: 2 }] }} />);
  expect(html).toContain("Secrets: 25 out of 100, 2 findings");
  expect(html).toContain("rw-bar-warning");
});

it("renders parsed OPERATE.md sections and unknown text", () => {
  const html = renderToStaticMarkup(<OperateView report={{ ...fixture, operateMd: "## Rollback\nUNKNOWN: ask the author" }} />);
  expect(html).toContain("Rollback");
  expect(html).toContain("UNKNOWN: ask the author");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @busfactor/web exec vitest run components/report/views.test.tsx`
Expected: FAIL — components do not exist.

- [ ] **Step 3: Implement the view components**

Each is a pure server component (no `"use client"`). Use `CiteChip` for every `file:line`; render nothing when evidence is absent. `VerdictView` shows `bandForScore(report.score)` and up to five findings with `Badge variant={severityTone(finding.severity)}`. `RiskMapView` maps `report.dimensions` to bars with `role="img"` and the exact `aria-label` shown in the test. `OperateView` uses `parseOperateMd` and numbers lines via Space UI `Card`/`CardPanel`. `QuestionsView` maps `report.authorQuestions` to Space UI `Card` elements. Use only `.rw-*` classes from Task 1 plus Space UI primitives; lucide-react for icons.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @busfactor/web exec vitest run components/report/views.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/report
git commit -m "feat(web): add report view components with Space UI primitives"
```

---

### Task 4: ReportWindow shell with Space UI Tabs and Toolbar

**Files:**
- Create: `apps/web/components/report-window.tsx`
- Test: `apps/web/components/report-window.test.tsx` (create)

**Interfaces:**
- Consumes: `Report`, `ReportViewId` from Task 2; the four views from Task 3; `Card` from `@/components/ui/card`, `Tabs*`/`Toolbar*` from Task 1.
- Produces: `ReportWindow({ report, slug, view }: { report: Report; slug: string; view: ReportViewId })`, with links of the exact form `/r/${slug}?view=${id}`.

- [ ] **Step 1: Write the failing test**

```tsx
it("renders the persistent shell and links every view", () => {
  const html = renderToStaticMarkup(<ReportWindow report={fixture} slug="abc123" view="verdict" />);
  expect(html).toContain("report-window");
  expect(html).toContain("abc123");
  expect(html).toContain("64/100");
  for (const view of ["verdict", "risks", "operate", "questions"]) {
    expect(html).toContain(`/r/abc123?view=${view}`);
  }
  expect(html).toContain('aria-current="page"');
  expect(html).toContain('aria-pressed="true"');
});

it("switches content by view prop", () => {
  const html = renderToStaticMarkup(<ReportWindow report={fixture} slug="abc123" view="risks" />);
  expect(html).toContain("Where a handoff breaks first");
  expect(html).not.toContain("OPERABILITY VERDICT");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @busfactor/web exec vitest run components/report-window.test.tsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `ReportWindow`**

Render a `.report-window` `Card` with: header (brand mark, `slug` in mono, truthful `Report` badge, score right), a vertical `TabsList` for left navigation, `.rw-content` holding the selected view, and a `Toolbar` for the bottom pill. Space UI `Tabs`/`Toolbar` primitives are used for structure; because view state lives in `?view=`, render each tab and toolbar item as an anchored link (`TabsTab render={<a href=.../>}`, `ToolbarLink href=...`) with the exact hrefs from the test. Active nav gets `aria-current="page"`; active toolbar link gets `aria-pressed="true"`. Import the four views from Task 3 and select with a plain map keyed by `ReportViewId`. No client state.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @busfactor/web exec vitest run components/report-window.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/report-window.tsx apps/web/components/report-window.test.tsx
git commit -m "feat(web): add report workspace shell with Space UI"
```

---

### Task 5: Wire the report route and verify the flow

**Files:**
- Modify: `apps/web/app/r/[slug]/page.tsx`
- Modify: `apps/web/app-shell.test.ts`

**Interfaces:**
- Consumes: `store.reports.get(slug)` from `apps/web/lib/store.ts`, `parseReportView` from Task 2, `ReportWindow` from Task 4, `Report` type from Task 2.
- Produces: report route that renders the workspace and keeps the existing download/fix-list/badge, scan-again, docs and feedback actions below it.

- [ ] **Step 1: Write the failing assertions**

Add to `apps/web/app-shell.test.ts`:

```ts
it("renders the report workspace without losing noindex", () => {
  const page = readFileSync(path.join(root, "app/r/[slug]/page.tsx"), "utf8");
  expect(page).toContain("ReportWindow");
  expect(page).toContain("parseReportView");
  expect(page).toContain("robots: { index: false, follow: false }");
  expect(page).toContain("searchParams");
  expect(page).not.toContain("Example report");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @busfactor/web exec vitest run app-shell.test.ts`
Expected: FAIL — page still renders the old inline sections.

- [ ] **Step 3: Rewrite `apps/web/app/r/[slug]/page.tsx`**

Keep `notFound()` on missing report, the static `metadata` export, and `await store.reports.get(slug)`. Add `searchParams: Promise<{ view?: string }>`; compute `const view = parseReportView((await searchParams).view)`. Cast the stored report to the Task 2 `Report` type and render `<ReportWindow report={report} slug={slug} view={view} />` inside `PageFrame`. Keep the existing download/fix/badge links, "Scan another repository"/"Documentation"/"Back to home" links and `<FeedbackWidget slug={slug} />` below the window. Do not add a repository name, score or badge text that is not in the stored report.

- [ ] **Step 4: Run the full gate and build**

Run: `pnpm gate && pnpm --filter @busfactor/web build`
Expected: PASS — typecheck, lint, all tests (including the new ones), and a successful Next.js build.

- [ ] **Step 5: Verify the live flow locally**

Run a real scan against the dev server at `http://localhost:3000`, capture `slug` from the JSON, then check:

```bash
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3000/r/$slug"
curl -s "http://localhost:3000/r/$slug?view=risks" | grep -c "Where a handoff breaks first"
curl -s "http://localhost:3000/r/$slug?view=operate" | grep -c "OPERATE.md"
```

Expected: `200`, and counts `>= 1` for both greps.

- [ ] **Step 6: Commit, push and deploy**

```bash
git add apps/web docs/report-workspace-design.md docs/superpowers/plans/2026-11-20-report-workspace-redesign.md
git commit -m "feat(web): redesign report page as four-view workspace"
git push origin main
vercel --prod --yes
```

Then repeat the three curl checks against `https://heir-weld.vercel.app/` and confirm `GET /` still returns `307` to `/scan`. Push before deploying so a git-triggered deploy cannot promote stale code.

---

## Self-review

- Spec coverage: global constraints come from PDR §5/§7/§10/G1, the design spec, and the Space UI licence page; visual layout, four views, user flow, Space UI primitive usage and data truth rules each have an owning task.
- Step scan: each step is one test, one command, one implementation, one verification, or one commit; no "handle edge cases" lines.
- Type consistency: `Report`, `ReportViewId`, `OperateSection` and the four helper signatures are defined once in Task 2 and reused verbatim in Tasks 3–5; Space UI `Badge` variants match `severityTone` exactly.
- Review Focus: all five failure modes are pinned by named tests in Tasks 2–3; noindex is additionally asserted in Task 5.
- Proportion: the plan pins names, exact values, verified component APIs and test assertions, and leaves component bodies to the implementer.
