# Brick Fuzz Pop

These rules hold for the `brick-fuzz-pop` workspace: Brick Fuzz Pop, its
field drawn with Phaser in an Angular shell. Every game's, in
[frontend/games/AGENTS.md](../AGENTS.md), the frontend's, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's apply too.

- **Before writing or changing a spec, read the `brick-fuzz-pop-testing`
  skill.** It has the three Vitest projects and what runs in each, the
  helpers that draw a wall and fly a shot at it, and the mutation pass
  every change here ends with.
- **Read it too before running `yarn certify:levels` because a replay
  failed.** The failure's message says to certify again, which makes the
  replay pass whatever broke it. Where the change wasn't meant to change
  how a shot plays, the failed replay is the bug.
- **Before adding a level, a set, a brick kind or a brick trait, read the
  `brick-fuzz-pop-content` skill.** It has the files each takes, the order
  they land in and the checks that hold each.
- **Keep the first download to what every page shows.** A piece a page may
  never show loads with `onDemand()` (`src/app/on_demand.ts`), not `@defer`,
  whose runtime costs the main chunk about 6 kB. The shell takes nothing by
  value from `src/view/art/` or `src/view/steering/steering.ts`, which only
  the scene's chunk carries: what it needs of them stands in a file apart,
  as `src/view/colors/brick_colors.ts` does. No check weighs a chunk, so an
  import that breaks this passes them all.
