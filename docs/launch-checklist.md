# Launch checklist (external steps)

## 1. Publish the CLI and engine

```bash
npm login
cd packages/core && npm publish
cd ../cli && npm publish
```

Then verify:

```bash
npx busfactor --version
npx busfactor scan fixtures/repos/clean
```

## 2. Deploy the web app

Install Vercel CLI and deploy:

```bash
npm i -g vercel
cd apps/web
vercel
```

Set environment variables in Vercel:

- `BUSFACTOR_ADMIN_TOKEN`
- `BUSFACTOR_DAILY_SPEND_CAP_USD`
- `BUSFACTOR_KILL_SWITCH`
- `ANTHROPIC_API_KEY` (optional; enables live LLM passes)

## 3. Seed public reports

For each consented repository:

```bash
busfactor scan <repo-url> --out reports/<name>
```

Publish the report URL and record it in `docs/validation.md`.

## 4. Measure production metrics

Run at least 10 live scans and record:

- `scan_p50_s`
- `cost_per_scan_usd`
- citation drop rate
- gold-set agreement

Update `STATE.md` with the measured values.

## 5. Gate A demand test

Post one cited finding per seed repository on X and LinkedIn. Record replies and scan requests in `docs/validation.md`. Pass requires at least 5 strangers asking to scan their own repository.

## 6. Post-launch

After 7 days, run `P3.0` to reorder V2 work from real feedback.
EOF