# Minesweeper

The `minesweeper` workspace: Minesweeper with lives, where a mine stepped on
costs a life rather than the game. It is an Angular app on the shared
libraries, rebuilt in 2026 from the 2016 game, which was branched off from
fMinesweeper with its history. What every game keeps, in
[frontend/games/AGENTS.md](../AGENTS.md), what every workspace keeps, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's rules, in
[.agents/AGENTS.md](../../../.agents/AGENTS.md), apply here too; this
workspace keeps its own for its code. Paths are relative to
`frontend/games/minesweeper/`.

## Technology Stack

- **UI:** [Angular](https://angular.dev/) (standalone components, signals,
  zoneless change detection) on `@fz/style`, `@fz/ui` and `@fz/game-ui` (the
  `fuzzley-ui` skill), with `@fz/core`'s helpers in the rules
- **Build Toolchain:** [Vite](https://vitejs.dev/) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/) with jsdom and Testing
  Library
- **Language:** TypeScript / HTML / Sass

## Layout

- **`src/rules/`** — the rules, with no framework. A `Field` (`field.ts`) is
  a value each move replaces: the mines are laid on the first reveal, clear
  of that square and its neighbors, from the field's seed
  (`@fz/core/random`); a
  reveal floods the blank squares, a click on a number whose flags match
  clears around it, and a mine stepped on costs a life. Restart keeps the
  mines where they lay. `difficulty.ts` holds the presets and the
  bounds of a field of the player's own, `describe.ts` what a square shows
  and what a screen reader hears of it and of a move, `saved_field.ts` a
  field as JSON. ESLint keeps Angular, the libraries but `@fz/core`, RxJS
  and the shell out of it.
- **`src/app/`** — the shell, one folder per feature, each holding its
  components and services together. `app.component` lays them out, with
  the `<fz-announcer>` every move is announced through.
  - `play/` — `GameService` holds the game in play, runs its clock on
    `@fz/game-ui/stopwatch`, makes every move and says what it did through
    `@fz/ui/announcer`, and asks through `@fz/ui/confirm` before a new deal
    throws a game away; `SavedGameService` keeps the game in progress.
  - `board/` — the minefield, and `LongPressDirective`, which tells when a
    finger rests on it and keeps the click that follows from it.
  - `bar/` — `BarComponent` fills the libraries' `<fz-game-bar>` with the
    mines left, the lives, the time and the actions.
  - `settings/` — the settings drawer, whose field of the player's own is
    a Signal Form (`@angular/forms/signals`) with the rules' `sizeProblem()`
    as its validator, and `SettingsService`, which keeps what the player
    chose.
  - `stats/` — `StatsService`, the games played and won and the best times.
  - `result/` — the card over a finished game. `help/` — How to play.
  - `styles/` — `global.scss`, loaded once from `main.ts`, loads
    `@fz/style`'s global stylesheet and publishes the bar's size.
    `_index.scss` is the toolkit every component `@use`s, and emits no CSS.

  A new feature gets a folder of its own, named for what it does, never for
  the kind of code in it (no `services/` or `components/`). What it stores
  goes through `@fz/ui/storage`'s `LocalStorageService`.

- **`src/testing/`** — what specs share: `fieldFrom` (`field_picture.ts`)
  draws a field as rows of letters, and `playOn` (`game.ts`) puts one in
  play. The app's tsconfig leaves it out.
- **`tools/capture-screenshots.mjs`** — makes the screenshots the site shows.

## The Board

- **It is a grid,** Angular Aria's `ngGrid`, with one tab stop that the
  arrow keys, Home and End move. Enter or Space opens a square, and F flags
  it. A click opens and a right-click flags; on a touch screen a long press
  flags, and so does a tap in the bar's Flag mode. The grid listens once for
  each kind of event and finds the square from the target.
- **It wears the palette.** A hidden square is the accent and an open one a
  wash of the text over the panel. Only the numbers have colors of their
  own, the classic inks in a light set and a dark one, in
  `src/app/board/_inks.scss`, the one stylesheet stylelint lets write a
  color. `src/app/board/contrast.spec.ts` holds the numbers and the marks
  to 4.5:1 on their squares, and the squares' states to 3:1, in every
  palette, so a palette that breaks it needs the inks changed with it.
- **It turns** on an upright screen when the field is wider than tall, so a
  Hard field fits a phone without scrolling sideways.

## Styling

Every component stylesheet opens with `@use "../styles" as *;`, which
brings in `@fz/style`'s mixins and `@fz/game-ui`'s breakpoints, and nothing
else. The
frontend's Angular and Sass rules apply; on top of them:

- **Only the numbers' inks are colors,** in `src/app/board/_inks.scss`, the
  one stylesheet stylelint lets write one.
- **The bar and the board read `@fz/game-ui/viewport`'s
  `GameViewportService`,** which applies the games' compact test in code and
  says where the bar stands and what fits in it.
- **The flag, heart and mine** were added to `@fz/ui`'s icons for this game.
  The dialogs' cards, close buttons, headings and choice tiles are
  `@fz/style`'s mixins, which every game's dialogs share.

## In This Repository

What every game keeps is in `frontend/games/AGENTS.md`. Here:

- **The site serves it at `/play/minesweeper/`,** and its `game.json` names
  it Minesweeper, as the site's catalog must.
- **Its screenshots** are in `public/docs/screenshots/minesweeper/`, and
  `yarn capture:screenshots` makes them again.
- **The browser's toolbar takes the page's color** (`THEME_COLOR_ROLE` in
  `src/main.ts`), and the settings offer the palette.
- **Its saved games** are in `localStorage` under `minesweeper-settings`,
  `minesweeper-stats` and `minesweeper-game`, each versioned
  (`LocalStorageService.writeVersioned()`). The 2016 game stored nothing.
- **Accessibility.** The rules are the repository's `web-game-accessibility`
  skill's. Every overlay is an `<fz-dialog>`, the board is the grid above,
  and every move is announced.

## Development Commands

Run these from `frontend/games/minesweeper/`, or as
`yarn workspace minesweeper <script>` from `frontend/`. The root's
`yarn lint`, `yarn typecheck`, `yarn test` and `yarn build` run this
workspace's with the others'.

- **Run Development Server:** `yarn dev` (at `http://localhost:9001/`; the
  Solitaire Collection's uses 9000). The site's dev server serves the build
  `yarn start` made when it started; `yarn dev:all`, from `frontend/`,
  serves this dev server there instead.
- **Production Build:** `yarn build`, into `dist/`; `yarn preview` serves it.
- **Run Unit Tests:** `yarn test` (the whole suite once, with coverage,
  failing below the floor `vitest.config.ts` sets for `src/rules/`),
  `yarn test:watch`, or `yarn vitest run <path>` for one spec, which leaves
  the floor alone.
- **Linting:** `yarn lint` (ESLint over `src`, `tools` and the configs:
  `@fz/dev`'s blocks, with Angular's template accessibility rules and JSDoc
  types on every script, and the fence around `src/rules/`; then
  `yarn lint:styles`, stylelint with `@fz/style`'s preset).
- **Type Checking:** `yarn typecheck` (the Angular compiler over the app,
  then `tsc` over the specs, the Vite configs and the scripts in `tools/`
  from their JSDoc, emitting nothing, each with `@fz/dev`'s compiler
  options).
- **Capture Screenshots:** `yarn capture:screenshots` (runs
  `tools/capture-screenshots.mjs` against the running dev server in headless
  Chrome, through `@fz/dev/chrome`: a seeded game, part played, at
  1280 × 720 and 2× on Casino night, written to
  `public/docs/screenshots/minesweeper/` as the site's `preview.webp`
  (2560 × 1440) and `thumb.webp` (576 × 324) by `@fz/dev/screenshots`;
  `--url` names another server, and `--chrome <path>` or `CHROME_PATH`
  picks the browser).

## Tests

The repository's rules for specs apply. A spec sits beside the file it
tests, named after it. This workspace's `minesweeper-testing` skill, in
`.agents/skills/`, covers its setup and fixtures, and the repository's
`angular-testing` the patterns every Angular workspace's specs share. The rules' specs
draw their fields with `fieldFrom`, and the shell's play on one with
`playOn`, rather than dealing at random.
