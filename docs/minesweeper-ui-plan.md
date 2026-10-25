# Plan: Minesweeper in the shared look

Proposed 2026-10-25, not yet agreed: the decisions at the end wait on the
user. This plan moves Minesweeper onto `@fz/style`, the style library the
site and the Solitaire Collection already share
([the shared UI plan](shared-ui-plan.md)), so it takes the player's palette
and the same bar, buttons and dialogs. Nothing in Minesweeper changes until
the plan is agreed.

## Where things start

Minesweeper was written in 2016 and is kept as it was written
(`frontend/games/minesweeper/AGENTS.md`):

- **Markup:** `index.html` holds the whole page: a Bootstrap panel with
  Restart and New Game, and the lives and mines found in disabled number
  fields; the board; and a settings overlay, a fixed `<div>` that Knockout
  shows while no game is running.
- **Styles:** five stylesheets in `public/content/`, loaded by `<link>`:
  Bootstrap 3, its theme and the Flatly theme (about 14,000 lines between
  them), `Site.css`, and the game's own `fMinesweeper.css`, which paints the
  board in fixed blues and a red for a mine.
- **Scripts:** jQuery 1.10, Bootstrap's script, Respond, Knockout 3.4, Lodash,
  Moment and Modernizr load as classic scripts from `public/vendor/`. Vite
  bundles `src/main.js` and the game's modules under `src/fMinesweeper/`.
  The game uses jQuery, Knockout and Lodash; nothing calls Bootstrap's
  script, Respond, Moment or Modernizr.
- **Questions and results:** Restart and New Game ask with the browser's
  `confirm()` (`src/main.js`); a win or a loss is an `alert()`
  (`src/fMinesweeper/Board.js`).
- **Play:** a left click reveals a cell and a right click marks a guess, on
  `<div>` cells with no roles. There is no keyboard or touch play.
- **Checks:** ESLint over the build config; no tests, no style lint, and
  Prettier skips `index.html`, `public/` and `src/`.
- **Stored:** the settings and statistics, under `fMinesweeper.Settings`
  and `fMinesweeper.Statistics`, which stay as they are.

## What it takes from the libraries

Only `@fz/style`: `@fz/ui` and `@fz/game-ui` are Angular components, and
Minesweeper has no Angular. From it:

- `theme.js`, through `fuzzleyStyle()` in its Vite config, so the page wears
  the palette the player chose, on the site or in another game;
- the global stylesheet, `@fz/style/global`: the tokens, Figtree, the reset,
  the document styles and the fragments;
- the fragments, in plain markup: `.fz-button` and its tones, `.fz-badge`,
  `.fz-visually-hidden`;
- the Sass toolkit, for the game's own stylesheet: `fz.glass()`,
  `fz.icon-button()`, `fz.tap-target`, `fz.transition()`;
- the surfaces, which make a hand-written bar and dialog a few
  declarations each: `--fz-bar-glass`, `--fz-panel-glass`, `--fz-float`,
  `--fz-well`;
- the stylelint preset, for the stylesheets it gains.

What the Angular apps get as components, Minesweeper writes by hand, in the
same markup and look:

- **The bar**, as `<fz-game-bar>` lays it out: the link home, the game's
  name, the status (lives left, mines found), and the actions (Restart,
  New Game). The wordmark is text in Figtree, as `<fz-wordmark>` renders
  it.
- **The dialogs**, on a native `<dialog>` opened with `showModal()`, as
  `<fz-dialog>` does: the settings, the confirmation in
  `<fz-confirm-dialog>`'s card and buttons, and the result of a game.

## Phases

### Phase M0: the mock (small; first)

Minesweeper in the shared look, built with the real tokens, in Emerald felt
and Classic felt, on a wide screen and an upright and a sideways phone: the
bar, the board mid-game, the settings dialog, the confirmation and a result.
It settles the board's colors (decision 3) and where the bar stands on a
phone. Nothing is built until the user approves it.

### Phase M1: plumbing (small, nearly invisible)

- Depend on `@fz/style`, Sass and stylelint, and add `fuzzleyStyle()` to
  `vite.config.js`.
- Load `theme.js` first in `index.html`, with a plain tag.
- Add the game's stylesheet, `src/styles/main.scss`, loaded from
  `src/main.js`, which takes only `@fz/style/tokens` for now.
- **Verify:** screenshots before and after. The palette's `color-scheme`
  is the one difference expected, which darkens the number fields'
  native look in a dark palette.

### Phase M2: Bootstrap out, the shared look in (large, visible)

- Load `@fz/style/global` in place of the five stylesheets.
- Rewrite `index.html`'s markup with the fragments, keeping every
  `data-bind`. Its readouts become text rather than disabled fields.
- Move `fMinesweeper.css` into `src/styles/`, with the board's colors from
  palette roles, as the mock settles them.
- The settings overlay becomes a `<dialog>`; `confirm()` and `alert()` give
  way to dialogs. The two `alert()`s are in `src/fMinesweeper/Board.js`,
  which otherwise stays as written: it hands the result to the page, which
  shows it.
- Drop what nothing uses: Bootstrap's script and stylesheets, Respond,
  Moment, Modernizr and the Glyphicons font.
- **Verify:** play a game to a win and to a loss, restart, and change the
  settings, in a light and a dark palette; the contrast spec (decision 4).

### Phase M3: the bar (medium, visible)

- Replace the panel with the bar, as the mock shows it, in its own
  stylesheet from the surfaces and the toolkit.
- **Verify:** as for M2, at every width the mock covers.

### Phase M4: screenshots and docs (small)

- Retake `public/docs/screenshots/minesweeper/`, the thumbnail and preview
  the site's catalog shows.
- Rewrite Minesweeper's `AGENTS.md` for its stylesheets and the library,
  and add it to the `fuzzley-ui` skill's worked examples.
- Narrow `.prettierignore` to the 2016 code (decision 6).

## Decisions

Each waits on the user; the first option is the recommendation.

1. **Bootstrap 3 goes, in one step (M2),** rather than living beside the
   library for a while. Its rules sit in no cascade layer, so they would beat
   every one of `@fz/style`'s, the reset included, and a page with both looks
   like neither.
2. **The bar and the dialogs are written by hand** in Minesweeper, in the
   Angular components' markup and look, rather than moving those looks into
   `@fz/style` as fragments the components also wear. With the surfaces it
   is a few dozen lines, and it leaves Solitaire untouched; when a second
   game without Angular arrives, the shared fragment pays for itself, and
   is worth its own pixel-identical proof against Solitaire.
3. **The board wears the palette**: hidden and revealed cells, a mine and a
   guess from the palette's roles, rather than today's fixed blues in every
   palette. The mock decides which roles.
4. **Vitest for one spec,** holding the board's numbers and marks to 4.5:1
   on their cells in every palette, as the repository asks of text on a
   surface. The alternative is checking them by eye, once.
5. **Keyboard and screen-reader play of the board gets a plan of its
   own**, after this one: a grid with roles, arrow keys and a key to mark a
   guess, and a long press on a phone. It changes the 2016 game code, which
   this plan leaves alone.
6. **Prettier and stylelint cover what this plan writes** (the markup and
   `src/styles/`), while `src/fMinesweeper/` and the vendored scripts stay
   as written.
7. **Shipping:** M1 alone, then M2 to M4 together, after the mock.

## Risks

- **No tests.** Until the plan adds one, a broken binding shows only in play,
  so each phase is played through, not only built.
- **Knockout binds by markup.** Rewriting `index.html` can drop a binding
  silently; the rewrite keeps every `data-bind`, and M2's check plays every
  control.
- **The page grows by Figtree** and shrinks by Bootstrap: about 14,000 lines
  of CSS and two scripts go.
- **A palette picked here changes the site and Solitaire**, and the reverse,
  as it already does between those two. That is the intent, and new for
  Minesweeper's players.

## Not in this plan

- Keyboard, screen-reader and touch play of the board (decision 5).
- Rewriting the game in TypeScript or Angular, or dropping jQuery, Knockout
  or Lodash.
- Changing the stored settings or statistics.
