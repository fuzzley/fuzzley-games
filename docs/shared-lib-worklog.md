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
