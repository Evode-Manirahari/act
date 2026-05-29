# ACT Agent Instructions

Read `CLAUDE.md` first. It is the canonical project context for ACT.

## GBrain

GBrain is installed for this ACT agent.

- Codex MCP server: `gbrain`
- Command: `/Users/evodemanirahari/.bun/bin/gbrain serve`
- ACT source id: `gstack-code-act-b3325446`
- Repo policy: `read-write`
- Worktree pin: `.gbrain-source` (ignored by git)

Use gbrain before broad manual search when the request is semantic or symbol-based:

- `gbrain search "<terms>"`
- `gbrain query "<question>"`
- `gbrain code-def <symbol>`
- `gbrain code-refs <symbol>`
- `gbrain code-callers <symbol>`
- `gbrain code-callees <symbol>`

Use `rg` for exact strings, regexes, and file globs.
