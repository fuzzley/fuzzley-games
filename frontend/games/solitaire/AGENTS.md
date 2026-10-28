# Solitaire Collection

The `solitaire` workspace: the Solitaire Collection, a browser-based solitaire
engine supporting many variants — Klondike, FreeCell, Spider, Yukon, Forty
Thieves, Montana and the rest of `src/games` — built with Phaser 4 canvas
rendering and an Angular application shell. It was branched off from
fSolitaire with its history. What every game keeps, in
[frontend/games/AGENTS.md](../AGENTS.md), what every workspace keeps, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's rules, in
[.agents/AGENTS.md](../../../.agents/AGENTS.md), apply here too; this
workspace keeps its own for its code. Paths are relative to
`frontend/games/solitaire/`.

## Technology Stack

- **Rendering Engine:** [PhaserJS](https://phaser.io/)
- **UI Shell:** [Angular](https://angular.dev/)
- **Build Toolchain:** [Vite](https://vitejs.dev/) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/) + AnalogJS Vitest Angular runner
- **Language & Runtime:** TypeScript / HTML / Sass (ES2022 output target)

---

## Architecture & Layer Hierarchy

The application enforces a decoupled **`engine -> game`** architecture where game logic, solitaire engine rules, view layout math, canvas rendering, and UI shell components are strictly isolated.

```
                [ src/ui ]                      Angular Application Shell (Header, Navigation, UI Controls)
                    |
       +------------+------------+
       |                         |
       v                         v
 [ src/games ]            [ engine/board ]        Game Rules & Variants | Board Scene for any Table Game
       |                    |         |
       v                    v         v
[ engine/tableau ] <--------+   [ engine/render/phaser ]   Solitaire Runtime & Phaser Canvas Adapter
       |                              |
       +---------------+--------------+
                       |
                       v
               [ engine/render ]       Layout Math, View Contracts, Drag Mathematics (Phaser-free)
                       |
                       v
                [ engine/core ]        Cards, Piles, Decks, Suits, Ranks, RNG (Framework-free)
```

### Layer Breakdown

1. **`src/engine/core`** _(Bottom Tier)_
   - Pure card, suit, rank, deck, pile, and RNG primitives.
   - `common/` holds the helpers every tier shares: an event emitter, readers
     for untrusted JSON, gzip, and base64url.
   - Free of all external dependencies, frameworks, rendering logic, RxJS, Phaser, or Angular.
2. **`src/engine/render`**
   - Renderer-agnostic layout mathematics, view contracts, drag calculations, and input bounds.
   - Contains pure data structures and layout algorithms; free of Phaser imports.
   - `layout/` places a board: `Point`, `Size` and `Rect` (`geometry.ts`),
     the viewport and form factor, a grid (`table_layout.ts`) and its
     measurement for a screen (`table_metrics.ts`), the player's arrangement
     and the grids for it, pile arrangements and drop geometry. `input/` turns
     the pointer into intents and interaction state, `view/` is the per-frame
     contract a renderer draws and the player's choices of how the table
     looks (`presentation.ts`), and `deck/` names the card backs, decks and
     atlas densities the atlas tool builds.
3. **`src/engine/render/phaser`**
   - Phaser 4 adapter implementing the view contracts defined in `src/engine/render`.
   - Draws card textures, scenes, and canvas elements. Stays unaware of specific game rules or UI components.
   - `deck/` loads the card atlases and draws the mobile deck at a board's
     exact size, and `scene/` is each board: the scene, its sprites, input,
     renderer and the light on the felt. The game and its canvas are
     `@fz/phaser`'s.
4. **`src/engine/tableau`**
   - Solitaire-family generic runtime engine (zones, rules, moves, undo history, dealing, gesture maps, table view builder).
   - `Tabletop` holds the piles and makes every change to them: `relocate` and `rearrange` for changes undo takes back, `Deal` for laying a game out.
   - Serves as the generic execution engine for every game in `src/games` without depending on a specific renderer backend or game variant.
   - `game/` holds the spine: `TableGame`, `DealtTableGame` and the
     `Tabletop` they keep their piles on. `rules/` is the rule vocabulary
     (placement combinators, adjacency, builds, grab rules, `runColumn`) and
     depends on core alone; `zones/` declares a game's piles (`ZoneSpec`, its
     look, the zone builders, pile markers); `moves/` holds the move records,
     the history, and `resolveMove` (`move_legality.ts`), which turns a
     requested move into the stack and piles it acts on; `dealing/` the deal; `session/` what the shell runs, saves and
     restores a game through; `gestures/` maps intents to moves; and `view/`
     builds each frame's view state from a game.
5. **`src/engine/board`**
   - Joins a table game to the Phaser adapter: `makeTableBoardScene` (`src/engine/board/table_board_scene.ts`) turns any `TableGame` plus its layout and gesture map into a `BoardScene`.
   - The only tier that may import both `engine/tableau` and `engine/render/phaser`. There is no separate scene-bridge tier above it: the canvas swaps in whatever board it is handed.
6. **`src/games/*`** _(Top of Engine Tier)_
   - Game-specific deal rules, scoring mechanics, layout setup, and gesture handling — one directory per game (`games/klondike`, `games/freecell`, `games/montana`, …).
   - Code shared between games lives in `games/common`: collecting completed runs, drawing and recycling a stock, dealing a card to every column, pairing, zone presets, pile markers, and `arranged_layouts.ts`, which derives a game's grids for every arrangement and screen from a short account of its board (or completes the phone grids of a board laid out by hand).
   - A different board grid means a different catalog entry; the same grid under different rules means a variant option on an existing one. See the `add-solitaire-game` skill.
   - Sits above the engine's runtime but beside `engine/board`: a game knows nothing of the renderer, and the shell's provider folder joins a game to its board.
7. **`src/ui/*`** _(Application Shell)_
   - Angular application shell hosting the game canvas viewport, control overlays, and variant selection UI.

### UI Shell Structure

- **`src/ui/app/provider`** — the data the shell is built around, and the only
  place a game is named. `game_catalog.ts` declares every game (id, name, rules,
  layout and, optionally, phone grids, how to deal one) and is Phaser-free; `board_catalog.ts` maps those ids
  to each game's gestures through a mapped type, so a game without them is a
  compile error, and draws every game on the grid its entry declares.
  `game_documentation_data.ts` supplies the rules pages behind
  an injection token, so specs can swap in their own; `game_profile_data.ts`
  does the same for the family, difficulty and tagline the game browser lists
  each game by, and `bug_report_config.ts` for where a bug report is filed and
  which build filed it.
- **`src/ui/app/service`** — `GameCatalogService` owns which game is on the
  table (routed, see below); `GameMetricsService` reads the running game, and
  times it with `@fz/game-ui/stopwatch`'s `StopwatchService`;
  `GameLifecycleService` changes it, asking first through `@fz/ui/confirm`
  when there is a game to lose; the rest are small and single-purpose
  (presentation, including the felt, documentation, game browser, recent
  games, bug report, saved game). They keep what they store through
  `@fz/ui/storage`'s `LocalStorageService`.
- **`src/ui/app/component`** — one folder per component. `option_group` is
  the shared one: every settings control is one. Every overlay is a native
  `<dialog>` through `@fz/ui/dialog`'s `<fz-dialog>`. `header_bar` fills
  `@fz/game-ui`'s `<fz-game-bar>` (`frontend/lib/game-ui/AGENTS.md`) with
  the game switcher, the score, time and moves and the actions, and decides
  where the bar stands and how it shows the link home: the wordmark from
  1280 CSS px up (`WORDMARK_MIN_WIDTH_PX`), the home button below that, and
  below 360 (`HOME_BUTTON_MIN_WIDTH_PX`) the first item of the overflow
  menu, `<fz-bar-overflow>`, which holds what a compact bar has no room for.
- **`src/ui/app/styles`** — the Sass design system. `global.scss` is loaded once
  from `main.ts` and is the only stylesheet outside a component; `_index.scss`
  is the toolkit every component `@use`s, and deliberately emits no CSS.
- **Phone layouts** — the shell and the board agree on a form factor: roomy,
  a phone held upright, or one on its side, where compact means narrower than
  720 or shorter than 500 CSS px (`@fz/game-ui/breakpoints`, which
  `src/engine/render/layout/form_factor.ts` reads for the board and
  `GameViewportService.formFactor` for the shell). Upright, the header docks
  at the bottom; on its side it is a rail down one edge; the canvas declares
  `--fz-canvas-inset-*` for whichever edge the chrome covers, from the bar's
  size, which `styles/_tokens.scss` publishes as `--fz-bar-height` and
  `--fz-rail-width` through `@fz/game-ui`'s `bar-size()`. A game whose catalog entry names
  `arrangement` (most of them) lies on a grid chosen each frame by
  `chooseTableLayout` (`src/engine/render/layout/board_layouts.ts`) from the
  form factor and the player's arrangement: the piles at the top or the
  bottom and, where the game names a side pile, that pile (the stock, or such
  as FreeCell's free cells) at the left or the right, each with an Auto that
  `resolveArrangement` decides (bottom and right on a phone, top and left on a
  roomy screen). The choices are stored once for every game, and the drawer
  names them in each game's words. Its columns fan to fit the room below
  them, and the chrome on a phone stands opposite the side the player chose.
  The `add-solitaire-game` skill says how to give a game these grids.
- **Routing** — which game is on the table is a `:gameId` route
  (`src/ui/app/routes.ts`), using hash location because the built application is
  copied into a subdirectory of a static host that will not rewrite paths.

### Styling (Sass)

Stylesheets are `.scss`. Every component sheet opens with the same line, which
brings in the mixins and breakpoints and nothing else:

```scss
@use "../../styles" as *;
```

The frontend's Angular and Sass rules apply, and the `solitaire-styles`
skill says more; on top of them:

- **`styles/_tokens.scss` holds only this game's own tokens:** the
  translucent mixes of `@fz/style`'s roles it needs (`--surface-card`,
  `--surface-scrim-heavy`), declared on `:root, [data-theme]` as the
  library's tints are; the table (`--table-felt`); the card artwork's
  colours, cut from `_palette.scss`, the one stylesheet stylelint lets
  write a colour; and its layout and stacking, with the game bar's size
  from `@fz/game-ui`.
- **A pattern is a mixin, a value is a token.** Several declarations that
  only make sense together are a mixin, because view encapsulation means a
  class cannot be shared between components. The ones every app shares are
  `@fz/style`'s toolkit, which `styles/_index.scss` forwards; only this
  game's own (`spinner-ring()` and `panel-card()`) are in
  `styles/_mixins.scss`, until another app needs one. The settings' headings
  and tiles are the toolkit's `field-label()` and `choice-tile()`, which
  every game's dialogs share.
- **Three breakpoints, by name.** `@include below("phone" | "tablet" |
"desktop")`. `tablet` and `desktop` are `@fz/game-ui`'s; `phone` is this
  game's own, in `styles/_breakpoints.scss`, where another of its own would
  go too, saying what it protects. Anything that follows the compact chrome
  uses `@include compact`, `phone-portrait` or `phone-landscape` instead,
  which also catch a phone on its side.
- **Shared `@keyframes` are in `_animations.scss`.**
- **Solitaire has no button styles of its own.** A component's own class
  beside `.fz-button`'s, such as `btn-play`, is a hook for its stylesheet
  and specs, not a style.
- **The settings' card-deck preview is a drawing,** not an icon, so it
  stays inline.

---

## Lint-Enforced Architectural Boundaries

Architecture guidelines are enforced as hard build errors rather than conventions via ESLint (`eslint.config.js`, on top of `@fz/dev`'s shared blocks) using `@typescript-eslint/no-restricted-imports`. Each tier may depend only on the tiers below it:

| Tier / Directory                      | Allowed Dependencies                             | Explicitly Restricted Imports (`@typescript-eslint/no-restricted-imports`)                                                  |
| :------------------------------------ | :----------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `src/engine/core`                     | Standard TS primitives                           | `@/engine/board/*`, `@/engine/render/*`, `@/engine/tableau/*`, `@/games/*`, `@/ui/*`, `phaser`, `@angular/*`, `rxjs`        |
| `src/engine/render` _(excl. phaser/)_ | `engine/core`                                    | `phaser`, `@/engine/board/*`, `@/engine/render/phaser/*`, `@/engine/tableau/*`, `@/games/*`, `@/ui/*`, `@angular/*`, `rxjs` |
| `src/engine/render/phaser`            | Phaser 4, `engine/core`, `engine/render`         | `@/engine/board/*`, `@/engine/tableau/*`, `@/games/*`, `@/ui/*`, `@angular/*`, `rxjs`                                       |
| `src/engine/tableau`                  | `engine/core`, `engine/render`                   | `phaser`, `@/engine/board/*`, `@/engine/render/phaser/*`, `@/games/*`, `@/ui/*`, `@angular/*`, `rxjs`                       |
| `src/engine/board`                    | every `engine/*` tier, Phaser 4                  | `@/games/*`, `@/ui/*`, `@angular/*`, `rxjs`                                                                                 |
| `src/games/*`                         | `engine/core`, `engine/render`, `engine/tableau` | `phaser`, `@/engine/render/phaser/*`, `@/engine/board/*`, `@/ui/*`, `@angular/*`, `rxjs`                                    |
| `src/ui` _(excl. app/provider/)_      | everything but games                             | `@/games/*`                                                                                                                 |

Note that the board is shown in `@fz/phaser`'s `<fz-phaser-canvas>`
([frontend/lib/phaser/AGENTS.md](../../lib/phaser/AGENTS.md)), which
`GameCanvasComponent` hands each board to run, so the shell never imports a
game module in order to host one. It keeps one Phaser game, and so one WebGL
context, for its whole life, and swaps each new board scene into it. A board
scene therefore has to release everything it subscribed to when it ends, on
`SHUTDOWN` or `DESTROY`, because the game it ran in lives on: it does so
through `@fz/phaser/scene`'s helpers.

---

## In This Repository

What every game keeps is in `frontend/games/AGENTS.md`. Here:

- **The site serves it at `/play/solitaire/`,** with a hash router, and
  links each game by its `#/<id>` route. The build writes every game's id
  and name, from `GAME_CATALOG`, into `dist/game.json` (`vite.config.ts`
  names the catalog to `gameConfig()`), and the site's catalog keeps its
  own copy of the names and shows the screenshots under
  `public/docs/screenshots/<id>/`, so renaming a game or its id, or dropping
  its screenshots, fails the site's build until the site follows.
- **The felt follows the palette.** The chrome wears the palette in use,
  light or dark, and the settings drawer offers the choice; the felt is
  the palette's own (`ThemeService.role("felt")`) unless the player chose
  another, which `PresentationSettingsService` resolves and stores as
  `felt`, and the browser's toolbar takes the felt too.
- **Its saved games**, the game in play, the settings and the recent
  games, are in `localStorage` under keys that start with `fsolitaire-`,
  in the services under `src/ui/app/service/`. The recent games and the
  presentation settings carry a version, through `LocalStorageService`'s
  `writeVersioned()`, and still read the bare entries builds before
  versions stored.
- **Bug reports are filed here.** "Report a Bug" opens the repository's issue
  form, `.github/ISSUE_TEMPLATE/solitaire_bug_report.yml`, filled in, and
  names the commit the Docker build was made from, which `vite.config.ts`
  takes from `COMMIT_SHA`. `test/ui/app/service/bug_report.service.spec.ts`
  checks the form has every field the game fills in, and `vitest.config.ts`
  lets it read the form from outside `frontend/`.
- **Its history began in fSolitaire.** The commits before the branch came
  from fSolitaire's repository, which keeps them under their original ids;
  nothing here depends on it, and the two may diverge. `docs/` holds the
  design notes and work logs from then, and the lossless screenshots the
  site's images are made from.
- **Accessibility.** The rules are the repository's `web-game-accessibility`
  skill's. Here, an icon-only button's screen-reader label comes from the
  `visually-hidden()` mixin, and every overlay is an `<fz-dialog>`.

---

## Development Commands

Run these from `frontend/games/solitaire/`, or as
`yarn workspace solitaire <script>` from `frontend/`. The root's `yarn lint`,
`yarn typecheck`, `yarn test` and `yarn build` run this workspace's with the
others', and check its formatting and skill references there.

- **Run Development Server:** `yarn start` or `yarn dev` (launches Vite dev server at `http://localhost:9000/`; Minesweeper's uses 9001). `yarn dev:all`, from `frontend/`, runs it with the site's and serves it at the site's `/play/solitaire/`.
- **Build Card Atlas:** `yarn build:atlas` (runs `tools/build-card-atlas.mjs` to cut the SVG card sheets, and generate the `mobile` deck, into texture atlas files; `--deck <id>` builds one deck, `--preview` draws a contact sheet of every deck at phone scale).
- **Capture Screenshots:** `yarn capture:screenshots [id ...]` (runs `tools/capture-screenshots.mjs` to capture each game's rules-page screenshot, or only the games named, from the running dev server in headless Chrome, through `@fz/dev/chrome`: the whole page at 1440 × 810 and 2×, on a fresh deal with every setting at its default, saved losslessly to `docs/screenshots/<id>/overview.png`, outside `public/`; `--chrome <path>` or `CHROME_PATH` picks the browser).
- **Build Screenshot Thumbnails:** `yarn build:thumbs` (runs `tools/build-screenshot-thumbs.mjs` to make the images the site serves from each game's lossless screenshot, into `public/docs/screenshots/<id>/`: the rules page's `overview.webp` (1600 × 900, the whole page), the game browser's `thumb.webp` (576 × 324, cropped to the board), and `preview.webp` (2560 × 1440, the whole page), each through `@fz/dev/screenshots`, which holds the site's two images' names and sizes; Klondike's preview is also the link preview image in `index.html`, and the site's catalog shows `thumb.webp` and `preview.webp` too).
- **Production Build:** `yarn build` (generates bundled production assets in `dist/`, with Phaser in a chunk of its own, from `gameConfig()`).
- **Run Unit Tests:** `yarn test` (runs the whole suite once, with coverage, failing below the floor) or `yarn test:watch`; `yarn vitest run <path>` runs one spec without coverage.
- **Linting:** `yarn lint` (runs ESLint over `src`, `test`, `tools` and the Vite configs, with `@fz/dev`'s blocks, the tier fences above, and the one rule the Phaser adapter is let off, then `yarn lint:styles`, which runs stylelint over every stylesheet with `@fz/style`'s preset (`stylelint.config.js`): the standard SCSS rules, no colour written outside `_palette.scss`, Sass modules, nesting at most three deep).
- **Type Checking:** `yarn typecheck` (runs the Angular compiler's checks over the app (`tsconfig.app.json`), then `tsc` over the tests (`tsconfig.spec.json`), the Vite configs (`tsconfig.node.json`) and the Node scripts in `tools/` (`tsconfig.scripts.json`), emitting nothing, each with `@fz/dev`'s compiler options).

---

## Tests

The repository's rules for specs apply. On top of them:

- **Specs live under `test/`,** in a tree that mirrors `src/`, not beside the
  file they test. This workspace's `solitaire-testing` skill covers the
  setup and the fixtures, and the repository's `angular-testing` the
  patterns its shell's specs share with the other Angular workspaces'.
- **Test Coverage:** `vitest.config.ts` enforces a coverage floor a little under the suite's real figures; `yarn test`, which CI runs, fails below it. Raise the floor as the real figures rise.
- **UI Test Doubles:** `test/support/ui` holds the shell's doubles — the game, catalog, presentation and documentation mocks — plus `configureUiTestBed` (`test/support/ui/testbed.ts`), which wires them into a TestBed with `@fz/phaser/testing`'s fake canvas. Prefer it over assembling providers by hand. The catalog mock is typed as a `Pick` of the real service so it cannot drift out of shape unnoticed.
- **Phaser runs for real.** The board and its pieces are specced on real Phaser, in jsdom, through `@fz/phaser/testing`'s headless harness, which `test/test-setup.ts` installs; no spec mocks Phaser, and one that imports it, even through the board catalog, asks for jsdom. The `solitaire-testing` skill says how a spec runs a board.
- **Don't Assert Production Prose:** A component spec should not depend on the wording of a rules page. Use the test documentation registry, which `configureUiTestBed` provides.

---

## Skills

This workspace's skills are in `.agents/skills/`: `add-solitaire-game`,
`solitaire-phaser` (how it draws its cards with Phaser, after the
repository's `phaser-core`, which lists the rest of the Phaser skills),
`solitaire-styles`, `solitaire-types`, `solitaire-build` and
`solitaire-testing`. `node .agents/link-claude-skills.mjs`, run from the
repository's root, links them into this folder's `.claude/skills/`, where
Claude Code loads them once it works on a file here.
