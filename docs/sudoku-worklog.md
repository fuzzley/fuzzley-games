# Work log: Sudoku

The log of [the Sudoku plan](sudoku-plan.md), kept so the work can pause and
resume. Newest entries last. It is deleted when the work is done; git
history keeps it.

## How to resume

- The library lift (S1) is on the branch `library-lift`, cut from `main` at
  `67c4436`, with the plan and this log as its first commit. Sudoku itself
  (S2 on) is on `sudoku`, cut from `library-lift`, so `library-lift` can be
  merged to `main` on its own first (decision 10). Nothing is pushed: a push
  to `main` deploys.
- The user said "Implement the sudoku game planned in a previous session"
  (2026-10-27), which takes the recommendation in every decision: Angular
  alone; a graded bank dealt through the symmetries; four levels, Easy
  first; repeats always marked, the solution checked only as an assist, no
  lives; hints that name the next step, counted, with no best time; notes
  with the N key, Shift and automatic clearing; undo without redo, kept
  across a reload; settings, stats and the game kept; the three lifts and
  three icons; and the lift merged first, Sudoku once, with a fresh
  `added` date.
- S0's mock was not made: the user asked for the game itself, not for a
  mock to approve first. The design is the plan's, and the screenshots
  sent along the way stand in for the mock.
- Each phase ends with `yarn verify` green from `frontend/`, and a commit.
- The status table says where things stand; the entries below it say what
  was found on the way.

## Status

| Phase | What                             | State       |
| ----- | -------------------------------- | ----------- |
| S0    | The bank spike                   | in progress |
| S1    | The library lift                 | to do       |
| S2    | Scaffold the workspace           | to do       |
| S3    | The rules                        | to do       |
| S4    | The solver, the grader, the bank | to do       |
| S5    | The new icons                    | to do       |
| S6    | The board and the pad            | to do       |
| S7    | The bar and the dialogs          | to do       |
| S8    | Storage                          | to do       |
| S9    | The checks                       | to do       |
| S10   | Screenshots and docs             | to do       |
| S11   | Ship                             | to do       |

## Entries

### 2026-10-27: start

- Branch `library-lift` created from `main` at `67c4436`.
- Baseline `yarn verify` run on the clean branch, its output and both
  games' `dist/` kept in the session's scratchpad (`baseline/`) for S1's
  before-and-after comparison.
