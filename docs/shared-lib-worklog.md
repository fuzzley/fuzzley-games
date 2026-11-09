# Work log: what the games can still share

The log of `docs/shared-lib-plan.md` as it is built: what each step built,
where it went other than planned and why, what was measured, and each review
comment answered, taken or not. It is deleted once every step is built and
merged.

## How the work is running

- **The branch.** Every phase on `shared-lib`, cut from `main` at
  `72ecbcf4`, its first commit the plan and this log.
- **Side by side.** The steps run in five tracks, each in a git worktree of
  its own under `../fg-wt/`, on a branch cut from `shared-lib`, grouped so no
  two tracks edit the same files where it can be helped:
  - `sl-shell`: F4, F6, F7, 1.1, 1.2, 4.4, 4.6, 4.7, 4.9 and 4.10, the
    shells' scripts, services and head tags.
  - `sl-frame`: 4.1, 4.2 with 4.3, 4.8 and 4.5, the shells' frames,
    settings and How to play, in templates and Sass.
  - `sl-play`: 1.3, 1.5, 2.1 to 2.6 (F2 with 2.2), 3.1 to 3.3, the rules,
    views and scenes of the games drawn with Phaser, and `@fz/core` and
    `@fz/phaser` under them.
  - `sl-tools`: 1.4, 3.4, F5 and Phase 5, the lint presets, the specs'
    helpers and the scripts. 3.4 joins 1.4 here, since both change
    `phaserGameLayers()`'s file.
  - `sl-sol`: Phase 6. 6.4 waits for `sl-frame`'s `choice-list` and
    `segmented` mixins (4.2's step 1 and 4.5).
- **Each step** is built and staged in its worktree, reviewed there by a
  fresh agent as the `commit-review-process` skill says, its comments
  answered, and committed there, then picked onto `shared-lib`, where its
  log entry joins it. A track that needs another's work resets onto
  `shared-lib` once its own commits are all picked.
- **The order on the branch** is the order the steps finish in, not the
  plan's numbering, since the tracks touch different files. Each phase ends
  with `yarn verify`, `yarn check:layout` and the touched games played.

## The steps

### Step F7: Sudoku's list-in-words helper renamed `inWords`

Built as planned on `sl-shell`. Sudoku's private `listOf` in
`src/rules/describe.ts`, which writes "1, 3 and 8", is now `inWords`, so it
no longer shadows `@fz/core/json`'s `listOf`, which `saved_grid.ts` beside it
imports to read a stored list. That is the declaration and its five callers,
with the body and the words unchanged. Sudoku's 592 tests pass.

The review:

1. _No findings._ The reviewer checked that the rename is complete, that the
   words stay pinned by `describe.spec.ts`, and that no doc or skill named
   the old helper.

### Step 1.3: `RunStart extends RunNumber`

Built as planned on `sl-play`. Snake's, Brick Breaker's and Asteroid
Breaker's `RunStart` now extend `@fz/core/run_numbers`' `RunNumber`. The
`id` and `seed` fields they spelled out are gone, two lines a game. The
import is a type alone, so nothing stored, seeded or drawn changes.
`lib/core/AGENTS.md`'s `run_numbers` entry now says each game's `RunStart`
extends it. Lint and typecheck are clean in all three games. Their tests
pass: Snake 421, Brick Breaker 1829 and 180, Asteroid Breaker 3630 and 1620.

The review:

1. _No findings:_ the reviewer found the change type-only, within the rules'
   fence, and the docs true as they stand.

### Step F6: the inner `version: 1` dropped from Minesweeper's and Sudoku's saved games

Built as planned on `sl-shell`. Minesweeper's `saveField()` and Sudoku's
`saveGrid()` no longer write a `version` of their own, and `restoreField()`
and `restoreGrid()` no longer check one, since the saved game's
`writeVersioned()` already versions the whole entry. The readers pick out the
keys they name, so an entry an earlier build stored still reads, which a new
spec in each game holds. The rules' "another version" cases went with the
check. Minesweeper's 373 tests and Sudoku's 592 pass.

The review:

1. _A rollback past this commit loses the games in progress, so write that
   down:_ taken. A build from before this one refuses the field or grid this
   one writes, and its `SavedGameService` forgets the entry as it deals a
   fresh game, so moving `live` back past this commit loses every Minesweeper
   and Sudoku game in progress once, on its first load. The commit's body
   says so. The way around it the reviewer offered, which stops checking now
   and stops writing in a later release, was not taken: it isn't worth it
   for a game in progress.
