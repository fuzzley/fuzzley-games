# Minesweeper

The `minesweeper` workspace: Minesweeper with lives, where a mine stepped on
costs a life rather than the game. It is an Angular app on the shared
libraries, rebuilt in 2026 from the 2016 game that moved here from
fuzzley/fMinesweeper with its history. The repository's rules, in
[.agents/AGENTS.md](../../../.agents/AGENTS.md), say how it is built, checked
and served, and how code, comments and tests are written; this workspace
keeps its own for its code. Paths are relative to
`frontend/games/minesweeper/`.

## Technology Stack

- **UI:** [Angular](https://angular.dev/) (v22: standalone components,
  signals, zoneless change detection) on `@fz/style`, `@fz/ui` and
  `@fz/game-ui` (the `fuzzley-ui` skill)
- **Build Toolchain:** [Vite](https://vitejs.dev/) (v8) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/) (v5) with jsdom and
  Testing Library
- **Language:** TypeScript (v6) / HTML / Sass

## Layout

- **`src/rules/`** — the rules, with no framework. A `Field` (`field.ts`) is
  a value each move replaces: the mines are laid on the first reveal, clear
  of that square and its neighbors, from the field's seed (`random.ts`); a
  reveal floods the blank squares, a click on a number whose flags match
  clears around it, and a mine stepped on costs a life. Restart keeps the
  mines where they lay. `difficulty.ts` holds the presets and the
  bounds of a field of the player's own, `describe.ts` what a square shows
  and what a screen reader hears of it and of a move, `saved_field.ts` a
  field as JSON, and `format.ts` the counts and times the shell writes out.
  ESLint keeps Angular, the libraries, RxJS and the shell out of it.
- **`src/app/`** — the shell, one folder per feature, each holding its
  components and services together. `app.component` lays them out and
  holds the live region every move is announced through.
  - `play/` — `GameService` holds the game in play and its clock, makes
    every move, and asks through `@fz/ui/confirm` before a new deal throws a
    game away; `SavedGameService` keeps the game in progress.
  - `board/` — the minefield.
  - `bar/` — `BarComponent` fills the libraries' `<fz-game-bar>` with the
    mines left, the lives, the time and the actions.
  - `settings/` — the settings drawer, and `SettingsService`, which keeps
    what the player chose.
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
brings in `@fz/style`'s mixins and this game's own, and nothing else.

- **Tokens are `@fz/style`'s, by their own names** (`--fz-accent`,
  `--fz-space-3`, `--fz-radius-md`), read with `var()`. Never a color
  literal outside `_inks.scss`.
- **The games' breakpoints, by name:**
  `@include below("tablet" | "desktop")` and the rest of `@fz/game-ui`'s
  mixins, which `styles/_index.scss` forwards, so every game changes shape
  at the same widths. `@fz/game-ui/viewport`'s `GameViewportService` applies the same
  compact test in code, and says where the bar stands and what fits in it;
  the app, the bar and the board read it.
- **The libraries' pieces first.** Overlays are `<fz-dialog>`, the question
  before a game is lost is `ConfirmService.ask()`, buttons are
  `.fz-button`, and icons are `<fz-icon name="…">` (the flag, heart and
  mine were added to `@fz/ui` for this game). What the two games draw alike
  but don't yet share, such as the settings' choice tiles, is a mixin in
  `src/app/styles/_mixins.scss`.
- **Templates bind, they do not compute.** Expose a `computed()` view model
  instead of calling a method from a template.
- **Comment with `//`,** which Sass strips.

## In This Repository

- **It knows nothing of the site.** It builds into `dist/` with relative
  URLs, and the site copies that build to `/play/minesweeper/`. Nothing here
  imports from the site, or the site from here.
- **Its screenshots are the site's.** `public/docs/screenshots/minesweeper/`
  holds the thumbnail and the preview the catalog shows, and the preview is
  the link preview image in `index.html`. `yarn capture:screenshots` makes
  them again.
- **It shares the palette with the site.** `index.html` loads `theme.js`
  first, which `@fz/style`'s Vite plugin writes, and `ThemeService` from
  `@fz/ui/theme` takes over; the settings offer the choice. The browser's
  toolbar takes the page's color (`THEME_COLOR_ROLE` in `src/main.ts`).
- **Saved games outlive the code.** The settings, the statistics and the
  game in progress are in `localStorage` under `minesweeper-settings`,
  `minesweeper-stats` and `minesweeper-game`. Each entry carries a version,
  and a reader drops one it can't trust rather than failing. Renaming a key
  loses what players saved. The 2016 game stored nothing.
- **Accessibility.** The rules are the repository's `web-game-accessibility`
  skill's. Every overlay is an `<fz-dialog>`, the board is the grid above,
  and every move is announced.

## Development Commands

Run these from `frontend/games/minesweeper/`, or as
`yarn workspace minesweeper <script>` from `frontend/`. The root's
`yarn lint`, `yarn typecheck`, `yarn test` and `yarn build` run this
workspace's with the others'.

- **Run Development Server:** `yarn dev` (at `http://localhost:9000/`, the
  port the Solitaire Collection's uses too). The site's dev server serves
  the build `yarn start` made when it started.
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
  `public/docs/screenshots/minesweeper/` as `preview.webp` (2560 × 1440)
  and `thumb.webp` (576 × 324); `--url` names another server, and
  `--chrome <path>` or `CHROME_PATH` picks the browser).

## Tests

The repository's rules for specs apply. A spec sits beside the file it
tests, named after it, and this workspace's `vitest-testing` skill, in
`.agents/skills/`, covers the setup and the patterns. The rules' specs
draw their fields with `fieldFrom`, and the shell's play on one with
`playOn`, rather than dealing at random.
