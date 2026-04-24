# AGENTS

## Coding Tasks
Use Garry Tan's gstack workflow for AI-assisted coding work in this repository.

1. Install gstack:
   - `git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.codex/skills/gstack && cd ~/.codex/skills/gstack && ./setup --host codex`
2. For coding sessions in this repo, load gstack and use the matching specialist skill:
   - Security audit: `Load gstack. Run /cso`
   - Code review: `Load gstack. Run /review`
   - Browser QA for a URL: `Load gstack. Run /qa https://...`
   - Build end-to-end: `Load gstack. Run /autoplan, implement the plan, then run /ship`
   - Plan only: `Load gstack. Run /office-hours then /autoplan. Save the plan, don't implement.`

## Browser policy
When browser automation or visual validation is needed, prefer gstack `/browse` or `/qa` workflows.
