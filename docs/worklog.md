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

#### 5. A `TitleStrategy`

- `SiteTitleStrategy` titles each page "<route's title> – Fuzzley Games",
  or just "Fuzzley Games" for a route without one, so the routes name only
  themselves.
- `routes.spec.ts` navigates with `RouterTestingHarness` over the real
  `appConfig` (plus the test catalog), so each test covers the route, its
  input binding and its title together. (Item 13's titles.)
- Found while running it: since item 3, `vite.config.ts` imports
  `model/game.ts`, which has imports of its own (type-only, but Vite's check
  doesn't tell), and Vite warns that its future native config loader won't
  take an extensionless import or a JSON import without attributes. Fixed in
  item 15, which takes the app's modules out of the config.

#### 15. Testable tools

- Every script under `tools/` now exports its logic and runs only under
  `if (import.meta.main)`. `update-games.mjs`, which pushes to `main`
  unattended, splits into `parseSkipList`, `latestBuild` (with `fetch` as a
  parameter), `planUpdate` (move or stay, and why) and `commitMessage`.
  `inject-analytics.mjs` has `withAnalytics(html)`; `fetch-games.mjs` takes
  its fetch and retry delays as parameters, and its folder in
  `removeUnpinned`.
- `tools/script.mjs` holds what the scripts repeated: `FRONTEND_DIR`,
  `logger(name)` and `errorMessage(error)` (written out four times before).
- The Vite plugins moved to `tools/vite-plugins.ts`, with their logic
  exported: `commitHash` (environment and git as parameters),
  `playPageRoute`, `missingImages`.
- This also fixes the warning found in item 5. `checkGameImages` loads the
  catalog at build time through Vite's `runnerImport`, so `vite.config.ts`
  imports nothing from the app. `runnerImport` is experimental, so
  `vite-plugins.spec.ts` loads the real catalog through it on every test run.
  Importing the app's TypeScript straight into Node wasn't an option: the
  app imports without file extensions, as its bundler allows.
- Vitest runs two projects: `app` (jsdom, Angular) and `tools` (Node).
  `tsconfig.node.json` and the TypeScript lint rules cover `tools/**/*.ts`.
  ESLint's `no-unused-vars` now allows `const { omitted, ...rest }`.
- 36 tools tests: retries on 404 but not 403, giving up after the last
  delay, an unpinned folder deleted and forgotten, a malformed or undated
  `latest.json` refused, a fresh build left to settle, a skipped archive,
  the commit message for one pin and for several, the tags placed before
  `</head>` in any case, the dev server's redirect and rewrite. 107 tests
  in all.

#### 6. One not-found page

- `NotFoundComponent` replaces the catch-all redirect home (`**` now shows
  it, titled "Page not found") and the two hand-built not-found states of
  the game and category pages, which render `<app-not-found kind="game">`
  or `kind="category"` in place of their own `<main>`. It names what was
  missing and offers every category and the home page.
- nginx answers every unknown path with the app and a 200, so the page sets
  `<meta name="robots" content="noindex">` while it is shown, to keep soft
  404s out of search results, and removes it when it goes.
- The routes spec caught a bug before it shipped: as a routed component,
  `withComponentInputBinding()` sets an input with no route value to
  `undefined`, overriding its default, so the page read "There's no at
  this address." `kind` now has a transform that turns `undefined` into
  "page".
- `category.component.spec.ts` is new (item 13): name, description, games
  in order, count, back link, unknown id.
- While at it: Yarn runs the scripts on Node 22.22.3 from nvm on this
  machine, while `node` in a shell, CI and Docker are 26. For item 19.

#### 7. View models instead of template logic

- The game page has one `view` (game, category, meta line, play address and
  preview, and `plain` from the category's `surface`, which replaces the
  template's `game.category === 'classics'`). The tile has one `view`
  (play address and label, badge, players, length), with the badge's
  choice in a named `badgeFor()` rather than a nested ternary. The home
  page's sections carry their heading id and count.
- Counts: the home page pluralized inline and the category page always said
  "games" (so "1 games"). Both now use `describeGameCount()`. The ICU plural
  I tried first compiled, but failed at runtime with `$localize is not
defined`: ICU needs `@angular/localize`, too much for one plural.
  AGENTS.md says so.
- The theme menu's template logic goes with its rebuild in item 17.
- New specs: section counts in the singular and plural, the "New" badge on
  a game added lately (with only `Date` faked, so Angular's scheduling is
  untouched) and none on a launch game. 125 tests.

#### 20. Sass

- Added `sass` (Dart Sass, pure JS, so no native binary for Docker's
  Alpine) and declared `postcss`, which `@angular/build` and three others
  expect as a peer but nothing provided. Vite compiles the SCSS, for the
  components too.
- `styles/global.css` became `global.scss`, which only `@use`s partials:
  - `_palettes.scss`: each palette is a Sass map, and the `[data-theme]`
    blocks are generated from the maps. The compile fails with an `@error`
    naming the palette and the role when a palette lacks a role the default
    has or sets one it lacks. `$palettes` is `!default`, so a spec can
    configure a broken one.
  - `_breakpoints.scss`: the four widths in use (36, 40, 52 and 64rem) as
    `sm`, `md`, `lg`, `xl`, and `below($name)`, which fails on an unknown
    name.
  - `_a11y.scss` (`visually-hidden` mixin; the theme menu's copy of those
    rules now includes it), `_shadows.scss` (the three shadows), `_base.scss`
    (layout tokens, reset, element defaults) and `_shared.scss`.
- Every component stylesheet is `.scss`, using `@use` and the breakpoint
  mixin. Pseudo-classes and parts are nested; the home page's media queries,
  which override each other, stay flat and in order, with a comment saying
  why. Comments are `//`: a `/* */` comment inside a nested rule made Sass
  emit an empty rule.
- Proof the output is the same:
  - A scratch comparator compiled each new file, parsed it and the old CSS
    with postcss, and compared the flattened rules in order. Identical
    except: Sass drops the quotes in `[data-theme="classic"]` and writes
    `rgb(0 0 0 / 45%)` as `rgba(0,0,0,45%)` (the same values); the
    reduced-motion block comes before the shared classes (its declarations
    are `!important`, so order can't matter); in the game page,
    `.stage.play .button` moved ahead of `.play-cta` (it outranks it on
    specificity); and the theme menu's hidden label gained `margin: -1px`
    from the shared mixin (harmless on an absolutely positioned element).
  - The headless smoke run passed, and headless Chrome diffed its nine
    screenshots against the ones taken before the change, pixel for pixel:
    all nine identical (home, search, open menu, Midnight blue, game
    pages, category page, phone width).
- AGENTS.md has a Sass section (modules not `@import`, custom properties
  for runtime values and Sass for build-time ones, named breakpoints,
  nesting depth, `//` comments).

#### 4b. The palette and color rules, enforced

- `styles/palettes.spec.ts` compiles `_palettes.scss` and checks it against
  `THEMES`: a palette for every theme and no other, in order; each with its
  theme's mode as `color-scheme`; the light default on `:root`. It also
  configures broken palettes (`@use … with`) to prove the Sass guard
  fires, for a missing role and for an extra one. (`fileURLToPath` takes
  `import.meta.url` as a string: under jsdom, `new URL()` is jsdom's, which
  Node's `fileURLToPath` refuses. And `?raw` doesn't help: Vitest hands
  stylesheets to specs as empty strings.)
- stylelint (`stylelint-config-standard-scss`) runs in `yarn lint` as
  `yarn lint:styles`. Beyond the standard rules: no hex, named or functional
  colors except in `_palettes.scss` and `_shadows.scss`, no `@import`,
  nesting at most three deep.
- It found the one hard-coded color, the coming-soon stage's white text
  on the felt: now `--on-felt`, a new role in every palette (still white).
  Everything else was mechanical (`#fff` shorthand, `currentcolor`, comment
  spacing).
- Screenshots still pixel-identical to before the Sass move. 130 tests.

#### 4c. The palette bootstrap, made from the app's list

- `index.html`'s inline script carried its own copy of the palette ids, the
  storage key and both defaults. It is now `/theme.js`, made by the
  `themeBootstrap` plugin from `provider/themes.ts` (loaded through
  `runnerImport`, like the catalog): served by the dev server, written into
  the build. `themeBootstrapScript()` is a pure function, and
  `vite-plugins.spec.ts` runs its output in a `node:vm` page: a saved
  choice is kept, a saved non-palette ignored, light and dark defaults
  picked, and storage that throws survived.
- Why a file rather than inline: it's one more tiny blocking script beside
  `env.js` and `analytics.js`, and it leaves the page with no inline script,
  so item 19's Content Security Policy needs no hash that would change with
  every palette.
- Vite warned that it can't bundle a classic script that isn't in
  `public/`. The tag carries `vite-ignore`, which Vite supports for exactly
  this and strips from the output.
- `check-image.sh` expects `/theme.js`: 200, `no-cache`, and the code that
  sets the palette.
- Checked in headless Chrome: the scripts load in order (`theme.js`,
  `env.js`, `analytics.js`), the palette is set before Angular starts, and
  the smoke run passes with a clean console.

#### 8. Shared icons and layout classes

- `IconComponent` (`<app-icon name="play">`) draws the five icons the
  templates had inline (play, three times; players; time; search; tick).
  Filled or outlined comes from the icon; size and color from the parent;
  outline weight from `--icon-stroke`. It is `aria-hidden`. AGENTS.md says
  new icons go there.
- `.page` and `.back` move to `_shared.scss`, out of three and two
  component stylesheets. The home page keeps only its own top padding, and
  the game page only its larger gap under the back link.
- The visually-hidden copy went with the Sass move (item 20): the theme
  menu includes the mixin.
- Screenshots pixel-identical to before. 140 tests.

#### 11. Consistency

- `changeDetection: ChangeDetectionStrategy.OnPush` is gone from all ten
  components. Angular 22's `ɵɵdefineComponent` sets
  `onPush: changeDetection !== ChangeDetectionStrategy.Eager`, so OnPush is
  what a component gets unless it asks for `Eager`.
- `SiteHeaderComponent` parses the address once per navigation (the signal
  holds the `UrlTree`), not once for the query and again for the page.
  `search()` is `protected`, like everything else only its template uses.
  The theme menu's handlers and its `querySelector` follow in item 17,
  which rebuilds it.
- `ThemeService` reaches the browser only through the injected document:
  `getComputedStyle` and `matchMedia` through `defaultView`, and storage
  through `BROWSER_STORAGE`, a token that is the window's `localStorage`, or
  null where touching it throws (site data blocked). A failed write is
  still caught (a full store).
- New specs (item 13): the palette still applies when storage refuses the
  write and when there is none; `theme-color` follows the palette's
  `--bar` (jsdom resolves custom properties from a `<style>`); the storage
  token is `localStorage`, or null when access throws or there is no
  window. 147 tests.

#### 16. Search results announced

- The results count was an `aria-live` region inside `@if (searching())`,
  so it arrived with its text already in it, which screen readers generally
  don't announce. And with no matches it was empty, while "No games match"
  sat outside it, so a failed search said nothing.
- The home page now always renders its heading row: the `<h1>` ("All
  games", visually hidden, or "Results for “…”") and a `role="status"`
  line, empty until a search, then "1 of 44 games" or "No games match."
  The empty state keeps its hint and button and drops its title, which
  would have repeated the status. (A visible change, on the no-match page
  only: the message moves up beside the heading, as a count does. Home and
  results screenshots are pixel-identical.)
- Specs: the heading names the search; the status counts the matches or
  says none match; and, the point of the change, the status element that
  was there before a search is the one whose text changes.
- The `web-game-accessibility` skill now says a live region must be in the
  page before its text changes, with every outcome in it.

#### 17. The theme menu, as a menu

- Rebuilt on Angular Aria (`@angular/aria/menu`, 22.2.3, which needs
  `@angular/cdk` at the same version): the button is an `ngMenuTrigger`
  (it sets `aria-haspopup`, `aria-expanded`, `aria-controls`), the panel an
  `ngMenu` (`role="menu"`, shown while `data-visible="true"`), and each
  palette an `ngMenuItem` with `role="menuitemradio"` and `aria-checked`.
  The four `aria-pressed` toggles are gone, and with them the component's
  document click listener, its Escape handler, its `querySelector` for
  refocusing and its `open` signal: Angular Aria does all of that.
- Two things the types don't say, found by driving it: Angular Aria sets an
  item's role but not `aria-checked`, so the template binds it; and an
  item's `searchTerm` defaults to empty, so typing a palette's name found
  nothing until each item got `[searchTerm]="option.name"`.
- Template logic moved into an `options` view model (name, "Light" or
  "Dark", checked) and a `label` ("Theme: Classic felt"), item 7's rule.
- Checked in headless Chrome by mouse and keyboard: opening by click or
  Enter focuses an item; arrows move; typing "s" jumps to Soft pastel;
  Enter, Space or a click applies and closes; Escape and an outside click
  close; focus returns to the button each time. The open-menu screenshot
  differs only where the focused item is highlighted; the rest are
  pixel-identical. The spec covers the same in jsdom (9 tests; 154 in all).
- Cost: the bundle grows from 279.5 kB (84.2 kB gzipped; measured by
  building with this change stashed) to 316.7 kB (94.3 kB), all of it
  Angular Aria and the CDK parts it uses. If that matters, the menu can be
  deferred (`@defer (on idle)`) with a placeholder button.

#### 18. One play link per destination; a search landmark

- The game page's screenshot link (the same address and name as the "Play"
  button above it) is now `tabindex="-1"` and `aria-hidden="true"`: still
  there for the pointer, no longer a second tab stop and a second
  announcement. The spec finds it through its screenshot, since an
  `aria-hidden` link has no accessible name to query by.
- The header's search box is inside a `<search>` element, the search
  landmark (Angular's DOM schema knows it; `ngc` takes it under
  `strictTemplates`). The landmark takes the box's place in the flex row,
  so the header is pixel-identical.

#### 13. The missing specs

Most came with the items they belong to: the routes and titles (item 5,
`routes.spec.ts`), the category page (item 6), the "New" badge (item 7),
the storage fallbacks and `theme-color` (item 11). The last one:

- `site_header.component.spec.ts`, for the header's search, the most
  behavior in the app with no spec until now: it is a landmark; it shows the
  `?q=` in the address; typing searches; on the home page each keystroke
  replaces the history entry, so Back leaves the search; from any other page
  a search is a new entry, so Back returns to the page; Escape clears it;
  the category links, and `aria-current="page"` on the one in view.
  History runs on `provideLocationMocks()`, and the specs assert where Back
  lands rather than how the router was called.
- Checked that the history specs can fail: with `replaceUrl` forced off,
  the home-page test fails and the others pass.
- Testing Library's role table (aria-query) has no implicit role for
  `<search>` yet, and some screen readers don't either, so the element also
  carries `role="search"`, with a comment saying why.
- 163 tests (121 app, 42 tools).

#### 19a. One Node version, pinned images, Dependabot

- `.node-version` (26) feeds both workflows (`node-version-file`). The
  `Dockerfile` has to name its own image, so `verify.yml` now checks the two
  have the same major version (run locally, and against a Dockerfile edited
  to Node 24, which it caught). `frontend/package.json` has `engines`.
- Base images are pinned by version and digest, to what the floating tags
  pointed at on 2026-10-17 (from Docker Hub's API):
  `node:26.12.0-alpine3.24@sha256:6f08…` and
  `nginx:1.31.7-alpine3.24@sha256:892b…`. The global `corepack` the build
  installs (Node 26 doesn't bundle it) is pinned to 0.36.0.
- `.github/dependabot.yml`: npm (Angular's packages grouped, since they must
  move together, and the lint and test tools grouped), GitHub Actions and
  the Dockerfile's images, weekly, each with a one-day cooldown.
- `frontend/.yarnrc.yml` carries the one-day `npmMinimalAgeGate` that was
  only in the user's global Yarn config, so every machine gets it.
- `@angular/forms` removed (nothing imported it). `@types/node` moved from
  22 to 26, the Node the project runs.
- The image builds (`docker build`, 30 s with the games fetched) on the
  pinned images. Docker Desktop had to be started for it.
- Noted: on this machine Yarn runs Node 22.22.3 from nvm, while `node` in a
  shell is 26.4.0, and CI's `setup-node` takes the newest 26 (26.12.0).
  Everything passes on both, but `nvm use 26` would match CI.
