# Work log: code health for Minesweeper and the shared libraries

The log of [the code health plan](code-health-plan.md), kept so the work can
pause and resume. Newest entries last. It is deleted when the work is done;
git history keeps it.

## How to resume

- The work is on the branch `code-health-lib`, cut from `main` at `b6ef698`.
  Nothing is pushed: a push to `main` deploys.
- The user took every recommendation (2026-10-25), so all five decisions
  are yes: `@fz/dev`; the games' viewport in `@fz/game-ui`; `src/game/`
  becomes `src/rules/`; the Solitaire Collection takes up the shared pieces
  (P9 included); Signal Forms if stable in Angular 22.2, else a recorded
  exception.
- Each phase ends with `yarn verify` green from `frontend/`, and a commit.
- The status table says where things stand; the entries below it say what
  was found on the way.

## Status

| Phase | What                                 | State |
| ----- | ------------------------------------ | ----- |
| P1    | Check the coverage floors            | done  |
| P2    | Minesweeper by feature               | done  |
| P3    | `@fz/dev`                            | done  |
| P4    | `@fz/style/testing`                  | done  |
| P5    | The games' viewport in `@fz/game-ui` | done  |
| P6    | `Stopwatch` and `Announcer`          | done  |
| P7    | The long press                       | done  |
| P8    | Small things                         | done  |
| P9    | The Solitaire Collection takes it up | to do |
| P10   | Signal Forms                         | to do |

## Baseline (2026-10-25, `b6ef698`)

- Minesweeper: 18 spec files, 336 tests; coverage 97.59% statements, 93.68%
  branches, 100% functions, 98.76% lines. `vitest run` 6.1s, with coverage
  7.3s.
- `@fz/ui` 151 tests, `@fz/game-ui` 34, `@fz/style` 215.

## Entries

### 2026-10-25: start

- Branch `code-health-lib` created; the plan and this log committed first.

### 2026-10-25: P1, the coverage floors

- Every library and game's `test` is now `vitest run --coverage`, and
  `test:coverage` is gone; `test:watch` stays. A floor holds for the whole
  suite: `vitest run --coverage <one spec>` fails every threshold (checked on
  `format.spec.ts`), so the docs say to run one spec with
  `yarn vitest run <path>`.
- Floors, from the figures measured that day, rounded down
  (statements/branches/functions/lines): `@fz/ui` 94/79/98/97 (real
  94.16/79.16/98.18/97.08); `@fz/game-ui` 100/95/100/100 (real 100 across);
  `@fz/style` 95/83/93/95 (real 95.23/83.33/93.93/95). `src/testing/` counts
  in the libraries, since it is an entry point other workspaces use;
  `@fz/ui`'s dialog polyfill is its lowest file (78% statements).
- Solitaire Collection with coverage on: 6932 tests, 98.54/92.75/98.92/99.36,
  above its 95/88/96/96 floor.
- `@fz/style`'s `lint` is `eslint .`, which then linted the HTML report in
  `coverage/` (three warnings); its config ignores `coverage/` now.
- The site has no coverage set up at all. It isn't in the plan, so it is
  left as it is; worth a floor of its own later.
- `yarn verify` green (3m43s).

### 2026-10-25: P2, Minesweeper by feature

- `git mv` only, then imports rewritten by a scratch script that resolved each
  relative import against the old layout (`remap-imports.mjs`, in the session
  scratchpad, not kept): `src/game/` is `src/rules/`; `src/app/service/` is
  gone, its services in `play/` (game, saved game), `settings/`, `stats/` and
  `layout/` (viewport, until P5 moves it to `@fz/game-ui`); `game_bar/` is
  `bar/`, its component `BarComponent` (`app-bar`), so it imports
  `@fz/game-ui`'s `GameBarComponent` without an alias; `app/format.ts` is
  `rules/format.ts`, with `count()` moved there from `describe.ts`, and its
  specs with it.
- The ESLint fence and the coverage floor's key name `src/rules/`. The
  `AGENTS.md` layout section now lists the feature folders and says a new
  feature gets a folder of its own, never a `services/` one.
- The same 336 tests pass, at the same coverage. `yarn verify` green.

### 2026-10-26: P3, `@fz/dev`

- `frontend/lib/dev/` holds the ESLint blocks (`@fz/dev/eslint`:
  `typescript`, `angular`, `templates`, `tests`, `scripts`), the tsconfig
  presets (`@fz/dev/tsconfig/base.json`, `angular.json`, `scripts.json`)
  and the headless Chrome helpers (`@fz/dev/chrome`). Its `.ts` exports run
  in Node as they are: a workspace link resolves outside `node_modules`, so
  type stripping applies, which needs `erasableSyntaxOnly` and `.ts`
  relative imports, as `@fz/style`'s Vite plugin already does.
- `extends: "@fz/dev/tsconfig/angular.json"` works for `tsc` and `ngc`:
  Angular's `readConfiguration` resolves it with Node10 rules, which find it
  because the file's path is its export path. `${configDir}` gives each
  workspace its own `outDir` and `rootDir`. Checked that `ngc` reads the
  preset's `strictTemplates`, `strictStandalone` and `extendedDiagnostics`.
- Every workspace adopted both: the libraries, both games, the site and the
  root's scripts. `@eslint/js`, `angular-eslint`, `typescript-eslint` and
  `eslint-plugin-jsdoc` left their `package.json`s for `@fz/dev`'s. The
  site now gets `noUnused*`, `strictStandalone` and extended diagnostics as
  errors too, and passed without a change.
- ESLint replaces a rule's options when a later block sets the same rule, so
  the preset's testing fence uses core `no-restricted-imports` and a
  workspace's own fences `@typescript-eslint/no-restricted-imports`; both
  fire, checked by breaking each in Minesweeper.
- The Solitaire Collection was the long part. Under the strict set it had 21
  TS4111 errors (bracket access on index signatures) and 1113 lint problems,
  947 of them fixable (mostly `import type` and arrow-function braces).
  - Its `tsconfig.app.json` had `types: []` and never typechecked
    `import.meta.env`, `import.meta.glob` or the `.scss` import; its
    `typecheck` now runs `ngc` over it with `types: ["vite/client"]`, and a
    `tsconfig.node.json` covers the Vite configs.
  - typescript-eslint's project service lints a file with the first project
    in the solution that includes it as a root file. The app config's only
    root was `main.ts`, so `src/` was linted under `tsconfig.spec.json`
    (`noUncheckedIndexedAccess` off), which reported conditions as
    unnecessary that aren't and autofixed them away. `include: ["src/**/*.ts"]`
    in `tsconfig.app.json` fixed it (42 findings in `src/` became 13).
  - Autofix pitfalls from that wrong run, undone by hand: `itemAt`'s `as T`
    dropped; `consistent-type-definitions` turning event maps into interfaces,
    which then failed `Record<string, unknown>` (now
    `EventEmitter<EventMap extends object>`); and
    `no-meaningless-void-operator` turning `void move;` into `move;` (now an
    `_move` parameter, which the preset allows by `argsIgnorePattern`).
  - Rank arithmetic now goes through `rankAt()`, which throws out of range,
    instead of casting a number to `Rank`; `suitToString` and
    `rankToString` throw on a value that is no suit or rank.
  - `TestBed.flushEffects()` is deprecated in Angular 22; 50 calls are
    `TestBed.tick()`.
  - Node 26 declares `globalThis.localStorage` but leaves it undefined
    without a storage file, so `"localStorage" in globalThis` held and every
    one of its 6406 specs failed at `localStorage.clear()`. The test setup
    checks `typeof` now.
  - The Phaser adapter (`src/engine/render/phaser/`) is let off
    `no-unnecessary-condition`: Phaser types a scene's systems as always
    there, though they aren't before boot or after shutdown, and the guards
    the rule would remove are what keep a late frame from throwing.
  - `test/support/dom.ts`'s `query` and `queryRequired` take the element's
    class and check it, instead of a cast at each call site.
  - 6932 tests pass at the same coverage; `eslint.config.cjs` is
    `eslint.config.js`, in ESM.
- Both screenshot scripts run on `@fz/dev/chrome` (Minesweeper's 614 lines
  to 339, Solitaire's 403 to 162). Verified against the dev servers:
  Minesweeper's `preview.webp` and `thumb.webp` came out byte-identical to
  the committed ones; Solitaire's Klondike, Spider and FreeCell came out at
  2880 × 1620 as before, and were put back with `git checkout`.
- `@fz/dev` has 30 specs: the ESLint blocks lint files written to a
  temporary workspace, so a block that stops catching what it should fails;
  the DevTools helpers run against a fake browser. Starting a real Chrome is
  left to the scripts, so its floor is 64/84/76/63 (real
  66.66/84.61/80/65.59).
- Docs: `frontend/lib/dev/AGENTS.md` and its `CLAUDE.md`; the repository's
  `AGENTS.md`, each workspace's checks, and the Solitaire Collection's
  skills that named `eslint.config.cjs`.
- Committed as `d37ab9d` (the presets and their adoption) and `529b938`
  (the screenshot scripts). `yarn verify` green.

### 2026-10-26: P4, `@fz/style/testing`

- `frontend/lib/style/src/testing/index.ts`, exported as
  `@fz/style/testing`: `compileStylesheet()` (Sass with an importer that
  takes a library's `sass` export and resolves any other package from the
  stylesheet's own folder), `paletteRoles()`, and `rgb()`, `over()`,
  `luminance()`, `contrast()` and `paint()`. It imports nothing relative, so
  the games' spec configs compile it without `allowImportingTsExtensions`.
- `paint()` takes over the games' hand-parsed tints: `var(--fz-…)`, a
  `color-mix(…, transparent)` tint, `rgba()`, `black` or a hex color, with a
  value Sass wrote over several lines put on one first. A translucent value
  with nothing given under it throws, rather than landing on black. That
  removed Minesweeper's `strength()` and Solitaire's `strength()` and
  `barGlass()`.
- `paletteRoles()` matches selectors exactly (`[data-theme]` for every
  palette, `[data-theme=<id>]` for one), so what a palette's descendants
  declare is left out. Sass writes only those two and `:root`.
- The colors are no longer rounded to whole channels between layers, as the
  library's old `mix()` did; every pair still passes.
- Four copies went: the three contrast specs' and `global.spec.ts`'s Sass
  importer. Specs: `@fz/style` 215 → 237 (the six math tests became 27 in
  `src/testing/index.spec.ts`, with two fixtures in
  `src/testing/fixtures/`). Its floor rose to 96/86/96/97 (real
  96.71/86.48/96.07/97.18).
- Broken on purpose, then restored from git: Casino night's `muted` as
  `#3a4550` failed six library pairs and five of the Solitaire Collection's
  felts; Minesweeper's dark ink 1 as `#2a3a6a` failed the number 1 in both
  dark palettes.
- Docs: `@fz/style`'s `AGENTS.md`, the `web-game-accessibility` and
  `fuzzley-ui` skills, and Minesweeper's `vitest-testing` skill.
- `yarn verify` green. Committed as `403bea5`.

### 2026-10-26: P5, the games' viewport in `@fz/game-ui`

- `@fz/game-ui` gained three entry points:
  - `viewport/`: `GameViewportService`, Minesweeper's service under a name
    that says whose it is, with Solitaire's `"matchMedia" in window` check,
    which needs no ESLint exception.
  - `breakpoints/`: the widths as constants, with `formFactorAt()` for
    Solitaire's engine in P9, and in `_index.scss` the two games' mixins
    together (`below`, `from`, `compact`, `phone-portrait`,
    `phone-landscape`), forwarded from `src/_index.scss`. Only `tablet` and
    `desktop` are shared: Solitaire's `phone` (480 px, a dialog's padding)
    is its own, so P9 must decide where it goes.
  - `testing/`: `installFakeViewport()`, the union of the two fakes
    (`setWidth`, `setSize`, the color scheme answered as light, a height of
    900 by default).
- `breakpoints.spec.ts` compiles each mixin and checks its media query
  against the constants, which replaces the "change the two together"
  comments.
- Minesweeper takes them up: its `layout/` folder, `fake_viewport.ts` and
  `_breakpoints.scss` are gone, and `styles/_index.scss` forwards
  `@fz/game-ui`'s mixins by name, so its components still write
  `below("desktop")`.
- Specs: `@fz/game-ui` 34 → 71, at 100% coverage; Minesweeper 336 → 327
  (its nine viewport specs are the library's fourteen now).
- Screenshots of the dev server at 1440 × 900, 1280 × 720, 1000 × 800,
  700 × 900, 390 × 844, 844 × 390 and 340 × 720 (below the home button's
  360), before and after: no pixel differs at any size. Two rounds before
  the change matched each other too, so the comparison is sound. The
  scripts are `shots.mjs` and `compare.mjs` in the session scratchpad, not
  kept; they import `@fz/dev/chrome` by its file URL.
- Docs: `@fz/game-ui`'s `AGENTS.md` (the three entries, and a rule that a
  width every game shares is written once), its package description, the
  `fuzzley-ui` skill, and Minesweeper's `AGENTS.md` and `vitest-testing`
  skill.
- `yarn verify` green. Committed as `161f7c0`.

### 2026-10-26: P6, the stopwatch and the announcer

- Named `StopwatchService` and `AnnouncerService`, not the plan's
  `Stopwatch` and `Announcer`: every injectable in the libraries ends in
  `Service`.
- `@fz/game-ui/stopwatch`: `StopwatchService` has `seconds`, `running`,
  `start()`, `stop()` and `reset(seconds = 0)`. It banks the milliseconds
  counted and reads `Date.now()` rather than counting ticks, and pauses on
  `visibilitychange` while the page is hidden. The change a player could
  notice, as the plan said: part-seconds are kept across a pause, so a time
  can come out a second longer than before. 13 specs, 100% coverage, among
  them `start()` while it is already counting, which loses no time.
- `@fz/ui/announcer`: `AnnouncerService` (`message`, `say()`, `clear()`;
  a repeat gains a trailing `\u00a0`, as Minesweeper's did) and
  `<fz-announcer>`, the polite live region, `fz-visually-hidden` on its
  host. 7 specs. The no-break space is written as the `\u00a0` escape:
  ESLint's `no-irregular-whitespace` flags a literal one in a template
  literal, and the editor tools turn the escape into the literal, so a
  small script put the escapes back.
- Minesweeper takes them up: `GameService` drops its own clock, its
  `DOCUMENT` and `DestroyRef`, the visibility listener and `announcement`;
  `app.component.html` holds `<fz-announcer />` where the `<p aria-live>`
  was. Its two visibility specs moved to the stopwatch's, and its three
  announcement specs read `AnnouncerService.message()`; the root
  component's spec, which finds the region by `aria-live`, passes as it
  was.
- Specs: `@fz/game-ui` 71 → 84, `@fz/ui` 151 → 158, Minesweeper 327 → 325.
- Docs: `@fz/ui`'s and `@fz/game-ui`'s `AGENTS.md` (and the latter's
  package description), the `fuzzley-ui` skill's description and tables,
  the `web-game-accessibility` skill (the region in an Angular app), and
  Minesweeper's `AGENTS.md`. The site's home-page search keeps its own
  region: the plan didn't move it, and the site could take
  `<fz-announcer>` up later.
- `yarn verify` green. P7's first edits to the board were on disk by the
  time its build step reached Minesweeper, so P7's own run is the one that
  holds for both. Committed as `d9111b6`.

### 2026-10-26: P7, the long press

- `src/app/board/long_press.directive.ts`: `LongPressDirective`
  (`[appLongPress]`) times a finger or a pen, gives up when it drifts more
  than 10 px or lifts, and emits `longPress` with the pointer down that
  began it, so the board finds the square from its target. It takes
  `LONG_PRESS_MS`, which nothing outside the board imported.
- It keeps what the browser makes of the same press from the board: the
  click after a long press, and a finger's `contextmenu`, which it also
  prevents. It does so with listeners in the capture phase on its host,
  which run before the board's own on the same element, so the board's
  `onClick` and `onContextMenu` no longer know a finger exists.
- Two small changes of behavior, neither one a player would see: a
  finger's menu is prevented anywhere on the grid, not only on a square;
  and a long press that ended off a square no longer leaves the flag set
  that swallowed the next click on one.
- `BoardComponent` loses its three gesture fields, its `DestroyRef`, the
  `Press` type and three handlers: 215 lines to 152.
- The board's specs pass unchanged (`board.component.spec.ts` untouched).
  The directive has 16 specs of its own, on a host button that writes down
  what reaches its listeners. Minesweeper 325 → 341.
- Docs: Minesweeper's `AGENTS.md`.
- `yarn verify` green. Committed as `ace67e4`.

### 2026-10-26: P8, small things

A commit each, every one checked with the lint, typecheck and tests of the
workspaces it touched; one `yarn verify` at the end.

- `65d2c24` The rules: `reveal()` and `toggleFlag()` ask `isOver()`;
  `safeCount()` is the safe squares for `settle()` and `clearedShare()`;
  `settle()` asks `revealedCount()` of the field it built.
- `c39f27a` `SQUARES` and `OUTCOMES` are declared in `field.ts`, `as const`,
  and `Square` and `Outcome` taken from them; `saved_field.ts` imports them.
- `5851193` `isValidLives(lives: unknown): lives is number`, on `isWhole()`;
  the settings' `sizeFrom()` uses `isWhole()` too. New specs: the guard
  refusing what is no number, and settings stored as strings defaulting.
- `06ac944` `LocalStorageService.readVersioned(key, version)` and
  `writeVersioned(key, version, value)`, with six specs; the settings, the
  stats and the saved game use them, each with a named version constant.
  What is stored is unchanged: `{ version, ...fields }`.
- `9a6cf3d` `SavedGameService` reads the time with `untracked()`, so the
  clock no longer wakes its effect, and writes the game again on
  `visibilitychange` to hidden and on `pagehide`. Four specs; without
  `untracked()` two of them fail, which was checked.
- `e4031c1` Minesweeper's six components drop
  `ChangeDetectionStrategy.OnPush`, which Angular 22.2.3 documents as the
  default ("OnPush is enabled by default"). The Solitaire Collection's
  ten are P9's.
- `68daa20` The root component no longer injects `GameService`, which
  nothing in its template has read since P6.
- `7070b53` `BarOverflowItem<Id>` is a `BarOverflowAction<Id>` (no `href`,
  emits its id) or a `BarOverflowLink` (an `href`, any id), and
  `<fz-bar-overflow>` is generic over `Id`. Angular's template checker
  infers `Id` from `[items]`: binding `(choose)` to a method that takes
  only `"restart"` failed with "Argument of type 'MenuAction' is not
  assignable", which was checked and undone. Both games name their
  `MenuAction` ids, Solitaire's here rather than in P9, since it is only
  types.
- `3d66d62` `ThemeService.options`, the palettes as a chooser lists them
  (`ThemeOption`: `modeName`, `checked`), which the theme menu and picker
  read; three specs. `select()` writes through `LocalStorageService`, which
  warns where the old `try` was silent.
- `bc667c9` `@fz/style`: `vite.ts`, `theme_script.ts` and
  `fuzzball_raster.ts` move to `src/build/`, `stylelint.ts` to
  `src/lint/`, with their specs; `exports` and `stylelint.config.js` point
  at them, so `@fz/style/vite` and `@fz/style/stylelint` are unchanged. An
  ESLint block on `src/*.ts` restricts `node:*`, PostCSS, Sass, sharp,
  stylelint, Vite and the three folders, which a trial import of `node:fs`
  and `./build/vite.ts` into `themes.ts` showed. The site and both games
  build, and Minesweeper's styles lint, through the moved files.
- Found on the way: a `git checkout --` meant to undo a trial edit in
  Minesweeper's bar undid the real one too; it was put back from a copy
  taken before. Trials are now undone from copies only.
- Specs: Minesweeper 341 → 349, `@fz/ui` 158 → 167.
- `yarn verify` green.
