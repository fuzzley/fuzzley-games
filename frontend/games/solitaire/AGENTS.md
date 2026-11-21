# Solitaire Collection

These rules hold for the `solitaire` workspace: the Solitaire Collection, many
solitaire games on one engine, drawn with Phaser in an Angular shell. Every
game's, in [frontend/games/AGENTS.md](../AGENTS.md), the frontend's, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's apply too.

- **Before adding a game or a rule variant, read the `add-solitaire-game`
  skill.** It also says which tier new code belongs in, for when lint
  refuses an import.
- **Before changing a type in the engine, read the `solitaire-types`
  skill:** how cards, piles, moves and undo are modeled.
- **Before changing how the board or its cards are drawn, read the
  `solitaire-phaser` skill,** after the repository's `phaser-core`.
- **Before changing the build, the card artwork or the atlas tool, read the
  `solitaire-build` skill.**
- **Before writing a stylesheet, read the `solitaire-styles` skill.**
- **Before writing or changing a spec, read the `solitaire-testing` skill.**
- **The game choice, the rule options and the game in play are stored bare,
  with no version, through `LocalStorageService` alone,** not through
  `storedSignal()` and `keepSaved()` as every game's rules ask. Those read
  an entry with no version as none, so one moved onto them first reads or
  rewrites the bare entry, as `RecentGamesService` and
  `PresentationSettingsService` do, or every player loses what they had
  stored.
