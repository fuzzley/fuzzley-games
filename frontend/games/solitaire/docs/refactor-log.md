# Engine health refactor: work log

This file tracks the refactor that came out of the October 2026 review of the
game, rendering and test code. It records what we decided, what is done, and
what is next, so the work can stop and restart at any commit.

**Branch:** `refactor/engine-health`, cut from `main` at `2d4c80b`.

**Status:** in progress. See [Progress](#progress) for the step under way.

## How to pick this up

1. `git checkout refactor/engine-health` and read [Progress](#progress).
2. Run `yarn tsc && yarn test` to confirm the tree is green before going on.
   Every commit on the branch is meant to pass `yarn lint`, `yarn tsc` and
   `yarn test`.
3. Take the first unchecked step. Each step is one commit, or a few, and adds
   an entry to [Log](#log) saying what changed and anything surprising.

## Decisions

Settled with the project owner before any code changed.

1. **The move count is the history length.** `moves` and `undoDepth` were two
   counters that always agreed. Both now read the length of the history, and a
   snapshot no longer stores `moves`.
2. **Undo stays record-based, through one helper.** Every recorded change of
   pile goes through a single `relocate` helper that moves the cards and
   returns the `CardTransfer` describing it. We are not moving to a journal
   that records every pile and face change.
3. **Old saves keep loading; the counters' tests go.** Recycle and redeal
   counts are read from the history. A saved game still restores, since its
   history is in the snapshot, and the tests that rejected a snapshot without
   a counter are dropped.
4. **The board factory gets a tier of its own: `src/engine/board`.** It may
   import both `engine/tableau` and `engine/render/phaser`, and nothing above.
5. **Everything in the review is in scope**, Phase 5 included, except the
   journal-based undo that decision 2 rules out.

## The plan

The review's findings, grouped into phases. Each phase leaves the tree green.

### Phase 0: safety net

- **0.1 Contract suite.** One spec that sweeps every catalog entry and every
  setting of its rules, plays it through its own gesture map, and checks
  invariants after every step: each card on the board once, every change is
  one undoable step, undo restores the previous snapshot exactly, a snapshot
  restores to an identical game, and a restart replays the deal.
- **0.2 Test position helpers.** One sanctioned way for a spec to arrange a
  position, replacing the duplicate `place` helpers, plus a short card
  notation.

### Phase 1: quick wins

- **1.1** Delete dead code (`klondikePileLayout`, `KLONDIKE_TABLEAU_RULE`).
- **1.2** Declare `implements PlayableGame, TableView` on the table games.
- **1.3** Fix the Vitest version in `AGENTS.md` and the `vitest-testing` skill.
- **1.4** Remove the clash between the two `TablePresentation` interfaces.
- **1.5** One subscription idiom: subscribing returns an unsubscribe function.
- **1.6** Spec hygiene: imports after code and shared mutable state in
  `board_scene.spec.ts`; `BOOT_TEXTURE_KEY` rebuilding the texture key format.

### Phase 2: engine hardening

- **2.1** One writer for the metrics: the engine applies every score change a
  game reports, publishes once per action, and reads moves from the history.
- **2.2** Read recycle and redeal counts from the history
  (`MoveHistory.count`), deleting `afterUndo`, `saveExtra`, `restoreExtra` and
  the snapshot's `extra`.
- **2.3** The `relocate` helper, and every hand-built `CardTransfer` moved
  onto it.

### Phase 3: shared parts for games

- **3.1** Pile markers: one declarative way for a stock or redeal marker to say
  what it shows and whether pressing it does anything, replacing six pairs of
  `pileBackgroundKey` and `isEmptySlotActionable` overrides.
- **3.2** Rules attached to zones directly, retiring the thirteen
  `xxxPlacementRule(role)` switches, and one helper deriving a column's build
  and lift rules from a single adjacency.
- **3.3** The deck built by `DealtTableGame`, and shared dealing helpers in
  place of the copied deal loops.

### Phase 4: layering

- **4.1** `src/engine/board` for the board scene factory, `tableGestures` moved
  into `engine/tableau`, `BoardSceneOptions` taking the presentation whole, and
  the copies in `test/support/fake_table` deleted.
- **4.2** Read-only piles on every game's public surface; all pile changes go
  through the engine.

### Phase 5: deeper structure

- **5.1** Split `TableGame`: a `Board` class owns the piles, zones and every
  pile change; `TableGame` keeps rules, history and lifecycle.
- **5.2** The header inset measured by the shell instead of copied from SCSS
  into `card_metrics.ts`.
- **5.3** Zone rules separated from zone looks at the type level.
- **5.4** Game variants decoupled from the settings panel's numeric storage.

## Progress

- [ ] 0.1 Contract suite
- [ ] 0.2 Test position helpers
- [ ] 1.1 Dead code
- [ ] 1.2 `implements` declarations
- [ ] 1.3 Vitest version in docs
- [ ] 1.4 `TablePresentation` clash
- [ ] 1.5 Subscription idiom
- [ ] 1.6 Spec hygiene
- [ ] 2.1 One writer for the metrics
- [ ] 2.2 Counts read from the history
- [ ] 2.3 `relocate` helper
- [ ] 3.1 Pile markers
- [ ] 3.2 Rules attached directly; column rule helper
- [ ] 3.3 Deck construction and dealing helpers
- [ ] 4.1 `engine/board` tier and fixture copies deleted
- [ ] 4.2 Read-only piles
- [ ] 5.1 `Board` split out of `TableGame`
- [ ] 5.2 Header inset from the shell
- [ ] 5.3 Zone rules and looks separated
- [ ] 5.4 Variants decoupled from numeric storage

## Log

Newest last. Each entry names its commit subject.

- **docs: start the engine health refactor log.** Recorded the decisions and
  the plan. Baseline: 127 spec files, 3309 tests, all passing.
