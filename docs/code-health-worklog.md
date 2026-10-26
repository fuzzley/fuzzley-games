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
| P4    | `@fz/style/testing`                  | to do |
| P5    | The games' viewport in `@fz/game-ui` | to do |
| P6    | `Stopwatch` and `Announcer`          | to do |
| P7    | The long press                       | to do |
| P8    | Small things                         | to do |
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
