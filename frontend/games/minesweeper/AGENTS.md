# Minesweeper

These rules hold for the `minesweeper` workspace: Minesweeper with lives, an
Angular app with no Phaser. Every game's, in
[frontend/games/AGENTS.md](../AGENTS.md), the frontend's, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's apply too.

- **Draw the field a spec needs rather than deal one,** with `fieldFrom()`
  (`src/testing/field_picture.ts`), and put it in play with `playOn()`
  (`src/testing/game.ts`), called after `render()`, since it injects the
  game.
- **A spec that ends a game calls `pauseAtEnd(0)`** (`src/testing/game.ts`),
  unless the pause is what it specs. Left alone, the result card waits
  `LOOK_MS` or more of real time.
- **Look at a layout change with a Hard field too,** which the board stands
  on end on an upright phone.
