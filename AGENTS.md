# Fuzzley Games

The repository's rules live in [.agents/AGENTS.md](.agents/AGENTS.md). Read
that file before making changes. What every workspace under `frontend/` keeps
is in [frontend/AGENTS.md](frontend/AGENTS.md), and a workspace keeps rules
of its own in an `AGENTS.md` in its folder, such as
[frontend/site/AGENTS.md](frontend/site/AGENTS.md).

Reusable skills live in [.agents/skills](.agents/skills). Each subdirectory
holding a `SKILL.md` is one skill; load one when its description matches the
task. Gemini CLI reads `.agents/skills` directly. Claude Code discovers skills
only under `.claude/skills`, so `node .agents/link-claude-skills.mjs` links
them across, when `.agents/AGENTS.md` says to run it.
