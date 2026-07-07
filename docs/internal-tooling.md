# Internal tooling (AI workflow)

Machine/agent configuration that used to live in the README. Not pitch-facing —
this is for contributors and coding agents working in this repo.

## AI workflow helper (gstack)

This repo standardizes on [garrytan/gstack](https://github.com/garrytan/gstack) as the default AI workflow helper for planning, implementation, review, and QA.

### Local install (one-time)

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup
```

### Team usage in this project

- Start product discovery with `/office-hours` + `/plan-ceo-review`
- Validate implementation with `/plan-eng-review` before coding
- Run `/review` before opening a PR
- Run `/qa` against the changed experience before merge
- Run `/ship` when ready to push and open PRs

## ACT agent memory (gbrain)

This repo is wired for [garrytan/gbrain](https://github.com/garrytan/gbrain) in the ACT agent context.

- Codex MCP server: `gbrain`
- Command: `/Users/evodemanirahari/.bun/bin/gbrain serve`
- ACT source id: `gstack-code-act-b3325446`
- Repo policy: `read-write`
- Worktree pin: `.gbrain-source` (ignored by git)

Use gbrain for semantic or symbol-based questions:

```bash
gbrain search "<terms>"
gbrain query "<question>"
gbrain code-def <symbol>
gbrain code-refs <symbol>
gbrain code-callers <symbol>
gbrain code-callees <symbol>
```

Use `rg` for exact strings, regexes, file globs, and small local checks.
