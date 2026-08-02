# fSolitaire

Browser-based Solitaire engine supporting multiple solitaire variants (Klondike, FreeCell, Spider) built with Phaser 4 canvas rendering and an Angular 22 application shell.

## Technology Stack

- **Rendering Engine:** [PhaserJS](https://phaser.io/) (v4)
- **UI Shell:** [Angular](https://angular.dev/) (v22)
- **Build Toolchain:** [Vite](https://vitejs.dev/) (v8) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/) (v4) + AnalogJS Vitest Angular runner
- **Language & Runtime:** TypeScript (v6) / HTML / Sass (ES2022 output target)
- **Package Manager:** Yarn 4 (`yarn@4.17.1` via Corepack)

---

## Architecture & Layer Hierarchy

The application enforces a decoupled **`engine -> game`** architecture where game logic, solitaire engine rules, view layout math, canvas rendering, and UI shell components are strictly isolated.

```
       [ src/ui ]              Angular Application Shell (Header, Navigation, UI Controls)
           |
      [ src/games ]            Game Rules & Variants (Klondike, FreeCell, Spider)
           |
     [ src/game/render ]       Phaser Scene Bridge / Integration Binding
           |
  +--------+--------+
  |                 |
  v                 v
[ engine/tableau ] [ engine/render/phaser ]   Solitaire Runtime & Phaser Canvas Adapter
  |                 |
  +--------+--------+
           |
           v
   [ engine/render ]           Layout Math, View Contracts, Drag Mathematics (Phaser-free)
           |
           v
    [ engine/core ]            Cards, Piles, Decks, Suits, Ranks, RNG (Framework-free)
```

### Layer Breakdown

1. **`src/engine/core`** *(Bottom Tier)*
   - Pure card, suit, rank, deck, pile, and RNG primitives.
   - Free of all external dependencies, frameworks, rendering logic, RxJS, Phaser, or Angular.
2. **`src/engine/render`**
   - Renderer-agnostic layout mathematics, view contracts, drag calculations, and input bounds.
   - Contains pure data structures and layout algorithms; free of Phaser imports.
3. **`src/engine/render/phaser`**
   - Phaser 4 adapter implementing the view contracts defined in `src/engine/render`.
   - Draws card textures, scenes, and canvas elements. Stays unaware of specific game rules or UI components.
4. **`src/engine/tableau`**
   - Solitaire-family generic runtime engine (tableau layout rules, zones, moves, undo/redo stack, table view builder).
   - Serves as the generic execution engine for Klondike, FreeCell, and Spider without depending on a specific renderer backend or game variant.
5. **`src/games/*`** *(Top of Engine Tier)*
   - Game-specific deal rules, scoring mechanics, layout setup, and gesture handling (`games/klondike`, `games/freecell`, `games/spider`).
   - Sits above `engine/*` layers, but below the Angular UI application shell.
6. **`src/game/render`**
   - Phaser scene bridge connecting the active game runtime with Phaser scene lifecycles.
7. **`src/ui/*`** *(Application Shell)*
   - Angular application shell hosting the game canvas viewport, control overlays, and variant selection UI.

### UI Shell Structure

- **`src/ui/app/provider`** — the data the shell is built around, and the only
  place a game is named. `game_catalog.ts` declares every game (id, name, rules,
  layout, how to deal one) and is Phaser-free; `board_catalog.ts` maps those ids
  to Phaser board factories through a mapped type, so a game without a board is
  a compile error. `game_documentation_data.ts` supplies the rules pages behind
  an injection token, so specs can swap in their own.
- **`src/ui/app/service`** — `GameCatalogService` owns which game is on the
  table (routed, see below); `GameMetricsService` reads the running game;
  `GameLifecycleService` changes it, behind a confirmation when there is a game
  to lose; the rest are small and single-purpose (theme, timer, storage,
  presentation, documentation, menu).
- **`src/ui/app/component`** — one folder per component. `modal_dialog` and
  `option_group` are the shared ones: every overlay is a native `<dialog>` via
  the first, and every settings control is the second.
- **`src/ui/app/styles`** — the Sass design system. `global.scss` is loaded once
  from `main.ts` and is the only stylesheet outside a component; `_index.scss`
  is the toolkit every component `@use`s, and deliberately emits no CSS.
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
  `$breakpoints` and saying what it protects.
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

| Tier / Directory | Allowed Dependencies | Explicitly Restricted Imports (`@typescript-eslint/no-restricted-imports`) |
| :--- | :--- | :--- |
| `src/engine/core` | Standard TS primitives | `@/engine/render/*`, `@/engine/tableau/*`, `@/games/*`, `@/ui/*`, `phaser`, `@angular/*`, `rxjs` |
| `src/engine/render` *(excl. phaser/)* | `engine/core` | `phaser`, `@/engine/render/phaser/*`, `@/engine/tableau/*`, `@/games/*`, `@/ui/*`, `@angular/*`, `rxjs` |
| `src/engine/render/phaser` | Phaser 4, `engine/core`, `engine/render` | `@/engine/tableau/view/table_view_builder`, `@/games/*`, `@/ui/*`, `@angular/*`, `rxjs` |
| `src/engine/tableau` | `engine/core`, `engine/render` | `phaser`, `@/engine/render/phaser/*`, `@/games/*`, `@/ui/*`, `@angular/*` |
| `src/games/*` | `engine/*` | `@/ui/*`, `@angular/*` |

Note that the generic Phaser canvas host is `engine/render/phaser/phaser_host.ts`
(`PhaserHost`). It is handed a board to run, so the shell never imports a game
module in order to host one.

---

## Build & Deploy System

### Package Manager
This project uses **Yarn 4**. Always use Yarn commands instead of NPM (`yarn <command>`).

### Development Commands
- **Run Development Server:** `yarn start` or `yarn dev` (launches Vite dev server at `http://localhost:9000/`).
- **Build Card Atlas:** `yarn build:atlas` (runs `tools/build-card-atlas.mjs` to convert SVG assets into texture atlas files).
- **Production Build:** `yarn build` (generates bundled production assets in `dist/` with Phaser manual chunking).
- **Run Unit Tests:** `yarn test` (runs Vitest once) or `yarn test:watch` / `yarn test:coverage`.
- **Linting:** `yarn lint` (runs ESLint via `register.cjs` over `src` and `test`).
- **Type Checking:** `yarn tsc` (runs TypeScript compiler checks for both app and test configs).
- **Full Verification Pipeline:** `yarn verify` (runs `yarn lint && yarn tsc && yarn build && yarn test`).
- **Format Codebase:** `yarn prettier` (runs Prettier auto-formatting across the repository).

### CI/CD Deployment Pipeline (`.github/workflows/deploy.yml`)
Deployments are automated via GitHub Actions on every push to `main` (or manual `workflow_dispatch`):

1. **`verify` Job (Quality Gate):**
   - Installs dependencies (`yarn install --immutable`).
   - Executes `yarn lint`, `yarn tsc`, and `yarn test`.
   - Pipeline aborts if any step fails.
2. **`build-and-sync` Job:**
   - Runs `yarn build` to produce production assets in `dist/`.
   - Clones the target host website repository (`fuzzley/fuzzley`).
   - Copies `dist/*` assets to `main-website/frontend/public/project/solitaire`.
   - Automatically commits and pushes asset updates to `fuzzley/fuzzley`.

---

## Running & Debugging

- **Debugging:** Chrome DevTools MCP support is enabled. Use it to inspect element states, logs, and game behavior.
- **Local Game Testing:** Start the server with `yarn start` and navigate to `http://localhost:9000/`.

---

## Coding Best Practices

- **Dependency Injection:** Avoid hardcoded dependencies. Prefer taking dependencies in the constructor or function parameters.
- **TypeScript Style:** Follow Google's TypeScript style guide (https://google.github.io/styleguide/tsguide.html).

---

## Writing Unit Tests

- **Test Coverage:** Maintain high test coverage after modifying code. `vitest.config.ts` enforces a floor (90% statements/functions/lines, 80% branches); `yarn test:coverage` fails below it. Raise the floor as the real figures rise.
- **UI Test Doubles:** `test/support/ui` holds the shell's doubles — the game, catalog, presentation and documentation mocks — plus `configureUiTestBed`, which wires them into a TestBed. Prefer it over assembling providers by hand. The catalog mock is typed as a `Pick` of the real service so it cannot drift out of shape unnoticed.
- **Don't Assert Production Prose:** A component spec should not depend on the wording of a rules page. Use the test documentation registry, which `configureUiTestBed` provides.
- **Arrange, Act, Assert:** Structure each test case cleanly: arrange block, act block, assert block. Avoid multiple AAA cycles per test case; create focused test cases instead.
- **Simple Test Logic:** Avoid complex conditional logic in unit tests. Keep tests readable and explicit.
- **Test Helpers:** Abstract verbose setup into helper functions, ensuring test intent remains clear.
- **Test via Public API:** Avoid accessing private fields or methods (and avoid using `as any` or bracket property accessors to bypass visibility).
- **Verifying State > Verifying Interaction:** Prefer asserting resulting state over checking call counts/interactions, reserving interaction mocks only for when state cannot be inspected directly.
- **Real Objects > Mocks:** Use real object instances instead of mocks whenever feasible.
- **Avoid Any Casts:** Avoid `as any`. Use proper typing or `instance as unknown as TargetType` as a last resort.