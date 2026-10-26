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

| Phase | What                                 | State       |
| ----- | ------------------------------------ | ----------- |
| P1    | Check the coverage floors            | in progress |
| P2    | Minesweeper by feature               | to do       |
| P3    | `@fz/dev`                            | to do       |
| P4    | `@fz/style/testing`                  | to do       |
| P5    | The games' viewport in `@fz/game-ui` | to do       |
| P6    | `Stopwatch` and `Announcer`          | to do       |
| P7    | The long press                       | to do       |
| P8    | Small things                         | to do       |
| P9    | The Solitaire Collection takes it up | to do       |
| P10   | Signal Forms                         | to do       |

## Baseline (2026-10-25, `b6ef698`)

- Minesweeper: 18 spec files, 336 tests; coverage 97.59% statements, 93.68%
  branches, 100% functions, 98.76% lines. `vitest run` 6.1s, with coverage
  7.3s.
- `@fz/ui` 151 tests, `@fz/game-ui` 34, `@fz/style` 215.

## Entries

### 2026-10-25: start

- Branch `code-health-lib` created; the plan and this log committed first.
