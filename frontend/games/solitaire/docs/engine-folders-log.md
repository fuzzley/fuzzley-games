# Engine folders: work log

This file tracks the reorganisation of `src/engine` into subfolders, and the
splitting of files that held several concerns, so the work can stop and
restart at any commit. No behaviour is meant to change.

**Branch:** `refactor/engine-folders`, cut from `main` at `3cc900b`.

**Status:** in progress.

## How to pick this up

1. `git checkout refactor/engine-folders` and read [Progress](#progress).
2. Run `yarn tsc && yarn test` to confirm the tree is green before going on.
3. Take the first unchecked step, and add an entry to [Log](#log) saying what
   changed and anything surprising.
4. Before each commit run `yarn verify` and gate on its own exit status (not
   through a pipe). Format touched files with
   `yarn exec prettier --write <files>`, never `yarn prettier`, which rewrites
   the whole repository.
5. When every phase is done: merge to `main` with a `Merge:` commit (message
   written to a scratchpad file, `git merge --no-ff -F <file>`), then delete
   this log as the last commit. Do not push.

## Decisions

Settled with the project owner on 2026-10-10.

1. **All six phases,** including the Phaser subfolders.
2. **No barrel (`index.ts`) files.** Every import names a concrete module, as
   everywhere else in the codebase.
3. **Same tier, relative import; another tier, `@/` alias.** As the engine
   already does. `render/phaser` counts as part of `render` here, as it does
   today (`../view/...`). Tests always use the alias.
4. **Splits keep what history they can:** the larger half of a split file is
   `git mv`ed and the rest written fresh, though git only reports a rename
   when that half keeps most of the original.

### Tooling

Imports are rewritten by a one-off Node script that lives in the session
scratchpad, not the repository: `rewrite-imports.mjs <map.json>`. It parses
every `.ts` file under `src` and `test` with the TypeScript compiler API and,
given

- `files`: old module path → new module path, for moved files, and
- `symbols`: old module path → `{ symbol: new module path }`, for split files,

re-points every import (and `vi.mock` path) at the module that now declares
the symbol, re-relativising specifiers of moved files. It touches only imports
of a moved or split module, or relative imports inside a moved file, and a
relative path that already resolves from a moved file's new place is kept, so
it can be re-run safely after hand edits. It throws on a symbol imported from
a split module that the map does not place.

A second script, `split-spec.mjs <config.json>`, splits a spec file's top-level
`describe` blocks into several files, each taking only the helpers and imports
its blocks use (it can over-keep a helper whose name is also a property name;
`yarn tsc` reports it as unused).

A third, `move-decls.mjs <from.ts> <to.ts> <name...> [--before <name>]`,
moves named top-level declarations with their doc comments, carries the
imports they use (re-relativised), prunes the source's unused imports, and
imports a moved name back into the source if it still uses it.

The rewrite script emits a relative path for any same-tier target, whatever
the original specifier, since engine files never alias their own tier.

Run the rewrite right after the `git mv`s and before hand edits to the moved
files: then every relative path in a moved file is still written from its old
place. If the script is
lost, the maps in each phase below say what moved where; the compiler finds
anything missed.

## Target layout

### tableau

```
engine/tableau/
  table_game.ts           TableGame, orchestration only
  dealt_table_game.ts     ← dealt_game.ts; snapshot checks move to session/
  tabletop.ts
  move_legality.ts        ← TableGame.resolveMove
  rules/
    board_query.ts        ← rules.ts BoardQuery
    placement.ts          ← rules.ts PlacementContext/Rule and combinators, hasRank
    adjacency.ts          ← rules.ts Adjacency (new name), isRed, is*Run, isOrderedPair*, isAdjacentRank
    builds.ts             ← rules.ts buildsOn, descending*/ascending*, foundations, singleCardCell, cellStagingLimit
    grab.ts               ← zone.ts GrabRule, canGrab, isUncovered, + grabbedStack
    run_column.ts         ← zone.ts runColumn, RunColumnOptions, ColumnRules
  zones/
    zone.ts               ZoneRules, ZoneSpec, hasRoomFor
    zone_look.ts          ← view/zone_look.ts
    zone_builder.ts
    pile_marker.ts        ← table_game.ts PileMarker + PileMarkers
  moves/
    move.ts               + ResolvedMove, MoveEffects, NO_MOVE_EFFECTS ← table_game.ts
    move_history.ts
  dealing/
    deal.ts
    deck_source.ts
  session/
    playable_game.ts
    game_state.ts
    game_snapshot.ts
    snapshot_resolution.ts ← DealtTableGame's private checks
  gestures/
    table_gestures.ts
    press_handlers.ts     ← table_gestures.ts drawOnStockTop, dealOnStockPress, playOnPress
  view/
    table_view.ts
    table_view_builder.ts
    highlight_views.ts    ← builder's highlight methods
    drag.ts               ← grabbable_stack.ts stackFromCard + builder's resolveDragTarget
    pile_arrangement.ts
    pile_backgrounds.ts   + builder's per-frame background views
```

### render

```
engine/render/
  geometry.ts             Point ← core/common/point.ts, Size ← table_layout.ts, Rect ← table_view_state.ts
  presentation.ts
  deck/
    card_back.ts          ← render/card_back.ts
    card_deck.ts          ← render/card_deck.ts
    card_art_scale.ts     ← card_metrics.ts CARD_ART_SCALES, CardArtScale, cardArtScaleFor
  layout/
    viewport.ts           ← table_view_state.ts Viewport, Insets, NO_INSETS
    form_factor.ts
    card_metrics.ts
    table_layout.ts
    table_metrics.ts      ← table_layout.ts measuring
    board_arrangement.ts  ← board_layouts.ts arrangement choice
    board_layouts.ts
    pile_layout.ts
    drop_geometry.ts      + PileGeometry ← table_view_state.ts
  input/
    table_intents.ts
    interaction_state.ts  ← table_view_state.ts Drag/FlightInteraction, TableInteractionState
    drag_controller.ts
  view/
    table_view_state.ts
    render_layers.ts      ← layout/render_layers.ts
    table_renderer.ts
  phaser/
    host/   phaser_host.ts, viewport_scaler.ts
    deck/   card_deck_atlas.ts (+ bootCardAtlas), board_deck_loader.ts
    scene/  board_scene.ts, board_input_manager.ts, phaser_card_factory.ts,
            phaser_table_renderer.ts (+ HIGHLIGHT_ANCHOR_SETTLE_TOLERANCE), phaser_sprites.ts
```

## Progress

- [x] **Phase 1:** tableau `rules/` and `zones/`.
- [x] **Phase 2:** tableau `moves/`, `dealing/`, `session/`, `gestures/`;
      slim `TableGame` and `DealtTableGame`.
- [x] **Phase 3:** tableau `view/` split; move the `resolveDragTarget` spec.
- [x] **Phase 4:** render `geometry.ts`, `layout/viewport.ts`,
      `input/interaction_state.ts`, `view/render_layers.ts`.
- [ ] **Phase 5:** render `table_metrics.ts`, `board_arrangement.ts`, `deck/`.
- [ ] **Phase 6:** phaser `host/`, `deck/`, `scene/`; `bootCardAtlas`.
- [ ] **Docs:** AGENTS.md architecture section describes the new folders.
- [ ] **Merge** to `main`, then delete this log.

Each phase also fixes the skill, tool-comment and doc paths it breaks, since
`yarn lint` runs `skills:check`.

## Log

### 2026-10-10

- Branch cut. Baseline `yarn verify` green: 163 spec files, 6810 tests.
- **Phase 1 done.** `rules.ts` split into `rules/board_query.ts`,
  `placement.ts`, `adjacency.ts` and `builds.ts`; `zone.ts`
  moved to `zones/zone.ts`, giving `GrabRule`/`canGrab`/`isUncovered` to
  `rules/grab.ts` and `runColumn` to `rules/run_column.ts`; `zone_builder.ts`
  and `view/zone_look.ts` moved into `zones/`. New `Adjacency` type names the
  `(lower, upper) => boolean` that grab rules, `buildsOn`, `runColumn` and
  `isAdjacentRank` spelled out. Specs split the same way (`rules.spec.ts` into
  three, `zone.spec.ts` into `rules/grab`, `rules/run_column`, `zones/zone`).
  85 importers rewritten. Skill `add-solitaire-game` and
  `docs/phone-board-layouts.md` re-pointed. 167 spec files, 6810 tests.
- Gotcha: the first rewrite run also re-wrote unrelated relative imports in
  tests; fixed by restricting it to affected imports (see Tooling). Restore a
  bad run with `git diff --name-only --diff-filter=M | xargs git checkout --`,
  which keeps staged renames and deletions.
- **Phase 2 done.** Moved `move.ts`/`move_history.ts` into `moves/`,
  `deal.ts`/`deck_source.ts` into `dealing/`, `playable_game.ts`,
  `game_state.ts` and `game_snapshot.ts` into `session/`,
  `table_gestures.ts` into `gestures/`, and renamed `dealt_game.ts` to
  `dealt_table_game.ts`. Extracted:
  - `ResolvedMove`, `MoveEffects`, `NO_MOVE_EFFECTS` from `table_game.ts`
    into `moves/move.ts`; the unused `RelocationListener` re-export dropped.
  - `TableGame.resolveMove` (public, no callers) into
    `move_legality.ts` as `resolveMove(tabletop, cardId, targetPileId)`.
  - `grabbedStack` in `rules/grab.ts`, now the one definition of what a
    grab lifts, used by `resolveMove` and `view/grabbable_stack.ts`.
    `resolveMove` keeps its own face-up check.
  - `PileMarker` and a `PileMarkers` class into `zones/pile_marker.ts`;
    `TableGame` keeps `markPile` and its two readers, delegating.
  - DealtTableGame's snapshot checks into `session/snapshot_resolution.ts`
    (`resolveSnapshot`), same errors, same order.
  - `drawOnStockTop`, `dealOnStockPress`, `playOnPress` into
    `gestures/press_handlers.ts`, typed by a new `CardPressHandler`.
    New specs: `move_legality`, `zones/pile_marker`,
    `session/snapshot_resolution`, `gestures/press_handlers` (now also
    covering the two stock handlers), and `grabbedStack` in `rules/grab`.
    Skills `add-solitaire-game` and `typescript-strict-patterns` and
    `docs/phone-board-layouts.md` re-pointed. 171 spec files, 6843 tests.
- **Phase 3 done.** `view/grabbable_stack.ts` became `view/drag.ts`, which
  also takes `resolveDragTarget` from the builder. The builder's highlight
  methods became `view/highlight_views.ts` (`highlightViews`, one
  `border` helper for the four shapes it built by hand), and its placeholder
  views became `pileBackgroundViews` in `view/pile_backgrounds.ts`;
  `table_view_builder.ts` is down to the cards (443 → 233 lines). The
  misplaced `test/engine/render/layout/drop_geometry_resolve.spec.ts` became
  `test/engine/tableau/view/drag.spec.ts` (plus new `stackFromCard` tests),
  its `resolveDropTarget` tests joining `drop_geometry.spec.ts`. The builder
  spec still covers highlights and placeholders through
  `buildTableViewState`, its nested describes not worth splitting. The
  add-solitaire-game skill's tier table also gained the missing
  `engine/board` row and the games row's real limits. 6846 tests.
- Noted for phase 5: `drop_geometry.spec.ts` also tests `computeScale`,
  `computePileOrigins` and the pile offsets on the fake table, beside the
  dedicated specs for those modules.
- **Phase 4 done.** `core/common/point.ts` became `render/geometry.ts`
  (nothing in core used `Point`), joined by `Size` from
  `layout/table_layout.ts` and `Rect` from `view/table_view_state.ts`.
  `Viewport`/`Insets`/`NO_INSETS` moved to `layout/viewport.ts`,
  `PileGeometry` to `layout/drop_geometry.ts`, the drag, flight and
  interaction state to `input/interaction_state.ts`, and
  `layout/render_layers.ts` to `view/render_layers.ts` (spec too).
  `layout/` no longer imports from `view/`, and the
  `pile_layout` ↔ `table_layout` type cycle is gone. Skills
  `phaser-core` and `phaser-canvas-performance` re-pointed. 6846 tests.
