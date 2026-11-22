# Snake

These rules hold for Snake, a game whose board is drawn with Phaser. The
games', in [frontend/games/AGENTS.md](../AGENTS.md), the frontend's and the
repository's apply too.

- **A spec that plays a run to its end provides `provideFixedSeed()`**
  (`src/testing/play.ts`). A run is seeded from `Math.random` otherwise,
  and a run lost heading right then eats a second apple about one time in
  70, so the spec fails that often and passes when it is run again.
- **Draw the run a spec needs rather than play to it,** with `runFrom()`
  (`src/testing/run_picture.ts`), and assert on the picture `pictureOf()`
  draws back. `src/testing/play.ts` has the games already played out:
  `playToTheEnd()`, `endedGame()` and `wonGame()`.
- **Rendering takes up no saved run.** Only `src/main.ts` injects
  `SavedGameService`, so a spec of a run taken up injects it itself.
