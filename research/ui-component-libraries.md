# Component-library research — BusFactor web rebuild

Depth: **wide**. Date: 20 Nov 2026. Decision this supports: which free component libraries to use when rebuilding the BusFactor web app in `apps/web` (Next.js 16 / React 19 / Tailwind v4 / strict TypeScript).

## Executive summary

shadcn/ui is the right foundation: MIT-licensed, copy-in code you own, first-class Tailwind v4 / React 19 support, and an existing `base-nova` init already in the repo. Base UI is the current default primitive provider; Radix remains fully supported, so the mix of `@base-ui/react` and `@radix-ui/react-*` already installed is valid, not a half-finished migration. Of the three extra sources, only the **free/MIT portion of Space UI** is a safe add-on — its shaders, blocks and templates are commercial and its Pro license caps usage at 15 components per public repo. Open Shadcn Blocks publishes no license, no source repo, and serves images from a competitor's CDN, so it is a legal/provenance risk and should not be copied. AI SDK Agents is a paid AI-pattern marketplace whose free tier is AI-demo patterns, not marketing or report UI. Practical implication: build from shadcn/ui, add a few vetted components, and treat accessibility/performance (Lighthouse 90+ mobile) as a code requirement rather than a library feature.

---

## Findings by sub-question

### 1. shadcn/ui — current state, `base-nova`, license, install model, compatibility

- **What "v4" means.** It spans two things: the CLI major released March 2026 (`shadcn/skills`, presets, `--dry-run`/`--diff`/`--view`, `--template`, `--monorepo`, `shadcn info`/`docs`) and the registry generation whose source of truth is `apps/v4/registry` (source: https://ui.shadcn.com/docs/changelog/2026-03-cli-v4; https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/README.md).
- **Style model.** A *base* (`base` = Base UI, `radix` = Radix) is crossed with a style token to produce names such as `base-nova` and `radix-sera`. These are generated, not hand-authored. Eight style names are in circulation — nova, vega, maia, lyra, mira, luma, sera, rhea — but the eight-name list comes from third-party write-ups, not the cited official changelog (source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/README.md; https://blog.thilina.dev/blog/shadcn-base-ui). `--base` selects the primitive library. A "preset" is a short code encoding colours, theme, icon library, fonts and radius; calling it a style selector is an inference, not documented by the CLI v4 changelog (source: https://ui.shadcn.com/docs/changelog/2026-03-cli-v4).
- **Base UI is the default, Radix is not deprecated.** As of July 2026, `npx shadcn init` defaults to Base UI (stable 1.6.0, 6M+ weekly downloads, built by the Radix team, chosen roughly 2:1 in `shadcn/create`). Radix is fully supported, receives every update, and is opted into with `-b radix` / `--base radix`. No migration is required (source: https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default). The existing mix of both packages in `apps/web` is therefore supported coexistence.
- **`base-nova` is the current default** `style` in `components.json`, alongside `rsc: true`, `baseColor: neutral`, `cssVariables: true` (source: https://ui.shadcn.com/docs/theming). Older docs that named `new-york` as the new default are superseded (source: https://ui.shadcn.com/docs/changelog; https://ui.shadcn.com/docs/tailwind-v4).
- **License: MIT**, "Copyright (c) 2023 shadcn", notice retained in source copies; no attribution required in the rendered UI (source: https://raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md; https://vercel.com/i/what-is-shadcn).
- **Install model is hybrid copy-in.** shadcn is explicitly "not a component library"; the CLI writes JSX, Tailwind classes and CVA variants into `components/ui/` for you to own and edit, while behavioural primitives (Base UI / Radix) remain npm runtime dependencies. `npm update` does not update copied files; use `shadcn add --diff` / `--reinstall` (source: https://ui.shadcn.com/docs; https://vercel.com/i/what-is-shadcn). A Sept 2026 change moved `cn` from a copied `twMerge(clsx(...))` helper to an `cn` npm package — consistent with the already-present `lib/utils.ts` in this repo (source: https://ui.shadcn.com/docs/changelog).
- **Theming / dark mode.** Semantic CSS-variable tokens under `:root` and `.dark`, exposed via `@theme inline`, with OKLCH colours; base colours include Neutral, Stone, Zinc, Mauve, Olive, Mist, Taupe. For Next.js: `next-themes`, a client `ThemeProvider` with `attribute="class"`, `defaultTheme="system"`, `disableTransitionOnChange`, and `suppressHydrationWarning` on `<html>` (source: https://ui.shadcn.com/docs/theming; https://ui.shadcn.com/docs/dark-mode/next).
- **Compatibility.** Tailwind v4 and React 19 are explicitly supported (forwardRefs removed, `data-slot` added, OKLCH; `tailwindcss-animate` deprecated in favour of `tw-animate-css`). Next.js is a first-class CLI target (`-t next`, App Router, `@/*` alias) (source: https://ui.shadcn.com/docs/tailwind-v4; https://ui.shadcn.com/docs/installation/next). **No official doc fetched explicitly certifies "Next.js 16"**; working examples exist in third-party guides and boilerplates (source: https://freecodecamp.org/news/how-to-build-landing-page-nextjs-shadcn; https://github.com/doinel1a/next-ts-shadcn-ui). Treat Next.js 16 support as *very likely, unverified officially*.

### 2. Space UI (spaceui.one)

- **What it is:** "a distribution of React components built with Tailwind CSS, Motion, and Base UI, based on the shadcn registry format" — explicitly "not a library — an open component distribution", installed by copying code into your repo (source: https://www.spaceui.one/docs). Owner/creator: Adriel Zimbril (source: https://www.spaceui.one/).
- **Stack fit:** React ≥19, Tailwind v4, Motion ≥12, Base UI ≥1.7, with a Next.js 15/16 App Router guide and `components.json` style `base-nova`. Registry `@spaceui` resolves to `spaceui.one/r/{name}.json`. This is the closest stack match of the three external sources (source: https://www.spaceui.one/docs/installation; /installation/nextjs; /llms.txt).
- **Install:** via the shadcn CLI, e.g. `pnpm dlx shadcn@latest init spaceui.one/r/lib-style.json` then `pnpm dlx shadcn@latest add @spaceui/primitives-dialog`; manual copy-paste is also supported (source: https://www.spaceui.one/docs/installation; /installation/manual).
- **Free vs paid:** Community tier is free forever (60+ free primitives, 838+ examples). Pro and Team are **launch promotion prices** — "$129 once" and "$499 once / 10 seats" are labelled "Launch price", "41% OFF", "7 spots left", so they are not a stable list price. Paid tiers add Pro components, shaders, blocks, templates, AI skills/MCP, and priority support (source: https://www.spaceui.one/pricing).
- **License is two-tier despite a blanket "MIT License" footer.** Every base primitive, utility hook and free community block is MIT and usable in public OSS repos; Pro components are under a separate commercial license — perpetual, non-exclusive, non-transferable, capped at 15 Pro components per public repo, with no resale as a kit/theme, no competing libraries, and no public token sharing (source: https://www.spaceui.one/license; https://www.spaceui.one/; https://github.com/usespaceui/ui). **Verify tier per component before adopting.** The `adrielzimbril/space-ui` link redirects to `usespaceui/ui`, so the two GitHub URLs are not a source conflict.
- **Contents/counts disagree across pages:** homepage says 60+ primitives, 116+ components, 16+ templates, 61+ hooks, 14+ tools; pricing says 116+ Pro components, 22+ templates, 17+ block collections, 838+ demos; the live catalogues list "Components 53" and "Blocks 8". Treat marketing totals as unreliable (source: https://www.spaceui.one/; /pricing; /components; /blocks).
- **Maturity:** public repo `usespaceui/ui` is MIT with 65 stars, 3 forks, 170 commits. Releases run v0.0.10 (22 Aug 2026) to v0.0.13 (19 Sep 2026) — pre-1.0 and roughly two months without a logged release as of 20 Nov 2026, despite "weekly drops" marketing (source: https://github.com/usespaceui/ui; https://www.spaceui.one/docs/changelog). One independent French review (29 Oct 2026) confirms ~60 primitives and a thin agent layer, notes some advertised tools were not delivered, describes a single maintainer, and recommends using primitives/blocks freely but not basing an entire marketing page on a template (source: https://mondary.design/2026/11/space-ui-le-registre-react-que-vos-agents-installent-eux-memes/).
- **Name collisions:** `spacedriveapp/spaceui` and `space-ui-docs.vercel.app` are different projects (source: https://github.com/spacedriveapp/spaceui/blob/main/packages/primitives/README.md; https://space-ui-docs.vercel.app/getting-started).
- **Bottom line:** safe to use the **MIT free primitives/hooks**; do not build a product on Pro components or a Pro-derived template without a licence decision.

### 3. Open Shadcn Blocks (openshadcnblocks.pages.dev)

- Large, free, no-account catalogue: 3,759 items (1,779 blocks, 1,914 components, 49 pages, 17 templates), marketed "Free forever / Open source by default" (source: https://openshadcnblocks.pages.dev/).
- **No licence grant exists.** `/license` returns 404 and no LICENSE file was found. Every GitHub link, including "Star on GitHub", goes to the generic `github.com` homepage. The repo `shadcnblockscom/openshadcnblocks` is empty and the `shadcnblocks6` account has no public repositories. "Open source" here means "source is viewable/copyable on the site", not an OSI licence (source: https://openshadcnblocks.pages.dev/license; /docs; https://github.com/shadcnblockscom/openshadcnblocks; https://github.com/shadcnblocks6).
- **Provenance concern.** Template names are identical to the premium shadcnblocks.com catalogue (Verdict is sold there for $47), registry images are hard-coded to `deifkwefumgah.cloudfront.net/shadcnblocks/...`, and the site describes its own patterns as "deliberately independent" while offering "the same practical preview-and-copy workflow as the reference catalog" (source: https://openshadcnblocks.pages.dev/r/block/hero231; https://www.shadcnblocks.com/template/verdict; https://openshadcnblocks.pages.dev/about). shadcnblocks.com T&Cs prohibit republishing Free Blocks as a catalogue, mirroring/cloning, removing identifying markers, and require directories to point installs at shadcnblocks.com (source: https://www.shadcnblocks.com/terms; /license). **This is a documented concern, not a legal ruling.**
- **Technical fit is partial.** Install works through the shadcn registry (`npx shadcn add https://openshadcnblocks.pages.dev/r/block/hero231`) and items import the consumer's own `@/components/ui/*`. Templates claim Next.js 16 / React 19 / Tailwind v4, but there is no mention of shadcn v4, Base UI or `base-nova`; an inspected dialog uses the Radix-only `onOpenAutoFocus` prop, which a Base UI wrapper may not support. Inspected code does include aria-live, keyboard navigation, focus management and reduced-motion handling, but also raw `<img>` and inline `<style>` (source: https://openshadcnblocks.pages.dev/docs; /r/component/dialog-standard-1; /r/block/hero231; /template/verdict).
- Accessibility claims "axe audits and keyboard-entry tests" but publishes no results, suite or CI. Maintenance cannot be independently verified. Counts conflict with a pre-launch listing of ~3,471 items (source: https://openshadcnblocks.pages.dev/accessibility; https://sololaunches.com/upcoming-launches).
- **Bottom line:** do not copy from this source for a product that may be published. The absence of a licence is a hard blocker under the project's own rules.

### 4. AI SDK Agents (aisdkagents.com)

- A **commercial, curated pattern library** ("like shadcn for the AI SDK") built on shadcn/ui + Next.js + TypeScript: typed tools, streaming UI, memory, human-in-the-loop, workflows, artifacts. 154 blocks/patterns and 211 "AI Components" are advertised (source: https://www.aisdkagents.com/docs/about; https://www.aisdkagents.com/; /llms.txt).
- **Paid lifetime licences:** Pro $149 (154 blocks, no AI UI components), Premium $199 (adds 211 components, 23 skills, 4 templates), Team $999. The "19 vs 23 skills" discrepancy is a counting-scope difference, not a contradiction: the `/skills` page says 4 free + 19 premium = 23 total (source: https://aisdkagents.com/pricing; https://www.aisdkagents.com/llms.txt; https://www.aisdkagents.com/skills).
- **Licence split:** paid items are non-exclusive/non-transferable with no redistribution, resale, sublicensing, public posting or competing-derivative use; free items are explicitly MIT — "free Patterns and the Free core of AI Components" (source: https://aisdkagents.com/terms).
- **Free tier is 25 AI SDK patterns** (text/structured output, image/audio, web search, scraping, chat demos), not general marketing or report UI. A few individual components are tagged Free (Starter prompts, Markdown, Tool call card), and Free Blocks install with `npx shadcn@latest add` without a token — but the AI Components doc calls the catalogue "Premium" and `llms.txt` says source/CLI install ship with Premium/Team (source: https://aisdkagents.com/free; /group/free; /docs/free-vs-pro; https://www.aisdkagents.com/docs/ai-components; /llms.txt).
- The report-adjacent and marketing components that would actually help (Comparison Table, Agent ROI Calculator, Spend breakdown, Usage meter, Invoice history, Logs & traces) are not labelled free. Templates are $79 each or in Premium; skills are playbooks and do not ship block source (source: https://www.aisdkagents.com/ai-components; /templates; /skills).
- Stack signals are compatible in principle (shadcn/ui, Tailwind, CSS variables, `baseColor: neutral`), but **no version-specific claim for Next.js 16 / React 19 / Tailwind v4 was found**. An unrelated MIT npm package named `ai-sdk-agents` exists and is not the source of this site's components; the site's GitHub link is `nolly-studio` (source: https://www.aisdkagents.com/docs/theming; /llms.txt; https://github.com/sslava/ai-sdk-agents).
- **Bottom line:** not a free UI library for this project. Irrelevant to a landing page or static report page.

### 5. Accessibility, performance and noindex constraints

- **Lighthouse accessibility** is a weighted axe-based average. High-weight checks: accessible names, valid ARIA roles/values, form labels, contrast, `html lang`, document title, discernible link names, no positive `tabindex`; lower-weight: heading order, skip link, one main landmark. Exact point weights differ between current Chrome docs and third-party write-ups, so target "pass all audits", not a fixed tally (source: https://developer.chrome.com/docs/lighthouse/accessibility/scoring; https://www.debugbear.com/blog/lighthouse-accessibility).
- **Primitives help with the hard parts** — focus traps/return, keyboard navigation, screen-reader announcements, ARIA roles — but the developer must still supply accessible names and labels (source: https://www.radix-ui.com/primitives/docs/overview/accessibility; https://vercel.com/academy/shadcn-ui/what-are-radix-primitives). A third-party 2026 WCAG 2.2 AA audit found only 34/48 shadcn components passing out of the box, most often on focus visibility; note that the current official default uses `outline-ring/50` rather than the older `focus-visible:ring-1 ring-ring/50` the audit describes, so the finding may apply to an older version and is **not settled** (source: https://thefrontkit.com/blogs/shadcn-ui-accessibility-audit-2026; https://ui.shadcn.com/docs/theming).
- **Fonts:** `next/font` self-hosts at build time and defaults to `display: swap`, `preload: true`, `adjustFontFallback: true`; `subsets` is required when preloading, and variable fonts are recommended. Tailwind v4 integration: `@theme inline { --font-sans: var(--font-inter) }` (source: https://nextjs.org/docs/app/getting-started/fonts; /docs/app/api-reference/components/font). A widely repeated "18% of sites using font-display: swap still have poor CLS" figure comes from a **2022 community RFC about Next.js specifically**, is unsourced, and is not used as evidence here (source: https://github.com/vercel/next.js/discussions/40112).
- **Dark-mode FOUC:** the documented fix is a synchronous inline `<head>` script plus `suppressHydrationWarning` on `<html>`; `useEffect` flashes, `useLayoutEffect` still paints server HTML first, and reading a theme cookie in the root layout opts out of static prerendering. Strict CSP needs a nonce for the inline script. `next-themes` injects its own pre-paint script and requires `suppressHydrationWarning`; `useTheme` is undefined until mount, so theme-dependent UI needs a `mounted` guard (source: https://nextjs.org/docs/app/guides/preventing-flash-before-hydration; https://github.com/pacocoursey/next-themes).
- **Performance:** Core Web Vitals targets LCP < 2.5s, INP < 200ms, CLS < 0.1. Lighthouse is lab data; search ranking uses 28-day field p75, so a high lab score is necessary but not sufficient (source: https://vercel.com/academy/nextjs-foundations/core-web-vitals-and-measurement). `next/image` needs width/height (or static import / `fill`) and a correct `sizes`, otherwise the browser assumes 100vw. In Next.js 16, `priority` is deprecated for the LCP image in favour of `preload`; do not combine `preload` with `loading` or `fetchPriority`. Default output is WebP; use `unoptimized` for SVG (source: https://nextjs.org/docs/app/api-reference/components/image, last updated 18 Nov 2026).
- **noindex:** use a static `metadata = { robots: { index: false, follow: false } }` export from a Server Component. Nested `robots` metadata is overwritten by the last segment that defines it, so a child report page can silently erase a parent's noindex. `app/robots.ts` emits `robots.txt` Disallow rules and is **not** a substitute for a per-page noindex meta tag (source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata; /docs/app/api-reference/file-conventions/metadata/robots).

---

## Disagreements & open questions

- **Resolved from verification:** the 18% CLS statistic was dropped (stale, misquoted, unsourced); `--preset` was corrected to "encodes colours/theme/icon/fonts/radius" rather than "selects style"; the WCAG audit is marked version-uncertain; the Space UI $129/$499 prices are marked as launch promo; the 19/23 skills figures are reconciled as a counting scope; the unsupported account join date was dropped.
- **Open:** no official shadcn doc explicitly certifies Next.js 16, though third-party examples show the stack working.
- **Open:** Space UI's free/Pro split is not consistently signposted in its catalogue. Per-component licence verification is required before any Pro item is used.
- **Open:** Open Shadcn Blocks has no licence and no source repo; whether its copying of shadcnblocks.com patterns is permitted is undetermined. Do not use.
- **Open:** which precise AI SDK Agents components are in the MIT free core could not be fully enumerated (site rate-limited). Not needed for the current scope.
- **Open:** no authoritative byte/request threshold for "Lighthouse 90+ on mobile" was found; the actual app must be measured under mobile throttling.
- **Open:** Base UI-specific accessibility primitives were not separately verified; authoritative docs centred on Radix.

## Full source list

**shadcn/ui**
- https://ui.shadcn.com/docs
- https://ui.shadcn.com/docs/changelog
- https://ui.shadcn.com/docs/changelog/2026-03-cli-v4
- https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- https://ui.shadcn.com/docs/tailwind-v4
- https://ui.shadcn.com/docs/theming
- https://ui.shadcn.com/docs/dark-mode/next
- https://ui.shadcn.com/docs/installation/next
- https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/README.md
- https://raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md
- https://vercel.com/i/what-is-shadcn
- https://blog.thilina.dev/blog/shadcn-base-ui
- https://www.shadcnblocks.com/changelog/new-feature-shadcn-cli-style-support
- https://freecodecamp.org/news/how-to-build-landing-page-nextjs-shadcn
- https://github.com/doinel1a/next-ts-shadcn-ui

**Space UI**
- https://www.spaceui.one/
- https://www.spaceui.one/docs
- https://www.spaceui.one/pricing
- https://www.spaceui.one/license
- https://www.spaceui.one/components
- https://www.spaceui.one/blocks
- https://www.spaceui.one/docs/installation
- https://www.spaceui.one/docs/installation/nextjs
- https://www.spaceui.one/docs/installation/manual
- https://www.spaceui.one/docs/changelog
- https://www.spaceui.one/llms.txt
- https://www.spaceui.one/llms-full.txt
- https://github.com/usespaceui/ui
- https://mondary.design/2026/11/space-ui-le-registre-react-que-vos-agents-installent-eux-memes/
- https://github.com/spacedriveapp/spaceui/blob/main/packages/primitives/README.md
- https://space-ui-docs.vercel.app/getting-started

**Open Shadcn Blocks**
- https://openshadcnblocks.pages.dev/
- https://openshadcnblocks.pages.dev/docs
- https://openshadcnblocks.pages.dev/license (404)
- https://openshadcnblocks.pages.dev/about
- https://openshadcnblocks.pages.dev/accessibility
- https://openshadcnblocks.pages.dev/r/block/hero231
- https://openshadcnblocks.pages.dev/r/component/dialog-standard-1
- https://openshadcnblocks.pages.dev/template/verdict
- https://github.com/shadcnblockscom/openshadcnblocks
- https://github.com/shadcnblocks6
- https://www.shadcnblocks.com/template/verdict
- https://www.shadcnblocks.com/terms
- https://www.shadcnblocks.com/license
- https://sololaunches.com/upcoming-launches

**AI SDK Agents**
- https://www.aisdkagents.com/
- https://www.aisdkagents.com/docs/about
- https://www.aisdkagents.com/llms.txt
- https://aisdkagents.com/pricing
- https://aisdkagents.com/terms
- https://aisdkagents.com/free
- https://aisdkagents.com/group/free
- https://www.aisdkagents.com/ai-components
- https://www.aisdkagents.com/docs/ai-components
- https://www.aisdkagents.com/docs/free-vs-pro
- https://www.aisdkagents.com/docs/theming
- https://www.aisdkagents.com/templates
- https://www.aisdkagents.com/skills
- https://github.com/sslava/ai-sdk-agents
- https://www.npmjs.com/package/ai-sdk-agents

**Accessibility / performance / noindex**
- https://developer.chrome.com/docs/lighthouse/accessibility/scoring
- https://www.debugbear.com/blog/lighthouse-accessibility
- https://www.radix-ui.com/primitives/docs/overview/accessibility
- https://vercel.com/academy/shadcn-ui/what-are-radix-primitives
- https://shadcnstudio.com/blog/making-your-website-accessible-with-shadcn-ui/
- https://thefrontkit.com/blogs/shadcn-ui-accessibility-audit-2026
- https://nextjs.org/docs/app/getting-started/fonts
- https://nextjs.org/docs/app/api-reference/components/font
- https://github.com/vercel/next.js/discussions/40112
- https://nextjs.org/docs/app/guides/preventing-flash-before-hydration
- https://github.com/pacocoursey/next-themes
- https://vercel.com/academy/nextjs-foundations/core-web-vitals-and-measurement
- https://nextjs.org/docs/app/api-reference/components/image
- https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
