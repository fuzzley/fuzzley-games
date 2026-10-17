# Work log: code health pass

Temporary. It records the pass while it is under way and is deleted in the
last commit once the pass is merged.

## Goal

Set a strong foundation while the site is small: act on every finding of the
code review of 2026-10-17 (numbered as there), and move the styles to Sass.

## Plan

Each item lands as its own commit on `code-health`, with `yarn verify` green.

1. Type-check the specs and `vite.config.ts`.
2. Zoneless change detection, an `app.config.ts`, global error listeners.
3. An injectable game catalog; specs run against a fixture, not the live list.
4. Enforce the written rules: palette consistency, `index.html` drift,
   hard-coded colors, stricter ESLint.
5. A `TitleStrategy` for page titles.
6. One not-found page.
7. Template logic into `computed()` view models; one plural form.
8. Shared icons, layout classes and visually-hidden rules.
9. Coming-soon thumbnails as SVG files.
10. Unions derived from their data.
11. Consistency: `protected` template members, `viewChild`, one URL parse,
    injected storage, no explicit `OnPush`.
12. Structured, `readonly` game data, split from the catalog's logic.
13. Specs for the header, category page, titles and "New" badge.
14. Test style: Testing Library queries, one act per test, explicit imports.
15. Testable tools: pure functions, `import.meta.main`, specs, Vite plugins
    out of `vite.config.ts`.
16. Search results announced through a persistent live region.
17. The theme picker as a menu of radio items with arrow keys.
18. One play link per destination; a search landmark.
19. Infra: one Node version, pinned images, Dependabot, security headers,
    no `@angular/forms`, one README, no hard-coded game count.
20. Sass: SCSS modules (`@use`), palettes generated from maps and checked at
    compile time, shared tokens and mixins, stylelint.

## Decisions

1. Work happens on `code-health`, committed but not pushed: Cloud Run
   deploys every push to `main`.

## Log

### 2026-10-17

- Baseline on `main` at `44adc61`: `yarn lint`, `yarn typecheck` and
  `yarn test` (30 tests) pass.

#### 1. Type-check the specs and the Vite config

- `tsconfig.app.json` starts at `main.ts`, so `ngc` never saw a spec, and
  `vite.config.ts` was in no tsconfig at all (`tsc --listFilesOnly` over
  `tsconfig.app.json` lists no spec). A deliberate type error in a spec now
  fails `yarn typecheck`.
- `yarn typecheck` now also runs `tsc` over `tsconfig.spec.json` and a new
  `tsconfig.node.json` (for `vite.config.ts`).
- That found a real error at once: the `test` block isn't part of Vite's
  `UserConfig`, and `/// <reference types="vitest" />` no longer adds it.
  `defineConfig` now comes from `vitest/config`.

#### 2. Zoneless, `app.config.ts`, global error listeners

- Angular 22 runs zoneless by default; `main.ts` had opted back into zone.js.
  Removed zone.js from `main.ts`, `test-setup.ts` and the dependencies.
- The providers moved into `app.config.ts` (with
  `provideBrowserGlobalErrorListeners()`), and `routes.ts` now only declares
  the pages. `app.component.spec.ts` renders with `appConfig.providers`, the
  router the app ships, instead of a `provideRouter(routes)` of its own.
- The Chrome extension wasn't connected, so the app was checked in headless
  Chrome over the DevTools protocol, driven by a scratch script (not
  committed): search refines in place and Escape clears it, the theme menu
  opens, applies, saves, sets `theme-color` and closes on a choice or an
  outside click, a tile's link routes to its game, and the titles are right,
  on desktop and phone widths.
- Found on the way, and not caused by this change (every thumbnail is
  `loading="lazy"` on `main`): Angular warns (NG0913) that the home page's
  largest image, a thumbnail, is lazy. Fixed with item 9.
- Angular 22's `RouterLink` writes absolute hrefs in a browser
  (`http://…/games/klondike`), while jsdom gets relative ones.

#### 4a. Stricter ESLint

Done ahead of the rest so every later change is held to it.

- `eslint.config.cjs` became `eslint.config.js` (ESM, `defineConfig` from
  `eslint/config`; `tseslint.config()` is deprecated), with `projectService`
  in place of a list of tsconfigs.
- `tsconfig.json` is now a solution referencing the app, spec and node
  configs, as the Angular CLI lays it out, so the project service checks
  each file with the config that includes it. `tsconfig.app.json` includes
  every non-spec file under `src/` rather than only what `main.ts` reaches.
- Presets: `strictTypeChecked` and `stylisticTypeChecked`. Added
  `explicit-module-boundary-types` (AGENTS.md's return-type rule),
  `consistent-type-imports`, and the template rules `button-has-type`,
  `prefer-control-flow`, `prefer-self-closing-tags` and
  `prefer-template-literal`. `vite.config.ts` is linted too.
- `template/no-call-expression` would have enforced "templates bind, they do
  not compute", but it can't tell a signal read from a method call, so it
  isn't used.
- The new rules found two lookups whose `undefined` case TypeScript said was
  impossible (`root.children["primary"]` in the header, `DRAW[slug]` in the
  thumbnails). The check was right and the type wrong, so `tsconfig.json`
  turns on `noUncheckedIndexedAccess`.
- The rest were mechanical: type-only imports, optional chains on
  `textContent` (never null on an element), an untyped `JSON.parse` in the
  Vite config. `ThemeService`'s `matchMedia?.` stays, with a comment: jsdom
  has no `matchMedia`. Item 11 replaces it.

#### 14. Test style

Done before the new specs (item 13), so they are written this way from the
start.

- Added `@testing-library/angular`, `@testing-library/dom`,
  `@testing-library/user-event` and `@testing-library/jest-dom` (its
  matchers load in `test-setup.ts`). The specs render with `render()`, find
  elements by role, label or text through `screen`, act through user-event,
  and assert with jest-dom's matchers.
- Yarn's one-day minimum release age (`npmMinimalAgeGate: 1440`, from the
  user's Yarn config) refused `@testing-library/angular@19.6.0`, published
  today. Kept the gate and took 19.5.0, which supports Angular 21 and up.
- The theme menu's three act-and-assert rounds became five tests. Its manual
  `el.remove()`, skipped whenever an assertion failed, is gone: Testing
  Library cleans up after each test.
- Vitest globals: kept on, and the specs no longer import `describe`, `it`
  and `expect`. They aren't optional: TestBed
  (`globalThis.afterEach?.(getCleanupHook(true))`) and Testing Library
  register their teardown on the global `afterEach`, so with globals off
  TestBed would never reset between tests. The `vitest-testing` skill says
  so.
- 37 tests now (several old tests asserted two things; split).

#### 3, 10, 12. An injectable catalog over plain data

- `provider/game_catalog.ts` (types, 44 entries, search, dates and URLs in
  one file) is now:
  - `model/game.ts`: `Game`, `PlayLocation`, `PlayerCount`, `BuildName`, and
    the pure functions `playUrl`, `screenshotUrl`, `describePlayers` and
    `describeLength`.
  - `provider/games.ts`, `provider/categories.ts`, `provider/themes.ts`:
    data only. `CategoryId` and `ThemeId` are derived from their lists
    (`as const satisfies`), and `BuildName` from `games.json`'s keys
    (a type-only import; `resolveJsonModule` is on).
  - `service/game_catalog.service.ts`: `GameCatalog`, which components and
    the title resolvers `inject()`. It finds games and categories, lists a
    category's games, builds a search matcher (each game's searchable text
    is folded once, not on every keystroke), and says which games are new.
- The data reaches it through `CATALOG_DATA`, an `InjectionToken` whose
  default factory is the site's catalog. A first draft took the data in the
  constructor with `useFactory`; angular-eslint's `prefer-inject` objected,
  and the token is Angular's idiom anyway.
- Specs provide `provideTestCatalog()` (`testing/catalog.ts`, four games)
  and assert on its games. Adding a game to the site can no longer break a
  component spec ("1 of 44 games" is now "1 of 4"). `provider/games.spec.ts`
  checks what every real entry must keep without counting anything: unique
  kebab-case slugs, unique play locations, real ISO dates, at least one
  player and minute.
- Data is `readonly` throughout, and `gamesIn` returns `readonly Game[]`.
  `players: "Solo"` and `time: "5 min"` became `players: { min, max }` and
  `minutes: 5`, formatted by the model's functions (so "2–4 players" is
  ready for card games).
- Categories gained `surface: "felt" | "plain"`, for item 7.
- `DEFAULT_THEMES` names the light and dark defaults once (they were spelled
  out in `ThemeService`), and a spec checks each is a palette of its mode.
- 61 tests. `yarn build` passes, play-link check included.

#### 9. Coming-soon thumbnails as SVG files

- `public/thumbnails/sudoku.svg` and `reversi.svg` were generated from the
  old drawing code (a scratch script imported `game_thumbnails.ts` and wrote
  each shape out, grouped by paint), so they match it shape for shape. Text
  uses `system-ui, sans-serif`: an `<img>` can't reach the page's web font.
- `game_thumbnails.ts` (the `Shape` union, the drawing code, a module-level
  cache) and the 60-line SVG renderer in `game_thumb.component.html` are
  gone. Every thumbnail is now an `<img>` whose address `thumbnailUrl()`
  gives.
- The build's `checkPlayLinks` became `checkGameImages`: it also fails when a
  game still to come has no drawing (tried by moving `reversi.svg` away).
- NG0913, found in item 2: tiles take an `eager` input, and the first
  `EAGER_TILES` (6, about a row) of the home page's sections and of a
  category page load their pictures at once. The game page's preview is
  `fetchpriority="high"`. The smoke run's console is now clean.
- Checked in headless Chrome: the drawings look as before.
