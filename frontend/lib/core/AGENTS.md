# @fz/core

These rules hold for `@fz/core`, the small helpers the games share, with no
framework and no platform, so a game's rules may import them. The
frontend's, in [frontend/AGENTS.md](../../AGENTS.md), and the repository's
apply too.

- **`src/math.ts` and `src/sweep.ts` keep to arithmetic every engine rounds
  alike:** `+`, `-`, `*`, `/` and the functions of `Math` whose every digit
  the standard fixes, which `EXACT_MATH` lists in `../dev/src/eslint.ts`.
  Never `**`, `Math.hypot()` or another. Brick Fuzz Pop's rules call both,
  and Rickashay's `src/math.ts`, and their replays must meet in one browser
  what they met in another. Lint holds those games' own files to this
  (`phaserGameLayers({ exact })`) and nothing holds these two. A helper
  their rules come to call owes the same.
- **A failing pin in `src/random.spec.ts` or `src/sweep.spec.ts` means the
  change is wrong, not the pin.** Saved games, screenshots and replays keep
  to the numbers a seed gives and the shares a sweep gives. What must give
  others is a new function, not an edit.
