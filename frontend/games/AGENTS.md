# The games

`frontend/games/`: the games built here, one workspace each, named after its
folder: the Solitaire Collection (`solitaire/`), Minesweeper
(`minesweeper/`), Sudoku (`sudoku/`) and Snake (`snake/`). These rules
hold for every game.
The frontend's, in [frontend/AGENTS.md](../AGENTS.md), and the repository's
apply too, and each game keeps its own in its folder's `AGENTS.md`. Paths
are relative to `frontend/games/`.

## What every game keeps

- **It knows nothing of the site.** Nothing in a game imports from the
  site, or the site from a game, even when both use the same library. The
  site copies the game's build to `/play/<slug>/` and adds its analytics
  tags there, so a game carries no analytics of its own.
- **Its `vite.config.ts` is `@fz/dev/vite`'s `gameConfig()`**, given its
  port, its name and, for a collection, its catalog, with what is the
  game's own merged in. The build has a relative base, so it plays from any
  folder, and writes `dist/` with `index.html` at its top, its files in
  `assets/`, and `game.json`, which says what it holds: its name, and for a
  collection the `id` and `name` of every game it opens. The site's build
  fails when its catalog calls a game anything else, or links an id the
  build doesn't open. Its dev server swaps an edited component's template
  or styles into the running page, which needs the `rootDir` `@fz/dev`'s
  tsconfig gives it (`frontend/lib/dev/AGENTS.md`).
- **Its dev server has a port of its own,** which its screenshot script
  defaults to: 9000 is the Solitaire Collection's, 9001 Minesweeper's,
  9002 Sudoku's and 9003 Snake's, so the next game takes 9004. The root's `yarn dev:all`
  runs it on one after the site's instead, at `/play/<slug>/`, which the
  site's dev server serves, so nothing the game loads may assume it sits at
  `/`.
- **Its layout can be checked in a browser,** which jsdom can't: a
  `check:layout` script on `@fz/dev/layout` opens its build at each shape a
  game takes and fails on an error, a page that scrolls, or what its own
  inspection of the page finds. The root's `yarn check:layout` runs every
  game's that has one, and CI runs it after the build; Sudoku's
  `tools/check-layout.mjs` is one to start from, and Snake's one for a
  board drawn with Phaser.
- **Its screenshots are the site's.** `public/docs/screenshots/<id>/` holds
  the `thumb.webp` and `preview.webp` the site's catalog shows of each game
  it opens, written from a capture by `@fz/dev/screenshots`'s
  `writeSiteImages()`, and a preview is the link preview image in its
  `index.html`.
- **It shares the palette with the site.** `index.html` loads `theme.js`
  first, which `@fz/style`'s Vite plugin writes (`gameConfig()` adds it):
  it puts the palette the player chose, on the site or in any game, on the
  page as `data-theme` before anything paints. `ThemeService` from
  `@fz/ui/theme` takes it from there, and the game's settings offer the
  choice.
- **It wears the games' chrome.** `@fz/game-ui`'s game bar, breakpoints and
  viewport frame every game alike and change its shape at the same widths
  (`frontend/lib/game-ui/AGENTS.md`).
- **Its rules share `@fz/core`'s helpers,** the seeded random, the readers
  for stored JSON and counts in words, rather than keeping copies
  (`frontend/lib/core/AGENTS.md`). It is the one library a game's rules may
  import.
- **Saved games outlive the code.** What a game stores goes through
  `@fz/ui/storage`'s `LocalStorageService`, under keys its `AGENTS.md`
  lists. Renaming a key loses what players saved, and a build reads what the
  last one stored: an entry whose shape changes carries a version
  (`writeVersioned()`), and a reader drops one it can't trust rather than
  failing.

## Adding a game

1. **A workspace:** a folder here, named for the game, with a
   `package.json` of the same name, private, listing everything it imports
   or runs (`@fz/dev` and the libraries as `workspace:*`) and the `lint`,
   `typecheck`, `test` and `build` scripts the constraints require.
   Minesweeper is the one to copy.
2. **Its configs from `@fz/dev`'s presets:** `vite.config.ts` is
   `gameConfig({ port, name })`, `vitest.config.ts` is `angularTests()`,
   `eslint.config.js` is the blocks, and `tsconfig.json` extends
   `@fz/dev/tsconfig/angular.json` (`frontend/lib/dev/AGENTS.md`).
3. **Its screenshots,** from a script on `@fz/dev/chrome` and
   `@fz/dev/screenshots`, as Minesweeper's `tools/capture-screenshots.mjs`
   is.
4. **Its instructions:** an `AGENTS.md` for what is its own, with a
   `CLAUDE.md` beside it that imports it (`@AGENTS.md`), and any skills of
   its own in its `.agents/skills/`, their names starting with its own
   (`minesweeper-testing`). The repository's and the frontend's `AGENTS.md`
   name it where they list the games.
5. **The site:** `yarn install` from `frontend/`, then the game's build in
   `frontend/site/games.json` (`"<slug>": { "workspace": "games/<folder>" }`)
   and its entry in the site's catalog,
   `frontend/site/src/app/provider/games.ts`, with
   `play: { build: "<slug>" }` and the name its `game.json` gives it.
   `docs/operations.md` covers the rest of the pipeline.
