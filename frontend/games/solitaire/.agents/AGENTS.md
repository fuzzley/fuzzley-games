# fSolitaire

Browser-based Solitaire engine supporting many solitaire variants — Klondike, FreeCell, Spider, Yukon, Forty Thieves, Montana and the rest of `src/games` — built with Phaser 4 canvas rendering and an Angular 22 application shell.

## Technology Stack

- **Rendering Engine:** [PhaserJS](https://phaser.io/) (v4)
- **UI Shell:** [Angular](https://angular.dev/) (v22)
- **Build Toolchain:** [Vite](https://vitejs.dev/) (v8) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/) (v5) + AnalogJS Vitest Angular runner
- **Language & Runtime:** TypeScript (v6) / HTML / Sass (ES2022 output target)
- **Package Manager:** Yarn 4 (`yarn@4.17.1` via Corepack)

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
   - `host/` keeps the one Phaser game and its canvas for the app's life,
     `deck/` loads the card atlases and draws the mobile deck at a board's
     exact size, and `scene/` is each board: the scene, its sprites, input,
     renderer and the light on the felt.
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
   - The only tier that may import both `engine/tableau` and `engine/render/phaser`. There is no separate scene-bridge tier above it: `PhaserHost` swaps in whatever board it is handed.
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
  table (routed, see below); `GameMetricsService` reads the running game;
  `GameLifecycleService` changes it, behind a confirmation when there is a game
  to lose; the rest are small and single-purpose (timer, storage,
  presentation, including the felt, documentation, game browser, recent
  games, bug report, saved game).
- **`src/ui/app/component`** — one folder per component. `modal_dialog` and
  `option_group` are the shared ones: every overlay is a native `<dialog>` via
  the first, and every settings control is the second.
- **`src/ui/app/styles`** — the Sass design system. `global.scss` is loaded once
  from `main.ts` and is the only stylesheet outside a component; `_index.scss`
  is the toolkit every component `@use`s, and deliberately emits no CSS.
- **Phone layouts** — the shell and the board agree on a form factor: roomy,
  a phone held upright, or one on its side, where compact means narrower than
  720 or shorter than 500 CSS px (`src/engine/render/layout/form_factor.ts`,
  `ViewportService.formFactor`). Upright, the header docks at the bottom; on
  its side it is a rail down one edge; the canvas declares `--board-inset-*`
  for whichever edge the chrome covers. A game whose catalog entry names
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

- **Tokens are custom properties; Sass builds them.** Colour, surface, spacing,
  type, radius, elevation, motion, layout and z-index all live in `:root` in
  `styles/_tokens.scss`, cut from the source colours in `_palette.scss`.
  Component CSS reads them with `var()` — never a colour, spacing or font-size
  literal. Reach for Sass when the value cannot be a custom property (media
  query widths) or when it is only ever a compile-time input to a token.
- **A pattern is a mixin, a value is a token.** Several declarations that only
  make sense together — `glass()`, `gradient-text()`, `icon-button()`,
  `transition()`, `visually-hidden()` — go in `styles/_mixins.scss`, because
  view encapsulation means a class cannot be shared between components. One
  declaration is a token, not a mixin.
- **Three breakpoints, by name.** `@include below("phone" | "tablet" |
"desktop")`; never a raw pixel width. Adding a fourth means adding it to
  `$breakpoints` and saying what it protects. Anything that follows the compact
  chrome uses `@include compact`, `phone-portrait` or `phone-landscape`
  instead, which also catch a phone on its side.
- **`@keyframes` are global — declare them in `_animations.scss`.** Angular's
  emulated encapsulation rewrites selectors, not at-rule names, so two
  components defining the same animation name silently overwrite each other.
- **Comment with `//`.** Sass strips it, so notes explaining the source do not
  ship to the browser.
- **Overlays are `<dialog>`.** Wrap content in `<app-modal-dialog>` rather than
  hand-rolling a focus trap, an Escape handler or a z-index.
- **Templates bind, they do not compute.** Expose a `computed()` view model
  instead of calling a method from a template, which re-runs on every change
  detection pass.
- **Visible state is announced state.** A control that looks selected carries
  `aria-checked`/`aria-current`/`aria-pressed`. The template accessibility lint
  ruleset is enabled and enforces the common cases.

---

## Lint-Enforced Architectural Boundaries

Architecture guidelines are enforced as hard build errors rather than conventions via ESLint (`eslint.config.cjs`) using `@typescript-eslint/no-restricted-imports`. Each tier may depend only on the tiers below it:

| Tier / Directory                      | Allowed Dependencies                             | Explicitly Restricted Imports (`@typescript-eslint/no-restricted-imports`)                                                  |
| :------------------------------------ | :----------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `src/engine/core`                     | Standard TS primitives                           | `@/engine/board/*`, `@/engine/render/*`, `@/engine/tableau/*`, `@/games/*`, `@/ui/*`, `phaser`, `@angular/*`, `rxjs`        |
| `src/engine/render` _(excl. phaser/)_ | `engine/core`                                    | `phaser`, `@/engine/board/*`, `@/engine/render/phaser/*`, `@/engine/tableau/*`, `@/games/*`, `@/ui/*`, `@angular/*`, `rxjs` |
| `src/engine/render/phaser`            | Phaser 4, `engine/core`, `engine/render`         | `@/engine/board/*`, `@/engine/tableau/*`, `@/games/*`, `@/ui/*`, `@angular/*`, `rxjs`                                       |
| `src/engine/tableau`                  | `engine/core`, `engine/render`                   | `phaser`, `@/engine/board/*`, `@/engine/render/phaser/*`, `@/games/*`, `@/ui/*`, `@angular/*`, `rxjs`                       |
| `src/engine/board`                    | every `engine/*` tier, Phaser 4                  | `@/games/*`, `@/ui/*`, `@angular/*`, `rxjs`                                                                                 |
| `src/games/*`                         | `engine/core`, `engine/render`, `engine/tableau` | `phaser`, `@/engine/render/phaser/*`, `@/engine/board/*`, `@/ui/*`, `@angular/*`, `rxjs`                                    |
| `src/ui` _(excl. app/provider/)_      | everything but games                             | `@/games/*`                                                                                                                 |

Note that the generic Phaser canvas host is `engine/render/phaser/host/phaser_host.ts`
(`PhaserHost`). It is handed a board to run, so the shell never imports a game
module in order to host one. It keeps one Phaser game, and so one WebGL context,
for the canvas component's whole life, and swaps each new board scene into it.
A board scene therefore has to release everything it subscribed to when it ends,
on `SHUTDOWN` or `DESTROY`, because the game it ran in lives on.

---

## Build & Deploy System

### Package Manager

This project uses **Yarn 4**. Always use Yarn commands instead of NPM (`yarn <command>`).

### Development Commands

- **Run Development Server:** `yarn start` or `yarn dev` (launches Vite dev server at `http://localhost:9000/`).
- **Stop Development Servers:** `yarn stop` (runs `tools/stop-dev-servers.mjs` to force stop every Vite dev server running from this checkout, with the yarn processes that launched it, on Windows and Linux; `--dry-run` lists them without stopping them).
- **Build Card Atlas:** `yarn build:atlas` (runs `tools/build-card-atlas.mjs` to cut the SVG card sheets, and generate the `mobile` deck, into texture atlas files; `--deck <id>` builds one deck, `--preview` draws a contact sheet of every deck at phone scale).
- **Capture Screenshots:** `yarn capture:screenshots [id ...]` (runs `tools/capture-screenshots.mjs` to capture each game's rules-page screenshot, or only the games named, from the running dev server in headless Chrome: the whole page at 1440 × 810 and 2×, on a fresh deal with every setting at its default; `--chrome <path>` or `CHROME_PATH` picks the browser).
- **Build Screenshot Thumbnails:** `yarn build:thumbs` (runs `tools/build-screenshot-thumbs.mjs` to shrink each game's rules-page screenshot into the game browser's `thumb.webp`, cropped to the board, and `preview.webp`, the whole page; Klondike's is also the link preview image in `index.html`).
- **Production Build:** `yarn build` (generates bundled production assets in `dist/` with Phaser manual chunking).
- **Run Unit Tests:** `yarn test` (runs Vitest once) or `yarn test:watch` / `yarn test:coverage`.
- **Linting:** `yarn lint` (checks the skills' references, runs ESLint over `src`, `test`, `tools` and `.agents`, then checks formatting with `yarn prettier:check`).
- **Type Checking:** `yarn tsc` (runs TypeScript compiler checks for the app, the tests, and the Node scripts in `tools/` and `.agents/` through `tsconfig.scripts.json`, emitting nothing).
- **Full Verification Pipeline:** `yarn verify` (runs `yarn lint && yarn tsc && yarn build && yarn test`).
- **Format Codebase:** `yarn prettier` (runs Prettier auto-formatting across the repository).

### CI/CD Deployment Pipeline (`.github/workflows/deploy.yml`)

Deployments are automated via GitHub Actions on every push to `main` (or manual `workflow_dispatch`). A pull request into `main` runs the `verify` job only:

1. **`verify` Job (Quality Gate):**
   - Restores Yarn's package cache, keyed on `yarn.lock`, and installs dependencies (`yarn install --immutable`).
   - Executes `yarn lint`, `yarn tsc`, and `yarn test`.
   - Pipeline aborts if any step fails.
2. **`build-and-sync` Job** (never for a pull request, and one deploy at a time):
   - Runs `yarn build` to produce production assets in `dist/`, with
     `VITE_COMMIT_SHA` set so a bug report filed from the site names its build.
   - Clones the target host website repository (`fuzzley/fuzzley`).
   - Copies `dist/*` assets to `main-website/frontend/public/project/solitaire`.
   - Automatically commits and pushes asset updates to `fuzzley/fuzzley`.

---

## Running & Debugging

- **Debugging:** Chrome DevTools MCP support is enabled. Use it to inspect
  element states, logs, and game behavior. Always close any Chrome instance
  started via Chrome DevTools MCP when done using it to prevent lingering
  unused Chrome instances.
- **Local Game Testing:** Start the server with `yarn start` and navigate to `http://localhost:9000/`.

---

## Agent Configuration (`.agents/`)

`.agents/` is the committed, tool-neutral home for everything agents read. The
per-tool directories (`.claude/`, `.gemini/`) are gitignored and machine-local.

- **Instructions:** this file. The root `AGENTS.md` and `CLAUDE.md` are thin
  pointers to it, because those are the filenames agents actually look for —
  `AGENTS.md` for Codex, Cursor, Copilot, and Amp; `CLAUDE.md` for Claude Code,
  which does not read `AGENTS.md`. Edit this file, not the pointers.
- **Skills:** `.agents/skills/<name>/SKILL.md`. Gemini CLI reads this path
  directly. Claude Code only discovers `.claude/skills/<name>/SKILL.md`, so
  **`yarn skills:link`** links each skill across (a junction on Windows). The
  links hold absolute paths inside gitignored `.claude/`, so re-run it after a
  fresh clone or a move — a dangling link silently drops the skill. Restart
  Claude Code if `.claude/skills` did not exist when the session started.
- **Flat skills directory.** Every skill lives directly under
  `.agents/skills/<name>/SKILL.md`, including the namespaced `phaser-*` ones.
  Adding a skill means a new top-level directory plus a `yarn skills:link`
  re-run.
- **A skill describes code that exists.** Skills are read as authoritative, so
  an agent follows an invented path into a compile error rather than looking.
  A design for something not yet built belongs in a doc or an issue, not in a
  skill. `yarn skills:check` (part of `yarn lint`) enforces the checkable half
  of this: every relative markdown link between skills must resolve, and every
  backticked repo path must exist. Skills quoting another project's source tree
  are listed as upstream exceptions in `.agents/check-skill-references.mjs`;
  a skill about this repository is checked by default.
- **Vendored skills:** `angular-developer` and `angular-new-app` come from
  upstream and are hash-locked in `skills-lock.json`. They are listed in
  `.prettierignore` so formatting does not defeat the lock; do not hand-edit
  them.

---

## Coding Best Practices

- **Dependency Injection:** Avoid hardcoded dependencies. Prefer taking dependencies in the constructor or function parameters.
- **TypeScript Style:** Follow Google's TypeScript style guide (https://google.github.io/styleguide/tsguide.html).

---

## Writing Documentation

These rules cover every doc comment: classes, interfaces, functions, HTML, SCSS, workflows and scripts.

- **Open with one sentence.** The first paragraph is a single sentence that briefly says what the thing does or what it is for.
- **Classes and interfaces:** Write the sentence as if "This class", "This interface", or "An instance of this class" came before it, e.g. `Records the moves a game has applied so they can be taken back.`, not `This class records…` or `A class that records…`.
- **Functions and methods:** Write in the third person, always starting with a verb phrase, as if "This function" came before it, e.g. `Returns the pile under a point.` or `Moves the top card to its foundation.`
- **Further paragraphs are rare.** Add additional paragraphs only when it stops a caller from misusing the code, or when it answers a "why" that a reader is very likely to ask and cannot answer from the name or the code itself. Don't use one to restate the implementation, list alternatives you rejected, or tell the history of the code.
- **`@param` and `@returns` only when they add something.** In TypeScript, leave them out when they only repeat the name and type or when they are already described sufficiently in the description.
- **A script writes down every type.** The `.mjs` scripts under `tools/` and `.agents/` are plain JavaScript, so a JSDoc tag is the only place a type can go. Every parameter has an `@param {Type} name`, and every function that returns a value has an `@returns {Type}`, described only when the description adds something. A shape used more than once is a `@typedef`, which another script takes with `@import` rather than spelling it out again. `yarn lint` requires the tags (`eslint-plugin-jsdoc`), and `yarn tsc` checks the types under `strict` (`tsconfig.scripts.json`).
- **Inline comments follow the same rules:** Only write implementation comments for what the code cannot say for itself (e.g. disambiguate a "why" that a user is very likely to ask after reading the code).

```ts
// Too much
/**
 * Subscribes a listener to a specific event.
 *
 * Subscriptions are managed using a registry that maps event names to arrays of
 * listener functions. This allows for efficient registration and unregistration
 * of listeners without the need for manual cleanup.
 *
 * @param event The name of the event to listen for.
 * @param listener The callback function to invoke when the event is emitted.
 * @returns Unsubscribes the listener. Handing back a disposer means a caller
 *   that subscribes an inline closure can still let go of it, without having
 *   to keep a reference around to pass to {@link off}.
 */

// Enough
/** Subscribes a listener to an event and returns a function that unsubscribes it. */
```

---

## Writing Unit Tests

- **Test Coverage:** Maintain high test coverage after modifying code. `vitest.config.ts` enforces a coverage floor a little under the suite's real figures; `yarn test:coverage` fails below it. Raise the floor as the real figures rise.
- **UI Test Doubles:** `test/support/ui` holds the shell's doubles — the game, catalog, presentation and documentation mocks — plus `configureUiTestBed`, which wires them into a TestBed. Prefer it over assembling providers by hand. The catalog mock is typed as a `Pick` of the real service so it cannot drift out of shape unnoticed.
- **Don't Assert Production Prose:** A component spec should not depend on the wording of a rules page. Use the test documentation registry, which `configureUiTestBed` provides.
- **Arrange, Act, Assert:** Structure each test case cleanly: arrange block, act block, assert block. Avoid multiple AAA cycles per test case; create focused test cases instead.
- **Simple Test Logic:** Avoid complex conditional logic in unit tests. Keep tests readable and explicit.
- **Test Helpers:** Abstract verbose setup into helper functions, ensuring test intent remains clear.
- **Test via Public API:** Avoid accessing private fields or methods (and avoid using `as any` or bracket property accessors to bypass visibility).
- **Verifying State > Verifying Interaction:** Prefer asserting resulting state over checking call counts/interactions, reserving interaction mocks only for when state cannot be inspected directly.
- **Real Objects > Mocks:** Use real object instances instead of mocks whenever feasible.
- **Avoid Any Casts:** Avoid `as any`. Use proper typing or `instance as unknown as TargetType` as a last resort.
