# Rickashay

These rules hold for the `rickashay` workspace: Rickashay, its field drawn
with Phaser in an Angular shell, on `@fz/brick-wall` as Brick Fuzz Pop is.
Every game's, in [frontend/games/AGENTS.md](../AGENTS.md), the frontend's,
in [frontend/AGENTS.md](../../AGENTS.md), and the repository's apply too.

- **Before writing or changing a spec, read the `rickashay-testing` skill.**
  It has the three Vitest projects and what runs in each, the helpers that
  draw a wall and fly a shot at it, what the certificates, the marks and
  the checks hold, and the mutation pass a change to the rules or the view
  ends with. What every wall game's specs share is the library's
  [`brick-wall-testing`](../../lib/brick-wall/.agents/skills/brick-wall-testing/SKILL.md)
  skill it links to.
- **Before adding or redrawing a level, adding a set, or bringing in a kind
  of brick or a trait, read the `rickashay-content` skill.** It has the
  files each takes, the order they land in and the checks that hold each.
- **No floor, ceiling or check is eased to let a level pass.** They are
  the design's, and a level that falls short of one is redrawn, as the
  `rickashay-content` skill's "Redrawing a Level" says.
