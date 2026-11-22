# Parking

Items deferred by the scope guard. Nothing here is built until the relevant gate allows it.

## Deferred / gated (do not execute before gates/human evidence)

- [ ] **Gate A/B validation (human-owned).** Publish 5–10 consented seed reports; collect 5 stranger scan requests; interview 5 external users. Use real events for measurement; do not treat synthetic fixtures as evidence.
- [ ] **CLI publication (human-gated).** Verify package metadata, `npm pack` contents, clean install, Node 20/24 compatibility, and `npx busfactor --version` from tarball. Requires operator npm auth; only after published package installs/scans successfully add `npx busfactor` primary claim to marketing.
- [ ] **Accounts, report history, scheduled scans, team features.** Defer until Gate B shows retention demand. Requires auth provider and new data model; do not smuggle into anonymous flow.
- [ ] **Billing (Polar/Razorpay/Paddle), subscriptions, webhooks, invoices, entitlements.** Defer until real willingness-to-pay is measured. Dashboard Revenue stays “Not enabled” until then. Never trust client-side plan flags.
- [ ] **Content/SEO program.** Six long-form articles/blog routing is a separate subsystem; plan separately after landing-page conversion work.
- [ ] **Domain migration (`app.` / `docs.` subdomains).** Env-driven URLs make it possible later; do not change canonical URLs/DNS/SSL/GitHub Pages base paths without redirect and deployment plan.
- [ ] **Error monitoring (Sentry or equivalent).** Decide after reviewing real Vercel function logs; avoid overlapping analytics products.
- [ ] **Session recordings.** Require separate privacy review and explicit consent.
- [ ] **Search Console and launch SEO checks (human-owned).** Submit sitemap, verify indexing/canonical/OG/Twitter/mobile/broken links against deployed marketing site.
- [ ] **Launch assets and distribution (human-owned).** Demo video, real report screenshots, Product Hunt gallery, Show HN/Reddit/X/LinkedIn posts, direct outreach. No named scores without consent; no coverage/signups treated as revenue validation.

## Earlier parked items

- [ ] Full Next.js web surface — parked at P0.1; P1.8 was gated by Gate A (superseded by explicit overrides recorded in DECISIONS/STATE; keep Gate A unvalidated).
