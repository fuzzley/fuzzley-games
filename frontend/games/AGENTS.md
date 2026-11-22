# The games

These rules hold for every game under `frontend/games/`. The frontend's, in
[frontend/AGENTS.md](../AGENTS.md), and the repository's apply too.

- **A game knows nothing of the site.** Nothing in a game imports from the
  site, or the site from a game. The site copies the game's build to
  `/play/<slug>/` and adds its analytics tags there, so a game carries no
  analytics of its own, and nothing it loads may assume it sits at `/`.
- **Its `vite.config.ts` is `@fz/dev/vite`'s `gameConfig()`.** That writes
  the theme script, the icons' links, the build's stamp and `game.json`, so
  a game's `index.html` and config add none of them.
- **It wears the games' chrome and shares their helpers.** The game bar,
  breakpoints and viewport are `@fz/game-ui`'s. A game played in runs on a
  board drawn with Phaser has its `GameService` extend `RunLifecycle`,
  rather than pausing, resuming and starting runs for itself. Take a helper
  from `@fz/core` rather than keeping a copy: it is the one library a
  game's rules may import. The `fuzzley-ui` skill lists what each holds.
- **Nothing a game wraps its bar in takes a `transform`, `filter`,
  `backdrop-filter`, `contain` or container query.** Any of them holds a
  menu's fixed dismiss layer inside the wrapper, so the tap that should
  only close the menu presses the board, and no spec sees it.
- **A new feature gets a folder of its own, named for what it does,** never
  for the kind of code in it (no `services/` or `components/`).
- **In a game drawn with Phaser, work goes in the lowest layer that can
  hold it:** what a move does in the rules, what to draw (places, shapes,
  colors, timings) in the view, and the scene only draws it. The layers'
  fences are `@fz/dev/eslint`'s `phaserGameLayers()`, or `gameRules()` for
  a game without Phaser. They hold what a layer imports, not what belongs
  in it. What is the game's own goes in their options, never in a block of
  its own, and no folder inside a layer is named `view`, `scene`, `app` or
  `testing`, which the fences match anywhere in a path.
- **Before writing or changing a scene, read the `phaser-core` skill.** It
  has what a scene lets go of as it ends, since the host's one game
  outlives every scene, and how one hears the keys.
- **Saved games outlive the code.** What a game stores goes through
  `@fz/ui/storage`: settings and records as a `storedSignal()`, a game
  under way with `keepSaved()`. State a change adds to a game in play joins
  what the game saves, and its saved-game spec, or is left out on purpose:
  nothing fails for one left out, and it is reset when a run is taken up
  after a reload. A field added to a stored entry is read as optional, with
  a default. Any other change of shape takes a new version
  (`writeVersioned()`), which drops what every player stored under the old
  one, and a reader drops an entry it can't trust rather than failing. A
  `tools/` script that stores an entry by hand, as a layout check's does,
  changes with it.
- **A color the player must tell from what it lies on joins the game's
  `contrast.spec.ts`,** which holds each pair it lists to its ratio in
  every palette. The list is kept by hand, so a new color it doesn't name
  is checked in none.
- **A change to a game's layout is checked in a browser,** since jsdom lays
  nothing out. `check:layout` opens the game's build in headless Chrome at
  each shape a game takes, and `yarn verify:changed` runs it after the
  build. Run alone, it checks `dist/` as last built, so build first.
  Minesweeper and the Solitaire Collection have none: look at their pages
  yourself, roomy, as a phone held upright and as one on its side.
- **Retake the screenshots with `--force` after a change every image
  should show, such as a palette or a font.** Without it, a retake
  keeps any image in which no pixel moved by more than
  `UNCHANGED_LEVELS` (`@fz/dev/screenshots`), so a change that faint
  everywhere keeps every old image.
- **A new game starts as a copy of one:** Minesweeper, or Snake for a board
  drawn with Phaser. Search the repository for the copied game's name to
  find every place that lists the games, the site's `games.json` and
  catalog among them, and give its dev server the next port after the
  highest in use. A copy of Minesweeper gains a `check:layout`, starting
  from Sudoku's `sudoku/tools/check-layout.mjs`. It gets an `AGENTS.md`,
  with a `CLAUDE.md` beside it, only once it has a rule or a skill of its
  own.
