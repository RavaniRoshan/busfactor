# Decisions

## 2026-11-20 — P2.4 (override)

- Decision: Implement the MCP server and handoff skill ahead of Gate A at the user's request.
- Branch taken: Manual JSON-RPC stdio server instead of adding an MCP SDK dependency; skill points at the local CLI build until publication.
- Why: The user explicitly asked for MCP and skill support. Gate A remains unvalidated, so this is an override, not gate completion.
- Scope: `packages/mcp` and `skills/handoff/SKILL.md`.


## 2026-11-20 — P1.7

- Decision: Implement the CLI as a thin wrapper over `scanTarget`, write Markdown, JSON, OPERATE.md, and author questions, and use exit code 2 for `--fail-under`.
- Branch taken: Build core and CLI to `dist` before typechecking, because the CLI imports the compiled package.
- Why: This keeps the CLI free of analysis logic and makes the engine reusable by the future web, skill, and MCP surfaces.
- Gate: P1.7 passes. Gate A remains human-controlled and is not started.


## 2026-11-20 — P0.1

- Decision: Use a pnpm workspace with `packages/core`, `packages/cli`, and an `apps/web` shell.
- Branch taken: Corepack path, because `pnpm` was not installed but Corepack was available.
- Why: The PDR calls for a TypeScript pnpm monorepo and one engine library shared by all surfaces. Activating pnpm 10.15.0 through the installed Node avoids changing the system package manager.
- Alternatives rejected: npm workspaces (would diverge from the documented commands); installing pnpm globally with npm (unnecessary global mutation).
- Environment note: No `ANTHROPIC_API_KEY` is present. Live LLM gates are marked `stale`; implementation will use the mock provider until a key is available.
- Scope note: `apps/web` is intentionally only a typed shell at P0.1. The web surface belongs to P1.8 and remains gated by Gate A.
