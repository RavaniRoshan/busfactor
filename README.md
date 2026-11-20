# BusFactor

Could someone who didn't write this safely run it?

BusFactor scans a repository and returns an operability verdict, a risk map, an `OPERATE.md`, and questions only the original author can answer. Every claim cites a file and line.

## Quickstart

```bash
npx busfactor scan ./my-repo
```

Or scan a public GitHub repository:

```bash
npx busfactor scan https://github.com/owner/repo
```

## CLI

```bash
busfactor scan <path|url> --out <dir> --format md,json --fail-under <score>
```

Exit codes: `0` success, `2` when `--fail-under` is missed, `1` on error.

## Scoring

Seven dimensions, 100 points. Code computes the score; the LLM explains and drafts. The rubric is public and versioned.

## MCP server

```bash
node packages/mcp/dist/index.js
```

Tools: `scan_repo`, `get_report`, `generate_operate_md`.

## Claude Code skill

See `skills/handoff/SKILL.md`.

## Limits

- 5,000 files or 25 MB per scan.
- Public GitHub URLs or local paths.
- No repository code is executed.
- Source snapshots are deleted after 7 days.

## License

TBD
EOF