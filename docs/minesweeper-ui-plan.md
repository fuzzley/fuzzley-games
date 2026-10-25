# Plan: Minesweeper as an Angular app on the shared libraries

Agreed 2026-10-25: the user took every recommendation ("Yes proceed"), and
the M0 mock still waits on their approval. This plan rebuilds Minesweeper as an Angular app, shaped like the
Solitaire Collection's shell, on all three shared libraries
([the shared UI plan](shared-ui-plan.md)): `@fz/style` for the look,
`@fz/ui` for the dialogs, confirmation, theme, icons and storage, and
`@fz/game-ui` for the game bar. The look and the controls change freely; what
stays is the game: Minesweeper with lives.

It replaces the earlier plan of the same day, which kept the 2016 code and
took only `@fz/style`. That plan is in git history
(`git show d1b77db:docs/minesweeper-ui-plan.md`). Nothing in Minesweeper
changes until the M0 mock is approved.

## Where things start

Minesweeper is 636 lines of JavaScript from 2016, under
`frontend/games/minesweeper/`:

- **The page:** `index.html` holds a Bootstrap 3 panel with Restart and New
  Game, and the lives and mines found in disabled number fields; the board,
  as rows of `<div>`s; and a settings overlay (rows, columns, lives) that
  Knockout shows whenever no game is running, at load too.
- **The code:** jQuery builds the board, and each cell keeps its state in the
  DOM, as classes and hidden text (`src/fMinesweeper/Cell.js`). Knockout binds
  the panel and the settings. Lodash finds a cell's neighbors.
- **The rules, as built:**
  - a quarter of the cells hold mines, placed when Start is pressed, so the
    first click can hit one;
  - a mine costs a life and stays shown, and the game ends when the lives run
    out;
  - a left click reveals a cell, and a blank one reveals its neighbors; a
    double-click on a number reveals its unflagged neighbors once the flags
    and revealed mines around it match it; a right click flags a cell;
  - a flagged cell still reveals on a left click;
  - "Mines found" counts flags and revealed mines, right or wrong;
  - the win check adds revealed cells to the mines found, so a revealed mine
    counts twice and a wrong flag counts as a mine: a game can be won with
    cells still hidden;
  - Restart replays the same mines; New Game shows the settings;
  - the settings take any number (0 rows, 1,000 columns);
  - a win or a loss is an `alert()`, and Restart and New Game ask with
    `confirm()`.
- **Stored: nothing.** `Settings.js` and `Statistics.js` name
  `localStorage` keys but never write them (`toJSON` returns nothing), so
  there are no players' saves to carry over. The workspace's `AGENTS.md` is
  wrong to say there are.
- **Weight:** about 158 kB gzipped: 111 kB of scripts (jQuery, Knockout,
  Lodash, Moment, Bootstrap's script, Respond, Modernizr, of which the game
  uses the first three) and 46 kB of Bootstrap's three stylesheets.
- **Play:** a mouse only. There is no keyboard, touch or screen reader play.
- **Checks:** ESLint over the Vite config; no specs; Prettier skips the rest.
- **The site** lists it in Classics and shows
  `public/docs/screenshots/minesweeper/`'s thumbnail and preview.

## The approach

A rewrite, not a port. The rules live in the DOM today, so there is nothing
for Angular to wrap: they are written again in TypeScript, without a
framework, and the page as an Angular app around them.

- **Angular as the Solitaire Collection uses it:** Angular 22.2, standalone
  components, signals, zoneless change detection, built by Vite through
  Analog's plugin. The versions are Solitaire's, which `yarn constraints`
  requires.
- **Two halves:** `src/game/`, the rules, with no Angular and no DOM, so
  specs drive them directly; and `src/app/`, the shell, which holds the game
  in signals and draws it. An ESLint rule keeps `src/game/` from importing
  Angular or the shell.
- **The board is the DOM:** a CSS grid of cells, at most 900 of them, which
  Angular draws well and screen readers can walk. No canvas.
- **The 2016 code goes.** The rules are rewritten from it, fixed where
  decision 1 says, and git history keeps it.

## What it takes from the libraries

Everything that fits a game without a card table:

| Need                                       | Piece                                                                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The player's palette, before paint         | `fuzzleyStyle()` from `@fz/style/vite`, and `theme.js` first in `index.html`                                                                                                                |
| Tokens, Figtree, reset, fragments          | `@use "@fz/style/global"` in `src/app/styles/global.scss`                                                                                                                                   |
| Colors, space, type, motion                | Palette roles and tints (`--fz-text`, `--fz-muted`, `--fz-danger`, `--fz-wash-*`, `--fz-edge-*`) and the scales                                                                             |
| Surfaces over the game                     | `--fz-float` for the dialogs' cards, `--fz-well` for the board's frame, `--fz-bar-glass` through the bar                                                                                    |
| Buttons, badges, hidden text               | `.fz-button` and its tones and shapes; `.fz-badge` for the difficulty; `.fz-visually-hidden`                                                                                                |
| Mixins                                     | `fz.tap-target`, `fz.transition()`, `fz.flex-center`, `fz.visually-hidden`                                                                                                                  |
| Style lint                                 | `@fz/style/stylelint`                                                                                                                                                                       |
| The palette in code, and the toolbar color | `ThemeService`, with `THEME_COLOR_ROLE` set to `page`: on a phone the bar stands at the bottom and the page runs to the top                                                                 |
| Choosing a palette                         | `<fz-theme-picker>` in the settings dialog, as in Solitaire's settings                                                                                                                      |
| Dialogs                                    | `<fz-dialog>` for the settings, the result of a game, and how to play                                                                                                                       |
| "Start a new game?"                        | `ConfirmService.ask()` and one `<fz-confirm-dialog>`, with the `danger` tone, as Solitaire asks                                                                                             |
| Icons                                      | `<fz-icon>`: `restart`, `plus`, `settings`, `help`, `more`, `home`, `time`, `trophy`, `close`, and three new ones (`flag`, `mine`, `heart`), added to `@fz/ui` in the look the mock settles |
| Choices that deal a new game               | `[fzRadioGroup]` for the difficulty and the lives: the arrows move without choosing, since choosing deals a new game, as Solitaire's rule options do                                        |
| Storage                                    | `LocalStorageService` and `BROWSER_STORAGE` from `@fz/ui/storage`                                                                                                                           |
| Specs                                      | `installDialogPolyfill` from `@fz/ui/testing`                                                                                                                                               |
| The bar                                    | `<fz-game-bar>` with the wordmark or home button, `<fz-bar-overflow>` when compact, and `game-ui.bar-size()` for laying the board out around it                                             |
| Moving through the board by keyboard       | Angular Aria's grid (`ngGrid`), already a peer of the libraries, if the spike passes                                                                                                        |

Left alone: `<fz-theme-menu>`, which is for a header; the site uses it and a
game's settings use the picker. `.fz-swatch` comes along inside the picker.

What stays Minesweeper's own, for now (decision 7): the rules; the board and
its cells' look; the bar's readouts; the card at the end of a game; the "How
to play" text; and its viewport service.

## The design

What the mock shows, for the user to approve before anything is built.

### Layout

The game follows Solitaire's form factors, with the same breakpoints, so the
two games feel alike: compact is narrower than 720 or shorter than 500 CSS
px.

- **Roomy:** the bar across the top, the board centered in the room below.
- **A phone upright:** the bar along the bottom, compact, with the overflow
  menu.
- **A phone on its side:** the bar as a rail down the end side.
- **The cells fit the room:** each as large as the space between the bar and
  the edges allows, sized in CSS from the board's container. The pitch, a
  square and its 2 px gap, runs from 24 CSS px up to 42: a 22 px square
  24 px from the next meets WCAG 2.5.8 by its spacing exception. Below 24
  the board scrolls.
- **The board turns** on an upright phone when it is wider than tall, so
  Hard's 16 × 30 stands up the screen (decision 5). Rows become columns in
  the view only; the rules don't know.

### The bar

- **Lead:** the link home (the wordmark where there is room, the home button
  below that, and the overflow's first item on the narrowest), then the
  title, an `<h1>` reading "Minesweeper", with the difficulty as a badge.
  Compact, the title is read but not shown.
- **Status:** mines left (mines less flags, a tripped mine counting as
  found), lives left, and the time, each an icon and a number with a label
  for screen readers. They are not live regions: the board's announcer says
  what a move changed, once.
- **Actions:** Flag mode (a toggle, `aria-pressed`), Restart, New Game, How
  to play and Settings. Compact: Flag mode, New Game, and the overflow with
  Restart, How to play and Settings.

### The board

- A field in the well, on the page. Hidden cells are raised tiles, revealed
  ones sit flat in the well; the two differ by shape as well as color.
- Numbers in classic inks (1 blue, 2 green, 3 red and on), in a light and a
  dark set chosen by the palette's mode with `light-dark()`, each held to
  4.5:1 on a revealed cell in every palette (decision 4).
- A flag, a tripped mine (on `--fz-danger`, with its ink), and after a loss
  every mine and every wrong flag, crossed out, are icons, never color alone.
- Hover lightens a hidden tile, the focused cell wears the library's focus
  ring, and a reveal fades in unless the player prefers reduced motion.

### Play

- **First reveal is safe:** the mines are placed after it, never on that
  cell or its neighbors, so it always opens ground. The timer starts there.
- **Mouse:** a click reveals; a click on a number whose flags match it
  reveals its other neighbors (no double-click needed); a right click flags.
- **Touch:** a tap reveals, a long press flags, and Flag mode turns taps into
  flags for whoever can't long-press. The long press is built on pointer
  events, since iOS sends no `contextmenu` for one, and gives up if the
  finger moves, so scrolling the board flags nothing.
- **Keyboard:** the board is one tab stop. Arrows move, Home and End go to
  the row's ends, Ctrl+Home and Ctrl+End to the corners; Enter or Space
  reveals (or clears around a number), and F flags. F works only while a
  cell has focus, as WCAG 2.1.4 asks of a one-key shortcut.
- **Screen readers:** the board is a grid named "Minefield, 16 rows by 16
  columns". Each cell is named by what it shows: hidden, flagged, blank, a
  number, a mine. One polite live region, always in the page, says what each
  move did: "Revealed 14 cells", "Mine. 2 lives left", "Flagged. 39 mines
  left", "Cleared in 2:13", "Out of lives".
- **Restart** replays the same mines from the start; **New Game** deals a
  fresh field at the same difficulty. Either asks first while a game is in
  progress.
- **The page opens on a fresh field** of the last difficulty, ready for the
  first click, rather than on the settings.

### Dialogs

- **Settings:** Difficulty (Easy, Medium, Hard, Custom with rows, columns
  and mines), Lives, and Theme (`<fz-theme-picker>`). Choosing a difficulty
  or lives deals a new game, after the confirmation if one is in progress.
  Custom's fields say what they accept and refuse anything else.
- **The result:** an alert dialog over the board. A win shows the trophy,
  the time, the lives left and, where it is one, "New best". A loss shows
  the mine and how much of the field was cleared. New Game is first, then
  Play this field again, and Close leaves the board to look at.
- **How to play:** the rules, the lives, and the mouse, touch and keyboard
  controls.
- **The confirmation:** "Start a new game?", "The game in progress will be
  lost.", Cancel focused first.

## Phases

All on one branch, `minesweeper-angular`, with a commit at least per phase
and a work log to pause and resume by (`docs/minesweeper-worklog.md`,
deleted at the end, as the shared UI work did). Each phase ends with
`yarn verify` green and updates the docs its changes touch. Players see
nothing until M9 merges it.

### M0: the mock, and a spike (small; first)

- **Mock:** a private page built with the real tokens, as the shared UI
  mocks were: the game in Emerald felt and Classic felt on a wide screen, and
  in a dark palette on an upright and a sideways phone. It shows the bar
  (and its overflow open), a board mid-game (hidden, revealed, every number,
  flags, a tripped mine, the focus ring), the board turned on the upright
  phone, the settings, the confirmation, a win and a loss, How to play, and
  the three new icons. Nothing is built until the user approves it.
- **Spike (thrown away):** a zoneless app with a 30 × 30 `ngGrid` of cells,
  compiled with the libraries, measuring the first render and a reveal that
  floods most of the field under Chrome's 4× CPU throttle, and checking that
  the grid leaves Enter, Space and F to the cell. It passes if a flood
  repaints within a frame or two. If not, Minesweeper writes its own roving
  tab stop over the cells (arrows over a row-major index), which is a small
  directive.

### M1: scaffold the Angular app (medium)

- **Dependencies:** Angular, `@angular/aria` and `@angular/cdk`,
  `@fz/style`, `@fz/ui` and `@fz/game-ui`, Analog's Vite plugin, Sass,
  stylelint, Vitest, jsdom, Testing Library, typescript-eslint and
  angular-eslint, at the ranges Solitaire and the libraries use.
- **Configs:**
  - `vite.config.ts`: `angular()` and `fuzzleyStyle()`, relative `base`,
    port 9000, without the vendor minifier;
  - `tsconfig.json`: a solution over the app, the specs and the Node
    configs, with the libraries' own compiler options. They are the
    strictest set, and a flag beyond them would be one the libraries' code
    must also pass;
  - `eslint.config.js`: the libraries' rules with the `app` prefix, and the
    boundary that keeps `src/game/` free of Angular and of `src/app/`;
  - `stylelint.config.js`, `vitest.config.ts` and `src/test-setup.ts`, as
    `@fz/ui`'s.
- **The page:** `index.html` with `lang="en"`, the title "Minesweeper",
  `theme.js` first, a `theme-color`, the description, canonical address and
  link preview tags Solitaire's carries, `<app-root>`, and a `<noscript>`.
  `src/main.ts` boots an empty shell: the bar and an `<h1>`.
- **Out:** `src/main.js`, `src/fMinesweeper*`, `public/content/`,
  `public/vendor/`, `public/fonts/` and `eslint.config.cjs`;
  `.prettierignore` drops Minesweeper's lines.
- **Verify:** `yarn verify`; the site's build copies the new `dist/` and
  tags it; the bundle's size against today's 158 kB.

### M2: the rules (medium)

`src/game/`, with specs beside each file:

- a field: its size, its mines, each cell's state (hidden, flagged,
  revealed, tripped), the lives and the outcome (ready, playing, won,
  lost), changed only by functions that return a new field, so the shell
  holds it in a signal;
- the deal, from a seeded random number generator, after the first reveal;
- reveal, with the flood written as a loop rather than recursion; clearing
  around a number; flags; lives; the outcome, won when every safe cell is
  revealed;
- restart, with the same mines;
- the difficulties and Custom's bounds;
- what each move did, for the announcer;
- the field as JSON, for the saved game (decision 6).

Specs build fields from pictures (`fieldFrom(["*..", "...", "..*"])`), so a
rule reads as the board it is about. Coverage is held to a floor near 100%.

### M3: the new icons (small)

`flag`, `mine` and `heart` in `@fz/ui`'s `ICON_NAMES` and template, drawn as
the mock settled, with the icon spec's cases. Solitaire uses none of them,
and its specs check nothing changed for it.

### M4: the board (large)

- `GameService`: the field in a signal, the moves, Flag mode, and the timer,
  which counts while the page is visible.
- `<app-board>`: the grid on `ngGrid` (or M0's fallback), the cells, the
  mouse, touch and keyboard, the turned view, and the cell size from its
  container.
- The announcer's live region.
- The board's styles: the cells from palette roles, the number inks in a
  file of their own (the one file stylelint lets write colors), the marks
  and the motion.
- **Specs** through Testing Library, by role and name: a click reveals, a
  right click flags, Enter and F do the same, a number clears around it, a
  mine costs a life and says so, a loss shows the mines, the turned board
  maps cells back.

### M5: the bar and the dialogs (medium)

- `<app-game-bar>` fills `<fz-game-bar>` and `<fz-bar-overflow>`, and
  `ViewportService` decides the placement, compactness and link home from
  media queries, the way Solitaire's does. `bar-size()` publishes the bar's
  size, and the board keeps clear of it.
- The settings, result and How to play dialogs on `<fz-dialog>`, and the
  confirmation through `ConfirmService`.
- **Specs** for each: what it shows, what it does, and that focus returns.

### M6: storage (medium)

- `SettingsService`: the difficulty and lives, under `minesweeper-settings`.
- `StatsService`: games played and won, and the best time, per difficulty,
  under `minesweeper-stats` (decision 6).
- `SavedGameService`: the game in progress, under `minesweeper-game`,
  restored on load, so a reload or a phone dropping the tab loses nothing
  (decision 6).
- Every reader tolerates a missing, old or broken entry. Specs use an
  in-memory store through `BROWSER_STORAGE`.

### M7: the checks (medium)

- **Contrast:** a spec, as Solitaire's
  `test/ui/app/styles/contrast.spec.ts` does, holding the numbers and marks
  on their cells to 4.5:1, and hidden against revealed cells to 3:1, in
  every palette.
- **By hand:** a game won and a game lost by keyboard alone, by touch in
  Chrome's device mode, and by mouse, in a light and a dark palette; the
  accessibility tree in DevTools; Lighthouse's accessibility audit.
- **Size:** the gzipped page against today's 158 kB.

### M8: screenshots and docs (small)

- `tools/capture-screenshots.mjs`: deals a fixed seed, plays a few moves,
  and writes `public/docs/screenshots/minesweeper/preview.webp` (1280 × 720)
  and `thumb.webp` (192 × 108), in the default palette.
- Rewrite Minesweeper's `AGENTS.md` (its stack, layout, checks, storage
  keys) and `README.md`. Add its `vitest-testing` skill under
  `frontend/games/minesweeper/.agents/skills/`, as every workspace with specs
  has, and run `node .agents/link-claude-skills.mjs`.
- `.agents/AGENTS.md`: Minesweeper's stack is now Angular on the libraries.
- The `fuzzley-ui` skill gains Minesweeper as a second worked example, and
  `web-game-accessibility` its board, as the way a game board plays by
  keyboard.
- `docs/operations.md` no longer says Minesweeper loads classic scripts.
- Delete the work log.

### M9: ship (small)

- `yarn verify`; build the image and run `.github/scripts/check-image.sh`;
  play `/play/minesweeper/` in the image with the console open.
- Merge to `main` and push. Verify promotes `live`, and Cloud Run deploys
  it; play it on fuzzley.games.
- **Rollback:** `git push --force origin <last good commit>:live`, then
  revert the merge on `main`.

## Decisions

The first option is the recommendation, and the user took each on
2026-10-25. The mock still shows both options for decision 4.

1. **Fix the rules in the rewrite:** the first reveal is always safe; a
   flagged cell doesn't reveal until it is unflagged; the game is won when
   every safe cell is revealed, whatever the flags; a click on a number
   clears around it, without a double-click. Or port the 2016 rules as they
   are, the win check's bug included.
2. **Difficulty:** Easy (9 × 9, 10 mines), Medium (16 × 16, 40) and Hard
   (16 × 30, 99), the classic three, and Custom (rows and columns from 5 to
   30, mines from 1 to all but 9 cells), which starts at the 2016 game's
   20 × 20 with 100 mines. Lives from 1 to 5, 3 by default, at any
   difficulty. Medium first. Or keep the 2016 settings, rows, columns and
   lives with a quarter of the cells mined, given bounds.
3. **Touch:** a long press flags, and Flag mode does too. Or Flag mode
   alone, which avoids telling a long press from a scroll.
4. **The board's look:** it wears the palette, with the numbers in classic
   inks, a light set and a dark one. Or numbers in the text color alone,
   which needs no inks of Minesweeper's own. The mock shows both.
5. **The board turns** on an upright phone when it is wider than tall. Or
   it never turns, and scrolls sideways.
6. **What it keeps:** the time, games won and best times per difficulty, and
   the game in progress across a reload. Or the time alone, kept for nothing
   beyond the game; or the time and the game in progress.
7. **New in the libraries: only the three icons.** The bar's readouts, the
   end-of-game card and the viewport service stay Minesweeper's own until
   both games have settled what they mean by them. Each could then be lifted
   into `@fz/game-ui` or `@fz/ui` in a change of its own, proved
   pixel-identical in Solitaire. Or lift them in this plan, which changes
   Solitaire too.
8. **Shipping:** everything on one branch, merged once, so players see one
   change and the screenshots are taken once. Or ship the scaffold and rules
   (M1, M2) first behind the old game, which would mean keeping both pages
   building side by side.

## Risks

- **A flood across a large board is slow on a slow phone.** M0's spike
  found Angular Aria's grid fine at 900 cells, but a reveal that opens the
  whole 30 × 30 board takes about a quarter of a second at Chrome's 4× CPU
  throttle. The browser's restyle and paint cost that much with no
  framework at all, so M4 keeps the cells' styles cheap and measures again.
  `@angular/aria` is young (the libraries pin it to `~22.2.0`), and a roving
  tab stop of Minesweeper's own is still the fallback.
- **A rewrite can drop a rule.** The specs state each rule as a picture of
  a field, and M7 plays games through by every input.
- **Long press and scrolling** share a gesture on a board bigger than the
  screen. The press gives up when the finger moves, and Flag mode is there
  whatever happens.
- **The page's weight** moves from jQuery, Knockout, Lodash, Moment and
  Bootstrap (158 kB) to Angular, the libraries and Figtree. It is expected
  to be lighter; M1 and M7 measure it.
- **New icons touch a library both games compile.** `yarn verify` runs
  Solitaire's specs against them.
- **Everything looks different,** and the palette chosen on the site or in
  Solitaire now applies here, and the reverse. That is the intent. Players
  lose nothing, since nothing was stored.

## Not in this plan

- A Content Security Policy for `/play/minesweeper/`, which the game could
  now carry since it loads no classic scripts; `check-image.sh` expects a
  game to carry none, so it is a change of its own.
- Lifting Minesweeper's pieces into the libraries (decision 7).
- Question marks, fields that need no guessing, sound, or shared scores.
- Changing the site, beyond the screenshots it shows.
- Archiving fuzzley/fMinesweeper.
