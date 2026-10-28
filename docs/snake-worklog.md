# Work log: Snake on Phaser

The log of [the Snake plan](snake-plan.md), kept so the work can pause and
resume. Newest entries last. It is deleted when the work is done; git
history keeps it.

## How to resume

- Part 1, the `@fz/phaser` lift (L0 to L7), is on the branch `phaser-lift`,
  cut from `main` at `8353bda`, with the plan and this log as its first
  commit. Part 2, Snake (S0 to S12), is on `snake`, cut from `phaser-lift`,
  so `phaser-lift` can be merged to `main` on its own first (decision 19).
  Nothing is merged to `main` or pushed until the user says so: a push to
  `main` deploys.
- The user answered the plan's decisions on 2026-10-27. They took the
  recommendation everywhere but three places, which "The user's answers" in
  the plan lists: Phaser's own input for keys and swipes (5), walls only
  (9), and a new Arcade category (16). On decision 3 they asked that
  headless Phaser in jsdom be tried for Snake, and compared with the
  Solitaire Collection's mocks before that game's specs change.
- They also asked for regular commits, this log, and QA of both games, the
  Solitaire Collection above all, once the work is done.
- S0's mock is not made, as with Sudoku: the user asked for the game itself.
  The design is the plan's, checked in the browser as each phase lands.
- Each phase ends with `yarn verify` green from `frontend/`, and a commit.
- The status table says where things stand; the entries below it say what
  was found on the way.

## Status

| Phase | What                                        | State |
| ----- | ------------------------------------------- | ----- |
| L0    | The spike and the Solitaire baselines       | to do |
| L1    | The `@fz/phaser` workspace                  | to do |
| L2    | The host and the pure entries               | to do |
| L3    | The scene helpers and the headless harness  | to do |
| L4    | The canvas component                        | to do |
| L5    | Build and lint                              | to do |
| L6    | Skills and docs                             | to do |
| L7    | Nothing changed in the Solitaire Collection | to do |
| S0    | The spike                                   | to do |
| S1    | The Snake workspace                         | to do |
| S2    | The rules                                   | to do |
| S3    | The view                                    | to do |
| S4    | The scene                                   | to do |
| S5    | The play and the board                      | to do |
| S6    | The controls                                | to do |
| S7    | The icons, the bar and the dialogs          | to do |
| S8    | Sound                                       | to do |
| S9    | Storage                                     | to do |
| S10   | The checks                                  | to do |
| S11   | Screenshots and docs                        | to do |
| S12   | Ship, and QA of both games                  | to do |

## Entries

### 2026-10-27: start

- Branch `phaser-lift` created from `main` at `8353bda`.
- The plan records the user's answers, and this log starts.
