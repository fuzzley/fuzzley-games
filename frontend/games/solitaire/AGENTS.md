# fSolitaire

Project guidelines, architecture, development workflow, and coding standards
live in [.agents/AGENTS.md](.agents/AGENTS.md). Read that file before making
changes.

Reusable skills live in [.agents/skills](.agents/skills). Each subdirectory
holding a `SKILL.md` is one skill; load one when its description matches the
task. Gemini CLI reads `.agents/skills` directly. Claude Code discovers skills
only under `.claude/skills`, so run `yarn skills:link` once per clone to link
them across.
