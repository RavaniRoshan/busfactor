# BusFactor Design Principles

Locked for the product application (`apps/web`). Marketing has its own editorial system.

## Intent

BusFactor is used by developers and operators deciding whether unfamiliar software can be run safely. The interface must feel calm, precise, and trustworthy. It is a workbench, not a brochure.

## Domain

Core concepts: repository, snapshot, scan, findings, evidence, score, verdict, risk, OPERATE.md, author questions, cache, job, report, admin, analytics.

## Color world

Neutral slate surfaces, blue primary for action and score, emerald for success, amber for warning, red for failure. No decorative gradients. Color communicates state, not decoration.

## Signature

Evidence chips and the operability score as the focal point. Monospace for technical identifiers; sans for prose. Every claim is cited.

## Defaults to avoid

Inter, purple/blue gradients, heavy shadows, rounded-everything, generic dashboard cards, decorative backdrops, auto-playing motion, marketing tone in product screens.

## Typography

Instrument Sans for UI and headings. JetBrains Mono for identifiers, hashes, commands, and code. Ratio 1.25 from a 14-16px body. Weight 500 for headings, 400 for body, 500 for labels. Tight tracking on display type; 1.5 line-height on body.

## Density

Medium-compact. 16px body, 14px labels, 12px metadata. 8px base unit. Tool panels at 12-16px padding; content sections at 24-32px.

## Proportions

- Page container: 92rem.
- Report workspace: 17.5rem navigation + fluid content.
- Scan form: max 48rem centered.
- Admin KPI grid: 4 columns on desktop, 2 on tablet, 1 on mobile.

## Tokens

- Radius: 0.5rem default; 0.25rem for chips; 9999px for pills.
- Borders: 1px, low-contrast. Whitespace and tonal shift before dividers.
- Surfaces stack: base, card, raised. Inputs are inset (slightly darker fill).
- Motion: 150-250ms, ease-out, reduced-motion respected. No parallax in product UI.

## States

Every interactive element has default, hover, focus-visible, disabled, loading, empty, and error states. Focus rings use the primary color at 50% opacity.

## Accessibility

WCAG 2.1 AA. Skip link, semantic headings, keyboard navigation, reduced motion, no color-only meaning, noindex on reports and admin.

## Anti-goals

- No marketing tone in product screens.
- No auto-execution of repository code.
- No fabricated metrics or demo data.
- No public shaming of repositories.
