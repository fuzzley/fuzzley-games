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

- **5.1** Split `TableGame`: a `Tabletop` class owns the piles, zones and
  every pile change; `TableGame` keeps rules, history and lifecycle. (Named
  `Tabletop` rather than `Board` so it is not confused with the
  `engine/board` tier.)
- **5.2** The header inset measured by the shell instead of copied from SCSS
  into `card_metrics.ts`.
- **5.3** Zone rules separated from zone looks at the type level.
- **5.4** Game variants decoupled from the settings panel's numeric storage.

## Progress

- [x] 0.1 Contract suite
- [x] 0.2 Test position helpers
- [x] 1.1 Dead code
- [x] 1.2 `implements` declarations
- [x] 1.3 Vitest version in docs
- [x] 1.4 `TablePresentation` clash
- [x] 1.5 Subscription idiom
- [x] 1.6 Spec hygiene
- [x] 2.1 One writer for the metrics
- [x] 2.2 Counts read from the history
- [x] 2.3 `relocate` helper
- [x] 3.1 Pile markers
- [x] 3.2 Rules attached directly; column rule helper
- [x] 3.3 Deck construction and dealing helpers
- [x] 4.1 `engine/board` tier and fixture copies deleted
- [x] 4.2 Read-only piles
- [x] 5.1 `Tabletop` split out of `TableGame` (done before 2.3; see log)
- [ ] 5.2 Header inset from the shell
- [ ] 5.3 Zone rules and looks separated
- [ ] 5.4 Variants decoupled from numeric storage

## Log

Newest last. Each entry names its commit subject.

- **docs: start the engine health refactor log.** Recorded the decisions and
  the plan. Baseline: 127 spec files, 3309 tests, all passing.
- **fix: replay Montana's gaps on a restart.** Found by the contract suite
  before it was committed: a restart replayed the deck order but drew
  Montana's four gaps afresh. The gaps now come from a generator seeded by the
  deck order (`seededRandom` and `seedFrom` in
  `src/engine/core/random/seeded_random.ts`), so the snapshot format did not
  change. Note for later specs: `sequenceRandom` yields zeros once its values
  run out, which hides this kind of bug; use `seededRandom` when a test needs
  a source that keeps varying.
- **test: hold every game in the catalog to one contract.**
  `test/ui/app/provider/game_contract.spec.ts` sweeps all 41 games and every
  setting of their rules (`CATALOG_DEALS`, now shared from
  `test/support/ui/catalog_deals.ts`). It plays each through
  `gesturesFor`, newly exported from `board_catalog.ts`, and after every
  action that changes the game it checks: one more history step, each card
  once, `moves` equal to the history length, undo restores the previous
  snapshot exactly, and restore reproduces the post-action snapshot. It also
  unwinds everything by undo and checks restart replays the deal. About 530
  tests; it adds roughly four seconds to `yarn test`. This is the net for
  every later step, so run it after any engine change:
  `npx vitest run test/ui/app/provider/game_contract.spec.ts`.
- **test: give specs one way to arrange a position.**
  `test/support/game_scenarios.ts` is now the only place a spec changes a
  pile: `emptyBoard`, `relocate` (which now also takes a pile id), and
  `cardId("QH")` for short card codes. The FreeCell and Spider specs' copied
  `place` helpers and Montana's hand-built id table are gone. Deviation from
  the plan: no restore-based `arrange` builder. A restore needs every card on
  the board exactly once, and many specs deliberately build partial positions
  with `emptyBoard`; funnelling every change through `relocate` gives the
  same benefit for step 4.2, where `relocate` will be the one place that
  needs write access to a pile.
- **refactor: delete dead Klondike exports and declare what table games
  implement.** Removed `klondikePileLayout` and `KLONDIKE_TABLEAU_RULE`, the
  only two exports nothing referenced (checked with a script over every
  export in `src/engine`, `src/games` and `test/support`). `TableGame`
  declares `implements TableView`; `DealtTableGame` declares
  `implements PlayableGame`. The Vitest 4 → 5 fix in `.agents/AGENTS.md` and
  the `vitest-testing` skill landed in the same commit by accident; the
  separate docs commit came out empty.
- **refactor: hand the view builder a card back key, not a second
  TablePresentation.** `engine/tableau/view/table_view.ts` no longer declares
  a `TablePresentation`; `buildTableViewState` takes `cardBackKey: string`.
  The render tier's `TablePresentation` is now the only one.
- **refactor: make subscribing return the unsubscribe everywhere.**
  `PlayableGame.on` returns the unsubscribe function; `off` is gone from the
  interface (the emitter keeps its own `off`). `Subscribe<T>` lives in
  `src/engine/core/common/event_emitter.ts`. The shell's
  `GameMetricsService` and `SavedGameService`, the board factory and the
  UI game mock all keep a list of disposers.
- **test: scope the board scene spec's state, and derive the boot texture
  key.** `board_scene.spec.ts` declares its game and presentation inside its
  `describe`, set only through `drawBoardOf`, and its imports come before
  any code. `BOOT_TEXTURE_KEY` in `phaser_mocks.ts` calls
  `cardAtlasTextureKey` instead of rebuilding the key format.
- **refactor: let the engine alone write a game's metrics.**
  - `GameState` has no setters; `update(changes)` changes any metrics and
    publishes once. `ReadableGameState` (now in `game_state.ts`, with a
    `snapshot()`) is what `TableGame.state` is typed as, so nothing outside
    the engine can write the score or the move count.
  - `TableGame.syncMetrics(score)` is the only writer. It sets `moves` and
    `undoDepth` both to the history length (decision 1) and is called by
    commit, undo and `resetHistory(moves, score)`, which replaces the old
    `clearHistory` and `replaceHistory`. `MoveHistory.clear` went with
    them.
  - The engine now applies the `scoreDelta` that `applyMoveEffects` and
    `commitAction` report. Klondike and Poker Squares compute a delta
    instead of writing the score; Klondike's starting score moved to a new
    `DealtTableGame.initialScore()` hook.
  - `GameSnapshot` has no `moves`; the reader ignores one in an old save. The
    bug report summary counts moves from the history. That summary trims the
    history to fit a URL, so a restored bug-report position now shows the
    trimmed count rather than the original total.
  - Specs that wrote `game.state.score` now reach the same states through
    public API: Klondike's use a `StandardScoringFrom(score)` test policy in
    `test/games/klondike/scenarios.ts`; the UI game mock calls
    `state.update`, and `snapshotWithMoves(n)` in `game_mock.ts` builds a
    snapshot carrying a move count.
  - The `add-solitaire-game` skill says games report score deltas and never
    write metrics.
- **refactor: read recycle and redeal counts from the history.**
  - `MoveHistory.count(kind)` keeps a tally per kind, updated on record,
    take-back and load; `TableGame.timesApplied(kind)` exposes it to games.
  - Klondike family, Canfield, Pyramid, La Belle Lucie and Montana dropped
    their counter fields and their `afterUndo`, `saveExtra` and
    `restoreExtra` overrides. With no users left, those three hooks are gone
    from the engine, and so is `GameSnapshot.extra`; the reader ignores an old
    save's `extra`.
  - `KlondikeFamilyGame` lost its `dealLayout` indirection: Klondike and
    Double Klondike override `dealBoard` directly.
  - `MoveHistory.takeBack` now announces the cards it put back itself, as
    `record` does, since the hook it used to wait for is gone; `announce` is
    private.
  - Action names live in `ActionKind` (`src/games/common/action_kinds.ts`);
    the engine's own is `MOVE_KIND` in `move.ts`. Every game uses them.
  - Tests that checked `snapshot().extra` now check the observable count
    (`recyclesRemaining` under Vegas scoring, `redealsRemaining`); the tests
    that rejected a snapshot missing a counter went, per decision 3, as did the
    engine's `ModalGame` extra-state tests.
- **refactor: give the piles and every change to them a class of their own.**
  Done ahead of 2.3, out of plan order, because `relocate` belongs on it and
  would otherwise have been written on `TableGame` and moved later.
  - `src/engine/tableau/tabletop.ts`: `Tabletop` holds the piles, the role
    index, the zones and the card locations, and implements `BoardQuery`
    (so `TableGame.board` is simply the tabletop). It makes every change of
    pile: `relocate(cards, to, { faceUp })` and `rearrange(layout)`, which
    return the transfers undo needs; `reverse(transfer)` for undo; `place`
    and `clear` for deals and restores.
  - `rearrange` is for redeals that lay several piles out at once. It skips
    cards that keep their place at the bottom of their pile, and lists the
    rest last pile first, top card first, so undo's backwards append rebuilds
    every pile. The spec checks undo restores the table exactly.
  - `TableGame` composes it as the protected `tabletop` and delegates its
    public board queries to it. `MoveHistory` reverses transfers through
    `HistoryBoard.reverse` instead of moving cards itself.
  - `move_history.spec.ts` runs on a real `Tabletop` instead of a
    hand-written board.
- **refactor: make every recorded change of pile through the tabletop.**
  - No `CardTransfer` is written by hand any more outside `Tabletop`. A move
    (`TableGame.moveCardToPile`), every helper in `games/common`
    (`drawToWaste`, `recycleWasteToStock`, `dealRowFromStock`,
    `dealRowCollectingRuns`, `collectCompletedRuns`, `runCollectingEffects`,
    `discardPairEffects`), Canfield's reserve fill and Pyramid's hand
    discard all call `tabletop.relocate`. The helpers take the tabletop as
    their first argument.
  - La Belle Lucie, Montana and Monte Carlo redeal through
    `tabletop.rearrange`. La Belle Lucie gained a pure `fanLayout` that both
    its deal and its redeal use. The transfers these record differ from the
    old hand-built ones (cards that keep their place are no longer listed),
    but undo restores the same table, which the contract suite checks.
  - `relocate` throws if its cards are not in one pile or not turned the same
    way. Nothing in the contract sweep trips it.
  - `FakeTableGame` draws and recycles through `relocate` too. The helper
    specs run on `TestTabletop` (`test/support/test_tabletop.ts`), a real
    `Tabletop` whose piles take any card.
  - Deal-time placement (`dealBoard` and the `*_deal.ts` files) still calls
    `addCard` directly; step 3.3 moves it onto the tabletop.
  - The `add-solitaire-game` and `typescript-strict-patterns` skills
    describe `tabletop.relocate` and `rearrange` and the new helper
    signatures.
- **refactor: let a game mark a pile's slot instead of overriding the
  view.**
  - `TableGame.markPile(pile, () => PileMarker)` registers a marker giving
    `{ artwork, actionable }`. `pileBackgroundKey` and `isEmptySlotActionable`
    consult it (then the zone) and are no longer meant to be overridden;
    nothing overrides them now.
  - `recycleMarker({ usable, remaining, allowed })` in
    `src/games/common/zone_presets.ts` builds the closed / pips / recycle-arrow
    marker. Klondike family, Canfield, Pyramid, La Belle Lucie, Montana and
    Monte Carlo each register one in the constructor in place of their two
    overrides. Each game's `usable` keeps its old behaviour exactly,
    including Vegas draw-1 Klondike showing the recycle arrow until its stock
    empties, and Rainbow's closed outline.
  - `StockOverrideTableGame` in the fake table uses a marker too.
  - The `add-solitaire-game` skill now says to mark the pile.
- **refactor: name each zone's rule directly, and derive run columns from
  one adjacency.**
  - The thirteen `xxxPlacementRule(role)` switches are gone (Baker's Dozen,
    Double Klondike, Easthaven, Eight Off, Forty Thieves, FreeCell, Klondike,
    Scorpion, Seahaven, Simple Simon, Spider, Spiderette, Yukon). Each zones
    file names its rule constant, or `null` for a pile that takes nothing; a
    script did the substitution from each switch's own cases. The fake
    table's `fakePlacementRule` went the same way.
  - `runColumn({ adjacent, whenEmpty, maxStack })` in `zone.ts` returns a
    column's `accept` and `grab` together (`ColumnRules`). Eight Off,
    Seahaven, Easthaven, Penguin and Canfield export a column constant or
    function built with it in place of a tableau rule paired with a grab rule
    declared in another file. FreeCell's variant table now holds
    `runColumn` options and exports `freeCellColumn(variant)`;
    `freeCellRunAdjacency` is gone. Spider-style games keep their build and
    lift apart on purpose.
  - `klondike_rules.spec.ts` reads each rule from `klondikeZoneSpecs` instead
    of the deleted switch, so it tests the wiring a game is built from.
  - The `add-solitaire-game` skill describes naming rules directly and
    `runColumn`.
- **refactor: deal through a Deal that places cards on the tabletop.**
  - `DealtTableGame` takes `deck: DeckSourceOptions` (`{ cardIds, random?,
dealsFaceUp? }`, in `deck_source.ts`) and builds the registry and the
    `DeckSource` itself; its `deck` field is now private. Every game passed
    the same `new DeckSource(new CardRegistry(), …)`, and most dropped their
    `random = Math.random` default. La Belle Lucie and Montana keep theirs,
    because their redeals shuffle with it.
  - `dealBoard(deal: Deal)`. `Deal` (`src/engine/tableau/deal.ts`) hands out
    the shuffled cards last first and places them through `tabletop.place`:
    `draw`, `peek`, `dealTo`, `dealEach`, `dealRest`, `pull`,
    `pullFirst`, `putBack`, `putUnder`, `drawAll`, `place`.
  - Every `*_deal.ts` and the four inline deals (Pyramid, Monte Carlo, Poker
    Squares, TriPeaks) were rewritten onto it by hand, keeping each deal's
    exact order, including the odd cases where a card that has nowhere to go
    is dropped. The fixed-shuffle game specs pass unchanged, which pins the
    layouts.
  - `src/games/common/pull_cards.ts` and its spec are gone; `Deal.pull` and
    `pullFirst` replace them. The Klondike and FreeCell almost-win deals take
    their cards from the deal instead of `DeckSource.register`/`find`, so
    `DeckSource.find` and `size` went, and `registry` is private.
  - No game calls `addCard` or `removeCard` any more; outside `engine/core`
    only `Tabletop` does. The remaining direct writes in games are card
    flips (`faceUp = true`), which undo records through `flippedCardIds`.
  - Specs that call a deal function directly deal onto `TestTabletop`, which
    gained `deal(cards)`.
  - The `add-solitaire-game` skill documents `Deal` and the deck options.
- **refactor: give the board factory a tier of its own, engine/board.**
  - `src/games/common/board_scene_factory.ts` →
    `src/engine/board/table_board_scene.ts` (`makeTableBoardScene`), and its
    spec → `test/engine/board/table_board_scene.spec.ts`.
  - `src/games/common/table_gestures.ts` → `src/engine/tableau/table_gestures.ts`.
    Its spec moved to `test/engine/tableau` and now plays on the fake table
    instead of FreeCell, since engine specs may not name a game.
  - `BoardSceneOptions` takes `presentation: TablePresentation` whole instead
    of five callbacks copied from it.
  - The fake table's duplicates are gone: `makeFakeTableBoardScene` calls
    `makeTableBoardScene`, and `fakeTableGestures` is built from
    `tableGestures` and `drawOnStockTop`.
  - `eslint.config.cjs`: `engine/board` may import every engine tier and
    Phaser, nothing above; no lower tier may import it. Games may no longer
    import Phaser, the Phaser adapter or `engine/board` (nothing in
    `src/games` did after the move). A probe file confirmed both new rules
    fire.
  - `AGENTS.md` (tier diagram, layer list, lint table) and the
    `add-solitaire-game` and `phaser-core` skills describe the new tier.
- **refactor: hand piles out read-only everywhere but the tabletop.**
  - `ReadonlyCardPile<T>` in `card_pile.ts` (id, role, topCard, isEmpty,
    size, getCards, contains); `CardPile` implements it.
  - Every use of `CardPile` in `src` outside core and `Tabletop` is now
    `ReadonlyCardPile` (74 files, by a word-boundary rename): `BoardQuery`,
    `PlacementContext`, `TableView`, `ResolvedMove`, every game's pile
    fields, every helper and deal. `Tabletop` keeps the changeable piles
    private; `relocate`, `rearrange` and `place` take a read-only pile and
    resolve their own, throwing for a pile from any other table (`own`).
  - Card faces stay writable (`PlayingCard.faceUp`), as the flips games make
    are recorded through `flippedCardIds`. Making cards read-only too would be
    a further step, not taken.
  - Specs change piles only through `test/support/game_scenarios.ts`, which
    narrows with `instanceof CardPile` and gained `clearPile(pile)` and
    `takeOffBoard(game, cardId)`. The engine spec's test game uses its
    tabletop for `place` and `turnOver`.
  - `yarn build` passes (its chunk-size warning predates this work).
  - The `add-solitaire-game` and `typescript-strict-patterns` skills
    describe read-only piles.
