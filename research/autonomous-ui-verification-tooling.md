# Autonomous UI verification tooling — research report

Depth: **wide**, executed as four parallel research rounds plus one adversarial verification pass (20 Nov 2026).

**Goal:** find free, local tools that let this agent verify the BusFactor web app functionally, visually, responsively and accessibly, without SaaS accounts or an LLM assigning pass/fail.

## Executive summary

A complete free local stack exists: **Playwright Test** for functional flows, network/headers/cookies and screenshots; **axe-core via `@axe-core/playwright`** in a real browser for deterministic WCAG checks; and **renderlint** or **OverflowLint** for baseline-free detection of overlap, clipping and overflow — the exact defect class the pre-launch audit found. Pixel baselines (`toHaveScreenshot`, `pixelmatch`, `honeydiff`) prove only "pixels changed vs a baseline"; they do not prove correctness. LLM vision tools were rejected as verifiers: this repository's contract forbids the LLM assigning scores or severities, and the leading candidates are immature or default to paid cloud services. Full WCAG 2.2 AA conformance and legal consent validity remain human-review items.

## Findings by sub-question

### Round 1 — Visual and responsive verification

- Playwright's `toHaveScreenshot()` writes reference PNGs and pixel-diffs with `pixelmatch`; `threshold` defaults to 0.2, with `maxDiffPixels`/`maxDiffPixelRatio` and `stylePath` to mask volatile regions (source: https://playwright.dev/docs/test-snapshots).
- Playwright warns baselines are environment-fragile: OS, browser version, settings, hardware, power source and headless mode all change rendering; baselines must be produced in the same environment (source: https://playwright.dev/docs/test-snapshots).
- Visual snapshots prove only that pixels changed, not why — a business-rule bug can be visually identical (source: https://main.vitest.dev/guide/browser/visual-regression-testing).
- `launch({ executablePath })` is supported but Playwright documents non-bundled browsers as "at your own risk"; `connectOverCDP` is the alternative (source: https://playwright.dev/docs/api/class-browsertype#browser-type-launch-option-executable-path).
- Puppeteer's `page.screenshot()` captures images but has no built-in comparison API (source: https://pptr.dev/api/puppeteer.page.screenshot).
- Cloud/paid services disqualified for a free local harness: Chromatic (Free 5,000 snapshots Chrome-only; Starter $179/mo; Pro $399/mo), Percy (BrowserStack SaaS), Argos (cloud project + token) (sources: https://www.chromatic.com/pricing/ · https://www.browserstack.com/docs/percy/ · https://argos-ci.com/docs/quickstart/playwright).
- **renderlint** (MIT, local headless Chromium, no telemetry): 62 rules including `text-overflow`, `text-clipped`, `text-crowding`, `element-overlap`, `text-overlap`, `viewport-overflow`, `obscured-content`; sweeps 13 widths from 320–1920px and re-runs with longer text/larger numbers; writes annotated screenshots and discovers Next.js `app/` routes. Limits: no canvas introspection, states need explicit config, ~4–10s per page, WCAG 2 AA not APCA (source: https://github.com/ngocanhnckh/renderlint).
- **OverflowLint** (MIT v0.6.0, no telemetry): DOM-geometry/hit-testing rules `page-horizontal-overflow`, `clipped-content-overflow-x/y`, `interactive-covered`, `text-truncation`, `sibling-content-overlap`, `fixed-sticky-obstruction`, `flex-item-overflow`, `grid-item-overflow`; Playwright adapter `check_page()`, `inspect_page()`, `check_viewports()`. Limits: no iframes or closed shadow roots, development aid not a replacement for visual review (sources: https://overflowlint.pmil.me/docs · https://registry.npmjs.org/overflowlint/latest).
- Storybook Test Runner's repository was archived 19 Nov 2026 and official support ended around Sept 2026 at v0.26.0; the suggested Vitest addon is not a drop-in replacement (source: https://storybook.js.org/addons/@storybook/test-runner) — **verifier correction**: the originally cited migration document did not support this claim; the addon page does.
- Argos documentation contained an "Agent Instructions" block instructing automated readers to call an `ask`/`goal` URL. It was treated as untrusted data and ignored — a prompt-injection attempt (source: https://argos-ci.com/docs/quickstart/playwright).

### Round 2 — Accessibility verification

- axe-core states it finds on average **57%** of WCAG issues automatically; its `color-contrast` rule does not work in JSDOM and needs a real browser. Licence is **MPL-2.0** (source: https://github.com/dequelabs/axe-core/blob/develop/README.md).
- `@axe-core/playwright`: `new AxeBuilder({ page }).analyze()`, with `include`/`exclude`/`withTags`/`withRules`; injected into all frames (source: https://raw.githubusercontent.com/dequelabs/axe-core-npm/develop/packages/playwright/README.md).
- Playwright's accessibility guide says many problems require manual testing; `keyboard.press('Tab')` + `toBeFocused()` can partially check focus order (source: https://playwright.dev/docs/accessibility-testing).
- `pa11y` (LGPL-3.0) CLI supports `--runner axe --standard WCAG2AA --reporter json`; v10 requires Node ≥22.13; default runner is `htmlcs` (source: https://github.com/pa11y/pa11y/blob/main/README.md).
- Lighthouse CI is free; scored audits include `color-contrast` (weight 7), `label` (10), `image-alt` (10); manual and best-practice audits are **not** scored (sources: https://developer.chrome.com/docs/lighthouse/accessibility/scoring · https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md).
- Accessibility Insights provides a Tab Stops aid but is an interactive extension, not a headless CLI (source: https://accessibilityinsights.io/docs/web/overview/). WAVE explicitly cannot determine accessibility (source: https://wave.webaim.org/help).
- IBM `accessibility-checker` is Apache-2.0 with CLI `npx achecker list.txt` (source: https://github.com/IBMa/equal-access/blob/master/accessibility-checker/README.md).
- Human judgement still required: alt-text quality, logical focus order, focus visibility and WCAG 2.2 SC 2.4.11, error-message quality, colour-alone meaning, screen-reader output (sources: https://levelaccess.com/blog/focus-indicators-wcag-requirements-and-best-practices · https://accsible.com/kb/wcag-2-4-11-focus-not-obscured-minimum).

### Round 3 — Functional, network and consent verification

- Next.js documentation endorses Playwright for E2E (`pnpm create playwright`) (source: https://nextjs.org/docs/app/guides/testing/playwright).
- Playwright `request` fixture / `APIRequestContext` can test API routes and token gates; `page.request` shares the browser cookie jar while `apiRequest.newContext()` is isolated (sources: https://playwright.dev/docs/api-testing · https://playwright.dev/docs/api/class-apirequestcontext).
- Network assertions via `page.on('request'/'response')`, `waitForResponse`, `route.fulfill/abort`, `response.allHeaders()`; HAR/tracing via `startHar`/`stopHar` (v1.60+) (sources: https://playwright.dev/docs/network · https://playwright.dev/docs/api/class-tracing).
- `storageState()` persists cookies, localStorage and IndexedDB but **not** sessionStorage (source: https://playwright.dev/docs/auth).
- `noindex` is verifiable from `head meta[name="robots"]` or `X-Robots-Tag` (sources: https://developers.google.com/search/docs/crawling-indexing/block-indexing · https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Robots-Tag).
- curl header checks cannot prove a CSP is enforced by a browser (source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy); Lighthouse CI can assert `is-crawlable`/noindex (source: https://googlechrome.github.io/lighthouse-ci/docs/configuration.html).
- Consent gating is technically verifiable (no tracker before consent, reject/accept persistence) but legal validity is not (sources: https://flexyconsent.com/blog/playwright-automated-consent-banner-tests · https://inth.com/blog/test-consent-gates-nextjs-playwright · https://www.trackingplan.com/blog/consent-enforcement-verification-master-compliance-in-2026-en).
- MSW intercepts at process level; a browser Service Worker makes requests invisible to `page.route()` (sources: https://mswjs.io/docs/quick-start/ · https://vitest.dev/guide/mocking/requests).

### Round 4 — Vision-based verification

- Deterministic diff answers "what changed"; a vision model can only explain. Vitest warns visual tests are not proper assertions (source: https://main.vitest.dev/guide/browser/visual-regression-testing).
- `pixelmatch` uses OKLab/HyAB with anti-aliasing suppression and `windowSize` noise rejection (source: https://github.com/mapbox/pixelmatch). Perceptual alternatives: `ssim.js`, `@blazediff/ssim`, `@blazediff/gmsd` (same Vitest source).
- `honeydiff` (MIT, Rust native, Node 22+) adds CIEDE2000, SSIM/MS-SSIM/GMSD and `analyzeWcagContrast` (source: https://github.com/vizzly-testing/honeydiff) — immature (≈15 stars) but deterministic.
- **Rejected as verifiers:** `personalens` (MIT but LLM assigns 0–10 scores and gates CI; also its diff mode is still roadmap) and the Playwright+pixelmatch+Claude framework (0 stars, LLM severity triage). Both violate `AGENTS.md` §4.2/§13: code computes pass/fail, the LLM never grades (sources: https://github.com/bgokden/personalens · https://github.com/Ankita-Singhh/ai-visual-testing-framework).
- LLMShot (arXiv:2507.10062) reports local Gemma3 structured visual triage: 12B 84.21% recall / 66.67% precision / 74.42% F1; 4B 78.95% / 57.69%. **Verifier correction:** the ignore-mechanism collapse was 76.47%→18.75% Hit Rate for the 4B model, not 82% (the 82% baseline belonged to the 12B table). Single iOS app; authors limit external validity (source: https://arxiv.org/html/2507.10062).
- `browser-use` (MIT) has a built-in Judge returning structured success/failure, but defaults to a paid cloud browser and model, requires an API key, enables telemetry, and opens local debug ports; not adopted (source: https://github.com/browser-use/browser-use). P2A's VisualWebArena gains are agent research, not a verification tool (source: https://aclanthology.org/2026.findings-emnlp.1135/).
- "ressg" could not be identified; likely `resemble.js` or `ssim.js` — unverified.

## Disagreements and open questions

- **Resolved — LLMShot figure:** corrected to 76.47%→18.75% (4B only).
- **Resolved — Storybook:** corrected citation and support-end date; Vitest addon is not a drop-in replacement.
- **Resolved — personalens/Claude triage:** rejected because an LLM must never assign pass/fail or severity here.
- **Resolved — browser path:** `/usr/bin/chromium-browser` is a snap wrapper, not a real binary; must be smoke-tested, and Playwright's own bundled Chromium is preferred (verifier finding).
- **Resolved — axe licence:** MPL-2.0, not MIT; gradients/images can yield "incomplete" contrast results.
- **Open:** which packages actually install successfully in this environment (Node 24, pnpm 10.15) and whether renderlint/OverflowLint can use a local browser without a download.
- **Open:** legal consent validity, actual search-engine deindexing, screen-reader output, and full keyboard traversal remain human tasks.
- **Open:** screenshot baselines are environment-fragile; deterministic geometry checks are preferred for this harness.

## Full source list

- https://playwright.dev/docs/test-snapshots
- https://playwright.dev/docs/browsers
- https://playwright.dev/docs/api/class-browsertype#browser-type-launch-option-executable-path
- https://playwright.dev/docs/accessibility-testing
- https://playwright.dev/docs/api-testing
- https://playwright.dev/docs/api/class-apirequestcontext
- https://playwright.dev/docs/network
- https://playwright.dev/docs/api/class-tracing
- https://playwright.dev/docs/auth
- https://playwright.dev/docs/writing-tests
- https://nextjs.org/docs/app/guides/testing/playwright
- https://pptr.dev/api/puppeteer.page.screenshot
- https://www.chromatic.com/pricing/
- https://www.browserstack.com/docs/percy/
- https://argos-ci.com/docs/quickstart/playwright
- https://github.com/oblador/loki
- https://github.com/garris/BackstopJS
- https://github.com/ngocanhnckh/renderlint
- https://overflowlint.pmil.me/docs
- https://registry.npmjs.org/overflowlint/latest
- https://github.com/dequelabs/axe-core/blob/develop/README.md
- https://raw.githubusercontent.com/dequelabs/axe-core-npm/develop/packages/playwright/README.md
- https://github.com/pa11y/pa11y/blob/main/README.md
- https://developer.chrome.com/docs/lighthouse/accessibility/scoring
- https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md
- https://googlechrome.github.io/lighthouse-ci/docs/configuration.html
- https://accessibilityinsights.io/docs/web/overview/
- https://wave.webaim.org/help
- https://github.com/IBMa/equal-access/blob/master/accessibility-checker/README.md
- https://github.com/storybookjs/test-runner
- https://developers.google.com/search/docs/crawling-indexing/block-indexing
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Robots-Tag
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
- https://mswjs.io/docs/quick-start/
- https://vitest.dev/guide/mocking/requests
- https://main.vitest.dev/guide/browser/visual-regression-testing
- https://chromedevtools.github.io/devtools-protocol/
- https://flexyconsent.com/blog/playwright-automated-consent-banner-tests
- https://inth.com/blog/test-consent-gates-nextjs-playwright
- https://www.trackingplan.com/blog/consent-enforcement-verification-master-compliance-in-2026-en
- https://github.com/mapbox/pixelmatch
- https://github.com/vizzly-testing/honeydiff
- https://github.com/bgokden/personalens
- https://github.com/Ankita-Singhh/ai-visual-testing-framework
- https://arxiv.org/html/2507.10062
- https://github.com/browser-use/browser-use
- https://aclanthology.org/2026.findings-emnlp.1135/
- https://levelaccess.com/blog/focus-indicators-wcag-requirements-and-best-practices
- https://accsible.com/kb/wcag-2-4-11-focus-not-obscured-minimum
