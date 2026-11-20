# Seed findings (synthetic fixtures)

These scans exercise the CLI on repository fixtures owned by the project. They are not published seed reports and do not satisfy Gate A.

## clean

- Verdict: handoff-ready (100/100)
- Top findings: none
- Surprising observation: a tiny, well-documented repository scores perfectly; this is the baseline.

## mid

- Verdict: risky (68/100)
- Top findings:
  - medium: No lockfile was found. (`package.json:1`)
  - medium: zod uses an unpinned version (latest). (`package.json:1`)
  - high: No test files were found. (`README.md:1`)
- Surprising observation: removing tests and CI drops a previously runnable repository into the risky band.

## bad

- Verdict: author-only (49/100)
- Top findings:
  - high: A secret-like value is committed in .env. (`.env:1`)
  - critical: A Stripe live key was found in .env. (`.env:1`)
  - medium: No lockfile was found. (`package.json:1`)
- Surprising observation: one committed secret caps the score regardless of other dimensions.

## hostile

- Verdict: operable-with-briefing (76/100)
- Top findings:
  - high: No test files were found. (`README.md:1`)
  - medium: No CI configuration was found. (`.github/workflows:1`)
  - high: No runnable entry point or run steps were found. (`README.md:1`)
- Surprising observation: injection text in README and comments did not alter the schema or add findings.

## Gate A status

Not started. Roshan must provide 5-10 repositories with consent and post findings publicly. Record replies in `docs/validation.md`.
