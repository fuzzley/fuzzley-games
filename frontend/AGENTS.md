# The frontend

`frontend/`: the Yarn workspace root for all client code, the site, the games
built here and the libraries they share, and nothing else. These rules hold
for every workspace in it. The repository's, in
[.agents/AGENTS.md](../.agents/AGENTS.md), apply here too, and each workspace
keeps its own in an `AGENTS.md` in its folder. Paths are relative to
`frontend/`.

## Layout

- **The root** runs the workspaces and holds nothing of their own. Its
  `package.json` declares the workspaces and pins Yarn and Node. Its scripts
  run the workspaces' own (`yarn build`, `yarn verify`), picking them by path
  (`--include "games/*"`), each `foreach` running them side by side
  (`--parallel`, as many at once as half the machine's cores), each
  workspace's output printed whole once it is done, so no workspace's step
  may wait on another's. `yarn test` runs four at a time, each Vitest on a
  quarter of the cores (`--maxWorkers=25%`), which fits a machine of four
  cores or more, as CI's is; more would starve the specs of their five
  seconds. Its dependencies are only the tools that run from here: Prettier, ESLint, TypeScript and `@fz/dev`
  for the `.agents/` scripts and its own `tools/`, with the
  `eslint.config.js` and `tsconfig.scripts.json` beside it, and `semver` for
  the constraints.
  `tools/` holds the scripts that act on every workspace at once, such as
  `yarn stop`'s. `yarn.lock` and `.yarnrc.yml` exist only here. A backend,
  when there is one, goes in a folder of its own beside `frontend/`.
- **`yarn.config.cjs`** holds the constraints `yarn lint` checks every
  `package.json` against: a package has the same range in every workspace
  that depends on it, a peer range is the workspace's own devDependency
  range for it, only the root sets `packageManager`, `workspaces` and
  `engines`, each workspace is private and named after its folder, a library
  depends on no workspace but another library, and every workspace has
  `lint`, `typecheck`, `test` and `test:coverage` scripts (a game `build`
  too), since the
  root's `yarn workspaces foreach run` skips a workspace without one and
  says nothing. `yarn constraints --fix` gives every workspace the highest
  of a package's ranges, and a peer its devDependency's.
- **Each workspace is self-contained:** its `package.json` lists everything
  it imports or runs, and its configs sit in its folder and cover only it.
  They build on `@fz/dev`'s presets, so every workspace is checked by the
  same rules, and add only what is the workspace's own. Its ESLint and
  Stylelint configs are checked as its scripts are, linted by `@fz/dev`'s
  `scripts()` block and type-checked from their JSDoc in its
  `tsconfig.scripts.json`, which its solution, `tsconfig.json`, references.
  The site and the games never import each other's code; the site takes a
  game's built `dist/`, through `games.json`, and nothing else, but for
  `yarn dev:all`, which runs each game's own dev server in its workspace
  and serves it at the site's `/play/<slug>/`.
- **`site/`** is the site, the Angular app (workspace `site`), and the build
  the image serves, with the games under `/play/`: `site/AGENTS.md`.
- **`lib/`** holds the libraries the site and the games share, one workspace
  each, named after its folder under the `@fz` scope (`lib/style` is
  `@fz/style`). Imports go one way only: the site and the games may import a
  library, through a `workspace:` dependency in their `package.json`, and a
  library may import another library, but never the site or a game. An app
  compiles a library from its source; nothing in `lib/` is built on its own.
  A library's coverage counts its `src/testing/`, the helpers it hands
  specs, with no floor of its own, so what of them goes untested shows.
  Each keeps its own rules in an `AGENTS.md` in its folder:
  `lib/core/AGENTS.md`, for the small helpers the games share with no
  framework and no platform, which a game's rules may import,
  `lib/style/AGENTS.md`, for the styles every app shares, with no framework,
  `lib/ui/AGENTS.md`, for the Angular components and services,
  `lib/game-ui/AGENTS.md`, for the chrome only the games share,
  `lib/phaser/AGENTS.md`, for what every game drawn with Phaser shares, and
  `lib/dev/AGENTS.md`, for the lint, compiler, test and game build presets
  every workspace is checked and built with, the scripts' headless Chrome,
  and the games' sound synths and sound lab, which no app's code imports.
  The `fuzzley-ui` skill says which piece to reach for, and how an app
  adopts them; the `phaser-core` skill covers `@fz/phaser`.
- **`games/`** holds the games built here, one workspace each, named after
  its folder. What every game keeps, and how to add one, is in
  `games/AGENTS.md`; what each keeps of its own is in its folder's:
  `games/solitaire/AGENTS.md`, `games/minesweeper/AGENTS.md`,
  `games/sudoku/AGENTS.md`, `games/snake/AGENTS.md`,
  `games/brick-breaker/AGENTS.md`, `games/asteroid-breaker/AGENTS.md` and
  `games/brick-fuzz-pop/AGENTS.md`.

## Yarn and Node

This project uses **Yarn 4**, through Corepack, pinned in `package.json`.
Always use Yarn commands instead of NPM (`yarn <command>`), run from here;
`yarn workspace <name> <script>` runs a script of one workspace.

`.yarnrc.yml` sets `npmMinimalAgeGate` to a day: Yarn won't install a version
published less than a day ago (it says the versions are "quarantined"). Take
the newest version past the gate rather than lifting it. Dependabot waits the
same day before proposing an update.

Node is version 26, as the repository's `.node-version` says;
`package.json`'s `engines` says so too.

## Commands

Run from `frontend/`. Each of these builds or checks every workspace; a
workspace's own scripts, such as `yarn workspace site lint:styles`, run one
step, and its `AGENTS.md` says what they do.

- **Run Development Server:** `yarn start` or `yarn dev` (builds the workspaces under `games/`, then the site puts the games in `site/public/play/` and launches the Vite dev server at `http://localhost:4200/`; `--open` opens it in the browser, which no dev server does unless asked). The games are the builds made when it started, so an edit to one shows only once it is built again.
- **Run Every Dev Server:** `yarn dev:all` (runs `site/tools/dev-all.mjs`: the site's Vite dev server at `http://localhost:4200/`, and each game's own on the ports after it, which the site serves at `/play/<slug>/`, so an edit to a component's template or styles, in the site, a game or a library, swaps into the running page, keeping the game in play, and any other edit reloads the page, from which each game takes up the game it saved; `--port <n>` moves the site, and the games with it, to another port, failing rather than taking another when one is in use, and `--open` opens the site in the browser once it is up). When one server stops, the others do too.
- **Production Build:** `yarn build` (builds the workspaces under `games/` with `yarn build:games`, then the site's `build` puts every game `games.json` lists into `site/public/play/`, bundles into `site/dist/`, writes `version.json` with the commit it was built from and the games' builds, then adds the analytics tags to each game). It fails if the catalog links a game the games' builds don't have, or calls one by another name, as each build's `game.json` says.
- **Copy the Games:** `yarn games` (builds the workspaces and copies every game into `site/public/play/`; `yarn start` and `yarn build` do it first).
- **Preview Build:** `yarn preview` (serves the site's production build locally).
- **Stop Development Servers:** `yarn stop` (runs `tools/stop-dev-servers.mjs` to force stop every Vite dev server running from this checkout's frontend, whichever workspace started it, with the yarn processes that launched it, on Windows and Linux; `--dry-run` lists them without stopping them). Don't run it while a build runs: it stops the Dart Sass a build spawns too.
- **Check the Layout:** `yarn check:layout` (runs each game's `check:layout`, where it has one, as Sudoku, Snake, Brick Breaker, Asteroid Breaker and Brick Fuzz Pop do: it serves the game's build and opens it in headless Chrome at a roomy window, an upright phone and one on its side, each as a large phone and a small one, failing on an error the page reports, a page that scrolls, a control of the game bar out of the window, a board drawn with Phaser out of its shape or its place, a deck beside it that lacks a zone it must show (one shown all or none may show none of them) or whose zones lie off the canvas or over the board, each other or the bar, or what the game's own inspection finds, with `@fz/dev/layout`; Snake's, Brick Breaker's, Asteroid Breaker's and Brick Fuzz Pop's turn the phone too). It checks the builds `yarn build` made, and CI runs it after `yarn verify:full`.
- **Run Unit Tests:** `yarn test` (runs each workspace's `test`, every spec once, without coverage).
- **Run Unit Tests with Coverage:** `yarn test:coverage` (runs each workspace's `test:coverage`, which collects coverage and fails below the floor its config sets: the site's in the `test` block of its `vite.config.ts`, every other workspace's in its `vitest.config.ts`; Brick Breaker's, Asteroid Breaker's and Brick Fuzz Pop's then run the specs that play or lay out every level or wave, or time a flight, without it). A workspace's `test:coverage` that runs Vitest twice, as those three do, hands each run its arguments (`"$@"`), the root's `--maxWorkers=25%` among them, since Yarn adds them to the last command of a script that names none. A floor holds for the whole suite, so run one spec with `yarn vitest run <path>` from its workspace instead, naming its project where the workspace has several (`yarn vitest run --project pure <path>`), or Vitest starts every project. CI runs it, through `yarn verify:full`; run it before merging into `main`, as the `merge-to-main` skill says.
- **Type Checking:** `yarn typecheck` (runs `tsc` over the `.agents` scripts, the root's `tools/`, the constraints and its `eslint.config.js` from their JSDoc (`tsconfig.scripts.json`), then each workspace's `typecheck`, which checks its lint configs too). Vitest strips types without checking them, so this is the only check a spec's types get.
- **Linting:** `yarn lint` (checks the paths and links in the skills and every `AGENTS.md`, checks every `package.json` against the constraints in `yarn.config.cjs` (`yarn constraints`), checks the lockfile holds no copy `yarn dedupe` would merge (`yarn dedupe --check`), runs ESLint over `.agents`, the root's `tools/`, those constraints and `eslint.config.js` itself with that config, runs each workspace's `lint` with its own config, over its lint configs too, then checks formatting with `yarn prettier:check`).
- **Verification Pipeline:** `yarn verify` (runs `yarn lint && yarn typecheck && yarn test && yarn build`), the check while working.
- **Full Verification Pipeline:** `yarn verify:full` (runs `yarn lint && yarn typecheck && yarn test:coverage && yarn build`), what CI runs.
- **Format Codebase:** `yarn prettier` (formats the whole repository with
  Prettier); `yarn prettier:check` only reports what it would change.

## Running & Debugging

- **Local Testing:** Start the server with `yarn start`, or `yarn dev:all` to work on the site and the games at once, and navigate to `http://localhost:4200/`.
- **Chrome DevTools MCP:** Use the `chrome-devtools-mcp` server to inspect and
  verify the local running site when making UI or behavioral changes.
- **Browser Tools:** Close any browser instance you start for debugging when
  you are done with it, so none are left running.

## Angular and Sass

The site and the games are Angular apps on the shared libraries, and write
their templates and stylesheets alike.

- **Templates bind, they do not compute.** Expose a `computed()` view model
  instead of calling a method from a template, which re-runs on every change
  detection pass, or working out a label, a comparison or a plural there.
- **A `@switch` over a union ends in `@default never;`,** which has the
  compiler hold its cases to every member, as lint holds a TypeScript
  `switch`, so a new member, such as a card or an icon, fails to compile
  rather than showing nothing. The members that show nothing share one
  empty `@case` (`@case ("hidden") @case ("blank") {}`). The compiler can't
  narrow a call, so a signal's value is taken into a `@let` first
  (`@let shownCard = card();`). Over any other value, a `@default { … }`
  says what shows. Lint asks every `@switch` for a `@default`.
- **Visible state is announced state.** A control that looks selected
  carries `aria-checked`, `aria-current` or `aria-pressed`. The rules are
  the `web-game-accessibility` skill's; the template accessibility lint
  rules enforce the common cases.
- **The libraries' pieces first.** Overlays are `<fz-dialog>`, never a
  hand-rolled focus trap, Escape handler or z-index; the question before
  something is lost is `@fz/ui/confirm`'s `ConfirmService.ask()`; buttons
  are `@fz/style`'s `.fz-button`; what changed is said through
  `@fz/ui/announcer`; and icons are `<fz-icon name="…">`, never an inline
  `<svg>`. An icon is hidden from assistive technology, so the text beside
  it, or its control's label, says what it means, and a new one goes into
  `@fz/ui` (`lib/ui/AGENTS.md` says how). The `fuzzley-ui` skill lists the
  rest.
- **Colors and sizes are `@fz/style`'s tokens, by their own names**
  (`--fz-accent`, `--fz-space-3`, `--fz-radius-md`), read with `var()`.
  Stylelint, with `@fz/style`'s preset, rejects a color written anywhere
  else but the one stylesheet where a game keeps colors of its own (the
  Solitaire Collection's card artwork, Minesweeper's and Sudoku's inks). A
  game drawn on a canvas keeps colors of its own in its view's TypeScript
  instead, as Asteroid Breaker's rocks' inks are, since no stylesheet draws
  them; the inks such games share live in `@fz/phaser/color`. A custom
  property of an app's own has no `--fz-` prefix, and exists only where no
  `--fz-*` one will do.
- **Runtime values are custom properties; build-time values are Sass.**
  What changes while the page runs, such as the palette or a gutter, is a
  custom property read with `var()`, and so is what a part of a page may
  change for itself. Sass variables and mixins hold what is fixed at build
  time, such as breakpoints, or only feeds a token.
- **Sass modules, never `@import`.** A stylesheet loads a partial with
  `@use` and reaches its members through the namespace, or through `*` for
  an app's own toolkit; `@import` is deprecated in Dart Sass. A partial's
  private members start with `-`.
- **Breakpoints by name,** never a bare width: the site's `bp.below(sm)`, and
  the games' `below("tablet")` and the rest of `@fz/game-ui`'s mixins.
- **Nest for states and parts** (`&:hover`, `&::before`, `> span`), no more
  than three levels deep, which stylelint enforces. Rules whose order
  decides the cascade, such as media queries that override one another,
  stay flat and together, in order.
- **`@keyframes` used by several components are declared once, globally.**
  Angular renames a component's own `@keyframes`, and the animations using
  them, after the component, so one used by a single component may sit in
  its stylesheet, as the libraries' do.
- **Comment with `//`.** Sass drops it; a `/* */` comment ships, and inside
  a nested rule it even leaves an empty rule behind.
