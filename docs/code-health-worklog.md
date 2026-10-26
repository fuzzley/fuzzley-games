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
| P3    | `@fz/dev`                            | to do |
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
