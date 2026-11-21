# Brick Breaker

These rules are Brick Breaker's own. Every game's, in
[frontend/games/AGENTS.md](../AGENTS.md), the frontend's, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's apply too.

- **Before adding or changing a level, a set of levels, a place, a capsule,
  a kind of effect, a ball kind, a brick kind or a brick trait, read the
  `brick-breaker-content` skill.** Some of what each takes no check asks
  for, such as a redrawn level's `layout`, and a level that holds its ball
  out of the paddle's reach, which only `yarn report:levels` shows.
- **Before writing or running a spec, read the `brick-breaker-testing`
  skill.** A spec's folder sets which of three Vitest projects runs it, and
  what only the specs that play every level reach counts as uncovered.
