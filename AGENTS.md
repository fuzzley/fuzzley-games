# Fuzzley Games

Project guidelines, architecture, development workflow, and coding standards
live in [.agents/AGENTS.md](.agents/AGENTS.md). Read that file before making
changes. What every workspace under `frontend/` keeps is in
[frontend/AGENTS.md](frontend/AGENTS.md), and each keeps its own rules in an
`AGENTS.md` of its own, such as [frontend/site/AGENTS.md](frontend/site/AGENTS.md).

Reusable skills live in [.agents/skills](.agents/skills). Each subdirectory
holding a `SKILL.md` is one skill; load one when its description matches the
task. Gemini CLI reads `.agents/skills` directly. Claude Code discovers skills
only under `.claude/skills`, so run `node .agents/link-claude-skills.mjs` once
per clone to link them across.
