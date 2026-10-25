# Minesweeper work log

The running record of [Minesweeper's plan](minesweeper-ui-plan.md): what is
done, what was found, and where to pick up. The newest entry is last. Delete
this file in the commit that finishes the plan; it stays in that commit's
parent.

## Where things stand

- **Branch:** `minesweeper-angular`, from `main` at `d1b77db`. Not pushed: a
  push to `main` deploys, so shipping waits for the user's go-ahead.
- **Phase:** M8, screenshots and docs.
- **Next step:** `tools/capture-screenshots.mjs`, then the docs.

| Phase                 | State |
| --------------------- | ----- |
| M0. Mock and spike    | done  |
| M1. Scaffold          | done  |
| M2. The rules         | done  |
| M3. The new icons     | done  |
| M4. The board         | done  |
| M5. Bar and dialogs   | done  |
| M6. Storage           | done  |
| M7. The checks        | done  |
| M8. Screenshots, docs | to do |
| M9. Ship              | to do |

## How to check the work

From `frontend/`: `yarn verify` runs every check. On this machine, Docker is
usually off and port 4200 is taken (see the dev-environment notes in Claude's
memory); start Vite with `--port <n> --strictPort`, and run one headless
Chrome at a time.

## Log

### 2026-10-25: the plan agreed

- The user answered "Yes proceed" to the plan and to committing it, which
  takes every decision as recommended. Decision 4 (the numbers' inks) is
  still shown both ways in the mock, and nothing in Minesweeper changes until
  the user approves the mock.

### 2026-10-25: the spike

- Thrown away, as planned: a zoneless app in Solitaire's workspace with a
  30 × 30 `ngGrid` of cells, against the same grid without the directives.
- **Keys:** one tab stop for 900 cells; the arrows, End and Ctrl+End move
  it, the grid sets `aria-rowindex` and `aria-colindex`, and with selection
  off it leaves Enter, Space and F to the cell's own handler.
- **Speed, production build at Chrome's 4× CPU throttle:** the first render
  takes about 1 s; revealing one cell 14–19 ms; a flood that opens the whole
  board 240–260 ms. Unthrottled in dev, the flood takes 32–60 ms against
  33–39 ms without the grid.
- **The flood's cost is the browser's.** Writing the same changes straight
  to the DOM takes 240–420 ms at 4×, and toggling only the class about
  160 ms; `contain: strict` on the cells changes nothing. So the plan's "a
  flood repaints within a frame or two" holds for a move, not for the
  worst flood, and no framework would change that. The grid stays; the
  plan's risks now say so, and M4 keeps the cells' styles cheap.
- **Weight:** the spike's production bundle, zoneless Angular with the
  grid, is 52 kB gzipped, against the 111 kB of scripts the game loads
  today.

### 2026-10-25: the mock

- Published privately:
  [Minesweeper on the shared libraries: the mock](https://claude.ai/artifact/PaFG5PCV4EgQegAN4hAdeW).
  Built from the libraries' real Sass and icons by a generator script, with
  a seeded game for the boards; the generator lives outside the repository.
- It shows the game wide and on phones, the bar and its overflow, the
  turned board, the settings, the confirmation, a win, a loss and How to
  play; the numbers' inks both ways in every palette (decision 4); and the
  three new icons.
- **The cell pitch** (a square and its gap) runs from 24 px to 42 px, so a
  square can be 22 px; WCAG 2.5.8's spacing exception allows it. The plan's
  design section says so now.
- **Contrast, checked per palette:** every number's ink clears 4.5:1 on an
  open square, the lowest Soft pastel's 3 at 4.9:1; hidden squares against
  open ones 4.3:1 at the least (Classic felt); flags and mines on their
  squares over 5:1.
- **For decision 7, later:** the settings drawer borrows Solitaire's choice
  rows, segmented control and field labels. If Minesweeper keeps them, they
  are the first candidates to lift into `@fz/game-ui`.

### 2026-10-25: the mock approved

- The user approved the mock and asked for what it recommends: decision 4
  takes the classic inks. Implementation starts with M1.

### 2026-10-25: M1, the scaffold

- The 2016 code, its vendored scripts, styles and fonts are gone, and
  `.prettierignore` no longer skips Minesweeper.
- The workspace follows `@fz/ui`'s layout: specs beside the code under
  `src/`, a solution `tsconfig.json` with the libraries' options, and
  ESLint's boundary keeping `src/game/` free of Angular, the libraries and
  the shell. `tsconfig.node.json` needs `allowImportingTsExtensions`, as the
  site's does, for `@fz/style`'s Vite plugin.
- Beyond Solitaire's dependencies it takes Testing Library and, for it and
  `@angular/build`, `@angular/router` and `postcss`, as `@fz/ui` does.
- **Size:** the shell alone builds to 41.7 kB of script and 2.9 kB of CSS,
  gzipped, against 158 kB before.
- `yarn verify` passed, with the site's build copying and tagging the new
  `dist/`.

### 2026-10-25: M2, the rules

- `src/game/`: `field.ts` (the field, the deal, reveal with its flood as a
  loop, clearing around a number, flags, lives, the outcome, restart),
  `difficulty.ts` (Easy, Medium, Hard, Custom's bounds, lives), `random.ts`
  (Mulberry32), `describe.ts` (what a square shows and is called, and what a
  move did, for the announcer) and `saved_field.ts` (the field as JSON, and
  a reader that refuses anything the game couldn't have saved).
- **As built:** a field holds `layout: null` until the first reveal, which
  lays the mines from the field's seed clear of that square and its
  neighbors. Restart keeps the layout, so the replay has the same mines, but
  its first reveal isn't promised safe: the player has seen the field. A win
  flags the mines left standing, so the mines left read 0.
- Specs draw fields as pictures (`src/testing/field_picture.ts`), and a
  number drawn must match its count. `test:coverage` holds `src/game/` to
  100% of statements, functions and lines and 95% of branches.

### 2026-10-25: M3, the new icons

- `flag`, `heart` and `mine` in `@fz/ui`, filled, as the mock drew them.
  `@fz/ui`'s 147 specs and Solitaire's typecheck and 6,937 specs pass.

### 2026-10-25: M4 to M6, the game

- One commit, since the game service, the dialogs and the stores lean on
  each other. `GameService` holds the field, the moves, Flag mode, the clock
  (counting while the page is in view) and the announcer's words, and asks
  through `ConfirmService` before a deal loses a game under way. It records
  a game started on its first reveal, and a win with its time.
- `<app-board>` is the `ngGrid` the spike tried, with the clicks, keys and
  long press delegated to the grid. A field wider than tall stands on end on
  any upright screen, not only a phone's: a tablet held upright gets bigger
  squares that way.
- The bar is `<fz-game-bar>` as the mock drew it. Between 720 and 1200 px
  the difficulty badge goes, so the title isn't cut short; the settings and
  the result still name the difficulty.
- The settings drawer, How to play and the result card, on `<fz-dialog>`.
  Custom's form names the number it can't deal and marks that input, rather
  than repeating the hint. The result opens on New Game, and closing it
  leaves the board as it ended.
- **Storage:** `minesweeper-settings`, `minesweeper-stats` and
  `minesweeper-game`, each `version: 1`, each read field by field so a
  broken entry loses only itself. The saved game is written while a game is
  under way, every move and every second, and taken up before the board
  first shows (`provideAppInitializer`). The 2016 game's
  `fMinesweeper.Settings` and `fMinesweeper.Statistics` are left unread.
- **Checked in Chrome:** a restored game, a win and a loss with their cards
  and stats, How to play, the settings and Custom's errors, an upright and a
  sideways phone, and the bar at 720, 1000 and 1280 px. No console errors.
  A flood over a 30 × 30 field paints in about 150 ms at 4× throttle in dev,
  in line with the spike.
- 277 specs: the services, every component through Testing Library, and
  the app shell. `src/testing/` adds `playOn()`, which puts a pictured field
  on the board, and the Solitaire Collection's fake `matchMedia`.

### 2026-10-25: M7, the checks

- **Contrast:** `src/app/board/contrast.spec.ts` compiles the app's global
  stylesheet and the inks, as the Solitaire Collection's spec does, and
  holds every palette to: each number at 4.5:1 on an open square, the flag,
  a mine stepped on, and the mines and wrong flags shown after a loss at
  4.5:1, and a hidden square against an open one, the stroke through a wrong
  flag and the focus ring at 3:1. It caught a wrong flag drawn in the muted
  color at 4.4:1 in Soft pastel; it is drawn in the text color now, its
  stroke telling it apart.
- **By hand, on the production build:** a win and a loss by keyboard alone
  (Tab to the board, arrows, End, Ctrl+End, Enter, F, the card's buttons);
  taps and Flag mode on an emulated phone in Classic felt; mouse play
  through M4 to M6.
- **Found and fixed:** a new deal from the result card replaced the square
  that had the focus, dropping it to the page, so the card now hands it to
  the board. A restored game whose start went uncounted could record more
  wins than games, which the reader throws away as broken; a win now counts
  as played where it has to.
- **Lighthouse:** accessibility 100 on a phone mid-game and on a desktop
  with the settings open. It flagged the difficulty choices, named by their
  name alone while showing a line under it; they are named by all their
  text now, as the theme picker's choices are. Its robots.txt and llms.txt
  failures are the preview server answering with the page; the site serves
  its own.
- **Size:** 80.7 kB of script, 2.9 kB of CSS and 1.2 kB of HTML, gzipped:
  84.8 kB against 158 kB before.
- **Speed, production build at 4× throttle:** a flood opening 827 of 900
  squares has its first frame at 180 ms and is painted by 560 ms, against
  the spike's 240–260 ms, measured without DevTools' accessibility tree
  live. Unthrottled that is about 140 ms, once a game.
