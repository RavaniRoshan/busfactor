# BusFactor Web — Design System

Canonical design contract for `apps/web`. Generated from the read-only Figma reference at `BusFactor Landing Page/` and the component-library research in `research/ui-component-libraries.md`. If code and this file disagree, this file wins unless a later decision is recorded in `DECISIONS.md`.

Status: **v0.1 — adopted for the web rebuild, 20 Nov 2026.**

---

## 1. Source, fidelity, and limits

Extracted from the reference (do not edit that directory):

- `BusFactor Landing Page/src/index.css` — token mapping, type scale, spacing formula, container widths, radii, base layer.
- `BusFactor Landing Page/src/App.tsx` — page anatomy, component inventory, content and interaction patterns.
- `BusFactor Landing Page/package.json` — font source and dependency set.

**Fidelity note:** the Figma kit `@figma/astraui` is *not installed locally*, so its raw CSS variable values (`--brand-primary`, `--space-2xl`, `--font-display`, etc.) could not be recovered. Token **names, relationships and scale formulas are extracted; concrete colour values in §3 are project decisions that replace the unavailable kit values.** They are recorded here so they are reviewable, not guessed silently.

Design language in one line: **editorial, quiet, evidence-first** — generous whitespace, centred copy, one monospaced citation chip per claim, and a large framed "report window" as the hero's proof.

---

## 2. Typography

| Role | Family | Source |
| --- | --- | --- |
| Display + body | **Instrument Sans** (variable 400–600) | Figma `index.css` line 1 imports it from Google Fonts as the design-system face |
| Code / citations / numbers | **JetBrains Mono** | Established in `apps/web/app/globals.css`; used for commands, `file:line` chips, scores |

Load both with `next/font/google` in `app/layout.tsx` (self-hosted at build time, `display: swap`, `adjustFontFallback` default). Expose as CSS variables `--font-sans` and `--font-mono`. Never use bare CSS `@import` for these fonts — it costs an extra request and defeats CLS protection.

Scale (from `index.css` §type helpers; `--font-size` is the DS base, set to 1rem here):

| Token | Size | Weight | Other |
| --- | --- | --- | --- |
| `type-hero` | 2.25rem → **3.25rem at md** | 500 | `line-height: tight`, `letter-spacing: tight`, `text-wrap: balance` |
| `type-display` | 1.75rem → **2.25rem at md** | 500 | same |
| body / `text-label` | 1rem | 400 | `line-height: normal` |
| small / `text-label-sm` | 0.875rem | 400 | secondary text |
| eyebrow | 0.75rem | 500 | uppercase, wide tracking |

Rules:

- Headings use `role="heading" aria-level={1|2|3}` only where semantic `<h1>/<h2>/<h3>` is impossible; prefer real heading elements. Never skip a level.
- All code, commands, scores and `file:line` citations use the mono face.
- Tabular numbers use `font-variant-numeric: tabular-nums` (scores, percentages).

---

## 3. Colour

Semantic names come from the reference. Concrete OKLCH values below are the adopted replacements (light theme). Keep the **semantic names** in components; never write raw colour literals in JSX.

| Token | Value (light) | Use |
| --- | --- | --- |
| `--brand-primary` | `oklch(0.55 0.19 259)` | Primary actions, focus, score bars |
| `--brand-hover` | `oklch(0.49 0.20 259)` | Hover state |
| `--brand-dark` | `oklch(0.36 0.15 259)` | Pressed / dark accents |
| `--brand-secondary` | `oklch(0.93 0.035 259)` | Selection, soft emphasis |
| `--brand-tertiary` | `oklch(0.985 0.005 259)` | Page background |
| `--text-primary` | `oklch(0.21 0.02 259)` | Headings, body |
| `--text-secondary` | `oklch(0.45 0.015 259)` | Supporting copy |
| `--text-tertiary` | `oklch(0.60 0.012 259)` | Meta, numbering |
| `--border-primary` | `oklch(0.86 0.01 259)` | Frames |
| `--border-secondary` | `oklch(0.92 0.006 259)` | Dividers |
| `--bg-faint` | `oklch(0.965 0.005 259)` | Code blocks, inset panels |
| `--bg-subtle` | `oklch(0.94 0.008 259)` | Bars, chips |
| `--surface-bg` | `oklch(1 0 0)` | Report window |
| `--surface-secondary-bg` | `oklch(0.985 0.004 259)` | Cards |
| `--on-brand` | `oklch(0.99 0 0)` | Text on primary / photo |
| `--success` | `oklch(0.68 0.15 150)` | "Yes" badges |
| `--warning` | `oklch(0.75 0.14 75)` | "Partly" badges, low bars |
| `--danger` | `oklch(0.62 0.20 25)` | "No" badges |

Dark theme: override the same semantic names under `.dark` (invert backgrounds to `oklch(0.18 0.02 259)` family, foregrounds to near-white, borders to `oklch(1 0 0 / 12%)`, primary lifted to `oklch(0.72 0.15 259)`). Contrast of body text on backgrounds must be ≥ 4.5:1; focus rings and UI boundaries ≥ 3:1. **Never rely on the default ring alone — verify focus visibility with an axe/Lighthouse run.**

Mapping into shadcn tokens (in `globals.css`): `--background` ← brand-tertiary, `--foreground` ← text-primary, `--primary` ← brand-primary, `--primary-foreground` ← on-brand, `--muted`/`--muted-foreground` ← bg-subtle/text-secondary, `--border` ← border-secondary, `--secondary` ← brand-secondary, `--card`/`--popover` ← surface-bg, `--success`/`--warning`/`--danger` kept as named extras and mapped with `@theme inline`.

---

## 4. Space, radius, containers

Base unit 0.25rem. Named steps from the reference (`index.css` lines 44–66):

```
xs 4px   sm 8px   md 12px   lg 16px   xl 24px   2xl 32px
3xl  = 2×2xl = 64px
4xl  = 3×2xl = 96px
section = 5×2xl = 160px
visual  = 7×2xl = 224px
footer  = 14×2xl = 448px   (min-height only)
report  = 22×2xl = 704px   (min-height only)
```

Define all of these as `--spacing-*` in `@theme` so utilities such as `px-xl`, `py-4xl`, `gap-2xl`, `mt-3xl`, `min-h-report` resolve. Section rhythm: `mx-auto w-full max-w-page px-xl py-4xl md:px-2xl md:py-section`.

Containers: `--container-copy: 768px`, `--container-article: 896px`, `--container-page: 1472px`, `--container-window: 1536px` (derived as 24/28/46/48 × 32px in the reference). Use `max-w-copy` for text blocks, `max-w-article` for hero/CLI, `max-w-page` for sections, `max-w-window` for the report showcase.

Radii: `corner-sm` small chips, `corner-md` inset panels, `corner-lg` cards and report window, `corner-full` bars/pills. Define as `--radius-corner-*` so `rounded-corner-lg` works.

Motion: `scroll-behavior: smooth` on `html`, disabled under `prefers-reduced-motion`; smooth scrolling via `scrollIntoView({ behavior: reduce ? "auto" : "smooth" })`. No entrance animations.

---

## 5. Component mapping (Figma → adopted stack)

Adopt **shadcn/ui copy-in components on Base UI primitives** (MIT; already initialised as `base-nova`). Behavioural deps stay npm-installed; component source is owned in `components/ui/`. Do not add a runtime wrapper library.

| Reference (`@figma/astraui`) | Adopted implementation |
| --- | --- |
| `Button` (primary/neutral/subtle, medium/small) | `components/ui/button.tsx` (Base UI) with variants `default` / `outline` / `ghost` and sizes `default` / `sm` / `icon` |
| `IconButton` | `Button size="icon"` with required `aria-label` |
| `Badge` (success/warning/danger/secondary) | Local `Badge` using CVA + the three status tokens |
| `Tabs` | Radix Tabs (`@radix-ui/react-tabs`) styled with existing tokens |
| `Tooltip` | Radix Tooltip (`@radix-ui/react-tooltip`); tooltip text is never the only label — controls keep `aria-label` |
| `SecondaryNavItem` | `Button variant="ghost"` + `aria-pressed` for report-section nav |
| `Toolbar` / `ToolbarItem` | `<div role="toolbar" aria-label>` of icon buttons with `aria-pressed` |
| `useTheme` / `ThemeToggle` | `next-themes` + `components/theme-provider.tsx`; toggle guarded by a `mounted` flag |
| Cite chip | `<code>` with `font-mono`, `bg-bg-faint`, `rounded-corner-sm` |

Accessibility requirements are part of the definition of done, not polish: every control has an accessible name; visible focus ≥ 3:1; one `<main>`; one `<h1>`; skip link to `#main`; no positive `tabindex`; charts/bars expose `role="img"` with an `aria-label` carrying the value. Target Lighthouse performance **and** accessibility ≥ 90 on mobile.

Third-party library decisions (from `research/ui-component-libraries.md`):

- **Use:** shadcn/ui + Base UI. Free/MIT Space UI primitives are permitted *only* after per-component licence verification; no Pro components.
- **Do not use:** Open Shadcn Blocks (no licence grant, no source repo, competitor CDN assets), AI SDK Agents (paid AI-pattern catalogue, irrelevant to this page).

---

## 6. Page anatomy (the contract for `app/page.tsx`)

Order is fixed; each section is a real landmark with `aria-labelledby`.

1. **SiteHeader** — mark + wordmark; nav: Quickstart, CLI, Limits; theme toggle.
2. **Hero** — eyebrow "CLI · MCP server · Claude Code skill"; `type-hero` promise from PDR §1; one-paragraph explanation; copyable `npx busfactor scan ./my-repo` command.
3. **Showcase** — dusk-road background image, centred **ReportWindow**. Window header: mark, repo slug, "Example report" badge, score. Four sections: Verdict / Risk map / OPERATE.md / Author questions, switchable by side nav, toolbar and keyboard.
4. **Features** — six items: verdict, risk map, OPERATE.md, author questions, citations, Markdown+JSON.
5. **Highlights** — two cards: "Code scores. The model explains." and "Works where your agents work".
6. **Quickstart** — Tabs (Local path / GitHub URL), each with one copyable command.
7. **Integrations** — CLI, MCP server, Claude Code skill.
8. **CliReference** — usage, flags, exit codes 0/1/2.
9. **Limits** — 5,000 files / 25 MB; public GitHub or local; nothing executed; snapshots deleted after 7 days.
10. **FAQ** — three questions: private code, publishing scores, partial analysis.
11. **Pro waitlist** — email-only form posting to `/api/waitlist`; preserves the pre-existing webapp behaviour.
12. **SiteFooter** — wordmark, section nav, terms/privacy/removal links.

The same shell (header, containers, tokens, typography, focus rings) applies to the other webapp routes: `/scan`, `/r/[slug]`, `/docs`, and the legal pages. Report pages are `noindex` by default.

Content rules inherited from `AGENTS.md` and the PDR:

- The hero report is explicitly labelled **Example report**. Never present fabricated numbers as a real scan.
- Every claim in the report UI carries a visible `file:line` chip; a claim without one is removed, not softened.
- Copy style: sharp, short, no AI optimism. Unknown beats a guess.
- No signup. Waitlist, if present, is email-only and stores only the email.
- Third-party reports are `noindex` by default via a **static** `metadata.robots` export on the report route; `app/robots.ts` is not a substitute. Child routes must not overwrite a parent `robots` value.
- Replace "License TBD" with the project's actual licence status once decided; do not ship that placeholder.

---

## 7. Non-goals for v0.1

- No porting the Figma app itself; `BusFactor Landing Page/` stays untouched.
- No Figma-proprietary dependencies (`@figma/astraui`, `@figma/astraui-kit`) in `apps/web`.
- No shaders, animation libraries, or decorative component packs.
- No dashboard, auth, billing, or admin UI until their PDR gates pass.
