# Verification harness

Run the full local verification suite:

```bash
pnpm verify
```

This builds the engine and web app, starts a clean production server on port 3100, and runs four Playwright suites:

| Suite | Tool | Proves |
| --- | --- | --- |
| `functional.spec.ts` | Playwright Test + APIRequestContext | redirects, forms, report views, noindex, download routes, auth gate, security headers, cache-hit job persistence |
| `accessibility.spec.ts` | `@axe-core/playwright` (axe-core / MPL-2.0) in real Chromium | WCAG 2.0/2.1 A+AA violations including computed colour contrast |
| `layout.spec.ts` | `overflowlint/playwright` (MIT) | baseline-free overflow, clipping, overlap and covered-interactive detection at 1280×900 and 390×844 |
| `network.spec.ts` | Playwright network/storage capture | automatic tracker requests, non-essential cookies/localStorage, theme preference persistence |

## Rules

- **No LLM assigns pass/fail or severity in this harness.** All gates are deterministic. The LLM may explain a failing result; it may not grade it.
- Synthetic form data only. Test rows are removed in `afterAll`; no personal data is sent to production.
- The visually hidden skip link (`a.sr-only`) is marked `data-ol-ignore` before geometry scans — it is intentionally off-screen at (-1,-1) and is a known false positive for `interactive-covered`.
- Playwright's bundled Chromium is used, not the system snap wrapper (`/usr/bin/chromium-browser`), because the wrapper changes host settings and Playwright documents non-bundled browsers as unsupported.
- `BASE_URL` can point the suite at a deployed URL; otherwise the harness starts its own server.

## Known limits

- axe-core finds roughly 57% of WCAG issues automatically; colour contrast over gradients/images may be reported as "incomplete". Keyboard focus order, focus visibility, alt-text quality and screen-reader output still need human review.
- OverflowLint does not traverse iframes or closed shadow roots and is a development aid, not a visual approval.
- Pixel/visual snapshot testing is deliberately not a gate here: baselines are environment-fragile (OS, fonts, browser version, power source, headless mode).
- The harness verifies technical consent behaviour (a tracker request before consent), not the legal validity of consent wording or jurisdiction-specific rules.
