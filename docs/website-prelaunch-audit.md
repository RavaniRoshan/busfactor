# Website Pre-Launch Audit

- Site/repository: BusFactor, `/home/shiva/projects/heir` — production `https://heir-weld.vercel.app`
- Audit date: 20 Nov 2026
- Environment: Next.js 16.4.6 / React 19 / Tailwind v4, Vercel project `heir`, Neon Postgres via `DATABASE_URL`, local dev `http://127.0.0.1:3000`
- Site type: developer tool / report SaaS (no signup, no payments, free public scans)
- Operator and target jurisdictions: Owner named as Roshan Ravani in `AGENTS.md`; no legal entity, address, contact channel or target market is established in the repository or UI. **UNVERIFIED** — requires the operator to supply these facts and qualified local legal review.
- Scope limitations: no screen reader was used; full keyboard traversal was not completed; automated Lighthouse/axe was not run; analytics payloads were not inspected in depth. No code changes were made during this audit.

## Launch decision

- Status: **NOT READY**
- Critical findings: none confirmed.
- High findings: privacy policy materially incomplete; terms materially incomplete; analytics loads with no consent mechanism; report workspace has low-contrast active navigation, white cards inside a dark panel, and a broken mobile layout.
- Required actions before launch: supply operator identity/contact and target jurisdictions; rewrite privacy/terms from the real data map; add consent for analytics (or remove it); fix report contrast and mobile reflow; re-test.

## Checklist

| # | Area | Status | Severity | Evidence | Required action |
|---|------|--------|----------|----------|-----------------|
| 1 | Privacy policy | FAIL | HIGH | `apps/web/app/privacy/page.tsx:9-12` — three sentences only; no operator, contact, data categories, recipients, retention, rights, or date. Analytics script loads at `/c1ed0849b561d4c8/script.js` on production. | Rewrite from the real data map; add operator, contact, purposes, recipients, retention, rights, effective date. |
| 2 | Terms and conditions | FAIL | HIGH | `apps/web/app/terms/page.tsx:9-11` — two sentences; no eligibility, acceptable use, availability, termination, liability, contact, or governing law. | Publish terms describing the actual service and operator. |
| 3 | Cookie policy | FAIL | MEDIUM | No cookie policy route or page exists (`find apps/web -iname '*cookie*'` returned nothing); no cookie/storage inventory published. | Publish an accurate inventory or state explicitly that no cookies are used, after verifying the analytics script's storage behaviour. |
| 4 | Refund policy | NOT APPLICABLE | — | No checkout, pricing, payment provider, subscription or invoicing code/route in `apps/web/app`; no paid offering. | Revisit if a paid tier is introduced. |
| 5 | Cookie and form consent | FAIL | HIGH | Browser network capture on production `/scan` shows automatic request to same-origin `/c1ed0849b561d4c8/script.js` (Vercel Analytics) with no consent UI anywhere (`grep -rni consent` only matched an unrelated Terms sentence). Scan form has a label but no privacy link at the point of collection. | Gate analytics behind consent where required, or remove it; add a privacy link at the collection point. |
| 6 | Data collected | FAIL | HIGH | Raw client IP is used as the rate-limit key: `apps/web/app/api/scan/route.ts:7-9,26`. Waitlist emails and feedback are written to `apps/web/data/*.json` by `apps/web/app/api/waitlist/route.ts` and `apps/web/app/api/feedback/route.ts`. Reports/jobs persist in Neon (`apps/web/lib/store.ts`). The privacy page discloses none of this. | Hash IP before storage; document every category, purpose, destination, retention and access control; update the privacy page to match. |
| 7 | Third-party embeds and integrations | PARTIAL | HIGH | `@vercel/analytics/next` in `apps/web/app/layout.tsx:2,31`; CSP in production explicitly allows `https://vitals.vercel-insights.com`. Script loaded automatically. Fonts are self-hosted (`/_next/static/media/*.woff2`); no Google Fonts runtime request. | Disclose the provider and data sent; obtain consent or remove; verify the CSP is still minimal. |
| 8 | Alt text and colour contrast | FAIL | HIGH | Screenshots `/home/shiva/tmp-audit/report.png`, `operate.png`, `questions.png`, `mobile-report.png`: active nav labels nearly invisible on the dark panel; Space UI `Card` renders white boxes inside the dark report; mobile header text clipped and dimension labels overlap bars. No `<img>` elements exist; decorative logo SVG is `aria-hidden`. | Fix cascade so dark-panel tokens override component utilities; make cards dark; restructure report at narrow widths; measure WCAG AA contrast after fixes. |
| 9 | Keyboard-friendly forms and buttons | PARTIAL | MEDIUM | `apps/web/components/scan-form.tsx` has an associated label, `type="email"`, required, and focus-visible ring classes; icon-only controls use `aria-label`. Full Tab-order and keyboard-submit traversal was not completed. | Complete manual keyboard testing on `/scan`, report views and feedback; verify focus order and error announcements. |
| 10 | Reviews, claims and business details | UNVERIFIED | MEDIUM | No testimonials, ratings, customer logos or placeholder metrics found in the UI. Claims such as "24 hours" (`apps/web/app/removal/page.tsx:8`) and "5,000 files or 25 MB" exist in docs/tests but not the current app UI. No operator name, address or support contact is published anywhere. | Confirm each public claim; publish a real contact route; do not add testimonials without provenance. |
| 11 | Copyright and local laws | UNVERIFIED | MEDIUM | Assets: self-hosted Instrument Sans / JetBrains Mono (`next/font/google`), lucide-react icons, MIT Space UI community primitives (`components.json` registry only), no Pro components. No asset/licence register committed. Operator location and target markets unknown. | Record font/icon/component licences and attribution; get operator jurisdiction facts; obtain qualified legal review — this audit is not a compliance certification. |

## Detailed findings

### AUD-01 — HIGH — Privacy policy does not describe the product
- Affected: `https://heir-weld.vercel.app/privacy`, `apps/web/app/privacy/page.tsx:9-12`
- Observed: three sentences about snapshot deletion, redaction and noindex. No operator identity, contact, data categories, recipients, retention for waitlist/feedback, rights, or effective date.
- Why it matters: the site collects repo targets, stores raw IPs as rate-limit keys, writes waitlist emails and feedback to files, and loads analytics. The published text does not match observed behaviour.
- Evidence: privacy page source; `apps/web/app/api/scan/route.ts:7-9,26`; `apps/web/app/api/waitlist/route.ts`; `apps/web/app/api/feedback/route.ts`; production network capture.
- Fix: build the policy from an actual data inventory; include a real contact method and date.
- Verify: read the published page and compare each paragraph with a code-level data map.

### AUD-02 — HIGH — Terms are a two-sentence stub
- Affected: `https://heir-weld.vercel.app/terms`, `apps/web/app/terms/page.tsx:9-11`
- Observed: only "you are responsible for having the right to scan" and "named public scores are published only with consent".
- Why it matters: no service description, eligibility, acceptable use, availability, termination, liability, contact or governing law.
- Fix: publish terms describing the real service and operator; get jurisdiction-specific review.
- Verify: compare terms with the scan flow and marketing claims.

### AUD-03 — HIGH — Analytics runs without consent and is undisclosed
- Affected: production `/scan`; `apps/web/app/layout.tsx:2,31`
- Observed: browser network capture showed a request to `https://heir-weld.vercel.app/c1ed0849b561d4c8/script.js` (Vercel Analytics) on initial page load, with no consent banner or preference control. Production CSP allows `vitals.vercel-insights.com`.
- Why it matters: prior consent for non-essential analytics is required in several jurisdictions; the privacy page does not mention analytics.
- Fix: remove analytics, or load it only after an explicit opt-in with a stored preference and a way to withdraw.
- Verify: repeat a clean browser load and confirm no analytics request before consent; confirm a request after consent.

### AUD-04 — HIGH — Raw IP stored as rate-limit key
- Affected: `apps/web/app/api/scan/route.ts:7-9,26`; `apps/web/lib/store.ts` (`rateLimits` namespace)
- Observed: `x-forwarded-for` is split and the first value is used verbatim as the store key.
- Why it matters: an IP address is personal data in many jurisdictions; it is not disclosed in the privacy policy and is not hashed as the PDR intends.
- Fix: hash the IP with a salt before using it as a key; document the practice.
- Verify: scan from a known address and confirm the stored key is not the raw IP.

### AUD-05 — HIGH — Report workspace visual/contrast defects
- Affected: `/r/[slug]` all four views; screenshots in `/home/shiva/tmp-audit/`
- Observed: active left-nav labels render in near-black on the dark panel; OPERATE.md and author-question cards render white inside the dark panel; at 390px wide the header text is clipped, nav consumes half the width, and dimension labels overlap their bars.
- Why it matters: low contrast and overlap impede use for real operators, especially on mobile; contradicts the design spec's theme independence.
- Evidence: `report.png`, `operate.png`, `questions.png`, `mobile-report.png`.
- Fix: increase specificity/scope of `.rw-*` overrides over Tailwind utilities and Base UI `data-active` styles; restack the report body vertically on small screens; measure contrast after fixing.
- Verify: recapture desktop and 390px screenshots and check WCAG AA contrast.

### AUD-06 — MEDIUM — No cookie policy or storage inventory
- Affected: site-wide
- Observed: no cookie policy route; no published inventory; analytics script loaded automatically. `next-themes` may write a theme preference to browser storage (not directly observed in this run).
- Fix: inventory cookies/localStorage/analytics identifiers, then publish a policy or a truthful "no cookies" statement.
- Verify: inspect storage in a clean browser before and after interaction.

### AUD-07 — MEDIUM — Business identity and contact absent
- Affected: all pages
- Observed: no operator name, legal entity, address, support email or phone in the UI or policies.
- Fix: publish a real contact channel consistent across the site and policies.
- Verify: check footer, privacy, terms and removal pages.

### AUD-08 — MEDIUM — No asset/licence register
- Affected: repository
- Observed: fonts self-hosted, icons from lucide-react, Space UI MIT primitives; no register recording source, licence or attribution.
- Fix: add a register with exact package versions and licence URLs; verify Space UI components used are all Community/MIT.
- Verify: grep installed components for Pro-only imports.

## Deterministic verification harness (added after the first audit)

A local, free, deterministic harness was built from multi-round research (`research/autonomous-ui-verification-tooling.md`) and runs with `pnpm verify`: Playwright Test for functional flows, `@axe-core/playwright` for computed contrast/ARIA, `overflowlint/playwright` for baseline-free geometry checks, and Playwright network/storage capture for consent behaviour. No LLM assigns pass/fail or severity.

Final clean run: **15 passed, 5 failed**. All five failures are genuine product defects; the one known tool false positive (the off-screen skip link reported as `interactive-covered`) was explicitly suppressed with `data-ol-ignore`.

- **AUD-08 — HIGH — cached scans produce an unusable job ID.** `POST /api/scan` returns a random `id` on a cache hit without writing it to the jobs store; the form then polls `GET /api/scan/:id` and receives 404, so the browser never reaches the report. Evidence: `tests/functional.spec.ts:89` and the form-flow test at `:25`; observed request `GET /api/scan/<id> → 404`. Fix: persist a job row on the cache path too.
- **AUD-09 — HIGH — active report tab fails contrast.** axe-core measured foreground `#131922` on background `#1c1f26`, ratio **1.07:1** against a required 4.5:1 on `#rw-tab-verdict`. Evidence: `tests/accessibility.spec.ts:16`. This is a concrete measurement for AUD-05.
- **AUD-10 — HIGH — mobile report does not stack.** At 390×844, `.rw-body` computes `display: flex` (Space UI Tabs utility overrides the scoped `.rw-body` grid), leaving nav at x=25 and content at x=205; header `scrollWidth 484 > clientWidth 340`. Evidence: `tests/layout.spec.ts:29` and screenshot `/home/shiva/tmp-audit/mobile-report-final.png`.
- **AUD-03 (confirmed) — analytics before consent.** The harness observed `GET /_vercel/insights/script.js` on a clean `/scan` load with no consent UI (`tests/network.spec.ts:3`).
- AUD-05's overlap remains a real visual defect even though `overflowlint` alone did not flag it; the custom geometry assertion now pins it. OverflowLint's blind spots are documented in `tests/README.md`.

## Remediation verification (20 Nov 2026)

All five deterministic defects were fixed and the harness re-run:

- cache-hit scans now persist a job row before responding (`apps/web/app/api/scan/route.ts`);
- active nav text uses a lighter scoped token, measured axe contrast now passes 4.5:1;
- `.rw-body` forces `display: grid !important` over the Space UI `flex` utility, the provenance line is hidden at ≤640px, and cards are forced to the dark surface;
- Vercel Web Analytics was removed from `app/layout.tsx`, its dependency and CSP origin, so no tracker loads before consent.

`pnpm verify` now reports **20 passed, 0 failed**. `pnpm gate` passes 64 unit tests. These fixes are verified deterministically; they are not a legal certification.

## Tests run

- `pnpm gate` — PASS (25 core + 35 web tests) at commit `1b38e2a`, re-run after final docs-only commit.
- `pnpm --filter @busfactor/web build` — PASS, 12 routes emitted.
- Route smoke (production): `/` 307 → `/scan`; `/scan`, `/docs`, `/privacy`, `/terms`, `/removal`, `/admin/metrics` 200; `/r/nonexistent` 404.
- Browser: Chromium headless screenshots of 10 desktop pages/states plus 2 mobile viewports, saved under `/home/shiva/tmp-audit/`.
- Browser scenario (REA): local `/scan` console/network captured — no page errors; dev-only HMR WebSocket warnings; one 404 resource (favicon, confirmed 404 locally and in production).
- Browser scenario (REA): production `/scan` network captured — 13 requests, including the analytics script; no external origins observed in this run.
- Forms: synthetic submissions only to local `/api/waitlist` (200), `/api/feedback` (200), invalid email rejected (400); synthetic rows removed afterwards. No personal data was sent to production.
- Headers: production CSP observed; `robots: { index: false, follow: false }` present in report route source.
- Not run: Lighthouse, axe, screen reader, full keyboard traversal, consent-state persistence, cross-browser matrix. Reasons: tooling/time limits and no consent UI exists to test.

## Open questions and legal review

- Who is the legal operator, where are they established, and which markets do they serve?
- Is EU/UK/other consent required for Vercel Analytics? Which privacy basis applies to raw IP rate limiting?
- What retention applies to waitlist emails and feedback entries? Who has access to the Neon database and local data files?
- Are the "24-hour removal" and "7-day snapshot deletion" promises operationally enforced today?
- Qualified counsel should review privacy, terms, cookies/consent and business identity for the relevant jurisdictions before launch. This audit does not establish legal compliance.

## Re-test checklist

- [ ] Critical findings resolved and retested (none confirmed)
- [ ] AUD-01–AUD-05 resolved or explicitly accepted by an authorised owner
- [ ] Policies match the actual data map and network behaviour
- [ ] Consent choice honoured in browser and network traces, if analytics is retained
- [ ] Core flows work with keyboard navigation
- [ ] Asset provenance and licences documented
- [ ] Production build and release smoke tests pass
