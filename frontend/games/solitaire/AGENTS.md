# Solitaire Collection

These rules hold for the `solitaire` workspace: the Solitaire Collection, many
solitaire games on one engine, drawn with Phaser in an Angular shell. Every
game's, in [frontend/games/AGENTS.md](../AGENTS.md), the frontend's, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's apply too.

- **Before adding a game or a rule variant, read the `add-solitaire-game`
  skill.** It also says which tier new code belongs in, for when lint
  refuses an import.
- **Run `yarn build:atlas` and commit what it writes whenever a card SVG or
  the atlas tool changes:** `src/engine/render/assets/sprites/card/`,
  `tools/build-card-atlas.mjs` or `tools/card-atlas/`. The atlases the game
  ships are committed, and no check compares them with the artwork, so a
  stale one ships. Where the tool refuses a frame, a deck or a contrast,
  mend the artwork: never loosen its check to get a build through.
- **No spec sees a blurred card.** Before changing how cards are scaled,
  rounded or sampled, read `docs/card-sharpness.md`, and look at the change
  at a phone's size and pixel ratio.
- **A spec arranges the position it needs rather than playing to it,** with
  `emptyBoard()` and `relocate()` (`test/support/game_scenarios.ts`).
- **A spec of a component that reads the game, the catalog or the
  presentation builds its TestBed with `configureUiTestBed()`**
  (`test/support/ui/testbed.ts`), which stands mocks in for those services.
  A spec of one of the services themselves builds its own. Either goes
  under `// @vitest-environment jsdom`, since specs here run in Node unless
  one asks.
- **The game choice, the rule options and the game in play are stored bare,
  with no version, through `LocalStorageService` alone,** not through
  `storedSignal()` and `keepSaved()` as every game's rules ask. Those read
  an entry with no version as none, so one moved onto them first reads or
  rewrites the bare entry, as `RecentGamesService` and
  `PresentationSettingsService` do, or every player loses what they had
  stored.
