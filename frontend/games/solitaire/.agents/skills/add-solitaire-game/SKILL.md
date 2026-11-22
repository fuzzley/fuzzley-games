---
name: add-solitaire-game
description: Adds a game or a rule variant to the Solitaire Collection — a catalog entry or an option on one, the files a game is made of, its arranged grids, the four provider edits, and the engine tier new code belongs in. Triggers on: new solitaire game, rule variant, src/games, game_catalog.ts, gameOption, zone_presets, arrangedLayouts, board_catalog.ts, lint refuses an import.
---

# Adding a solitaire game

A new game is up to six files under `src/games/<game>/` and four provider
edits. The board, the moves, undo, the win check, the drag and the sprites are
the engine's, the same in every game. A game says only what its piles are,
what they accept, what may be lifted off them and how the cards start out.

Work in this order: each step compiles against the one before. Read a sibling
first and keep its shape: `src/games/klondike/` for a stock and a waste,
`src/games/freecell/` for cells and no stock. Paths are relative to
`frontend/games/solitaire/`.

## 1. Decide: a new entry, or an option on an existing game?

- **A catalog entry carries exactly one `layout`, so an option cannot change
  the grid.** A different grid is always a new entry. Maria, Limited and
  Lucas are entries of their own, on nine, twelve and thirteen columns, and
  still share `FortyThievesGame`, its rules and its gestures.
- **Same grid, different rules: a variant option on the existing entry,**
  even for a traditional game with a name of its own, as Whitehead is on
  Klondike and Alaska on Yukon.
- **An entry of its own on a shared grid needs a reason.** Baker's Game and
  Challenge FreeCell are entries on FreeCell's grid, sharing `FreeCellGame`
  and `FREECELL_LAYOUT`, so that FreeCell's entry stays without options.
- **Share the game class when little of the rules differs.** The gestures go
  with the class.

### Adding a variant to an existing game

No new folder and no new board.

1. **Add a member to the variant union in `<game>_rules.ts`,** and its row to
   that file's variant table.
2. **Add a choice to the option in `src/ui/app/provider/game_catalog.ts`.**
   Its `rule` is the variant member the game is handed, and its `value` the
   number the settings store. Give it a `value` one more than the highest the
   option has, and never reuse or renumber one, or a saved preference picks a
   different game. A new option is built with
   `gameOption<MyVariant>({ …, defaultRule })`, as `YUKON_VARIANT` is. A
   variant option has the id `variant`, and the catalog spec then holds it
   to `control: "list"` and a one-line `description` on every choice.
3. **Document the choice under `settingsAndVariants`** in
   `src/ui/app/provider/game_documentation_data.ts`.
4. **A variant known by a name of its own, as Whitehead and Russian Solitaire
   are, also joins its game's `variants`** in
   `src/ui/app/provider/game_profile_data.ts`, so the game browser lists it as
   a game, and `index.html` names it (step 8). Its `values` come from
   `storedValues()`, never a number spelled out. A choice that only makes the
   game easier or harder, as Spider's suit count does, stays a rule: rate it
   with a `DifficultyByRule`.

## 2. `<game>_rules.ts` — roles and what each pile accepts

- **A const object of roles (`KlondikeRole`) names the parts a pile can
  play, and each destination pile's `PlacementRule` is a named constant or a
  function of the variant** (`KLONDIKE_FOUNDATION_RULE`,
  `klondikeTableauRule(variant)`). The zones in step 3 name them directly, so
  write no function from a role back to its rule.
- **Compose a rule from `src/engine/tableau/rules/`,** not from predicates
  written by hand: the combinators in `placement.ts` (`all`, `byEmptiness`,
  `cardIs`, `maxStackSize`), what may sit on what in `adjacency.ts`, and in
  `builds.ts` the builds made from those and the whole piles
  (`suitFoundation`, `singleCardCell`, `baseRankFoundation`). A rule that
  must see the rest of the board reads `context.board`.
- **Derive a column's build and lift from one adjacency.** Where the runs a
  player may lift are the runs they may build,
  `runColumn({ adjacent, whenEmpty, maxStack })`
  (`src/engine/tableau/rules/run_column.ts`) returns the `accept` and the
  `grab` together, to spread into `columnRow`. A run that lifts under one
  rule and can't land under the other is a bug that shows only mid-drag.
  Spider, Spiderette and Simple Simon build on any suit and lift only
  same-suit runs, on purpose, so they name the two apart.
- **A game with variants keeps them in one table,** each build rule beside
  the grab rule it must agree with, as `src/games/klondike/klondike_rules.ts`
  and `src/games/freecell/freecell_rules.ts` do.
- **Take a supermove limit from a sibling:** `supermoveLimit` in
  `freecell_rules.ts`, or `cellStagingLimit(cellRole)` from `builds.ts` where
  an empty column takes only a King. One written fresh tends to count the
  empty column the run is moving into, which can stage none of it.

## 3. `<game>_zones.ts` — the board as data

- **One `ZoneSpec` per pile** (`src/engine/tableau/zones/zone.ts`): how it
  plays, its `ZoneRules`, and how it looks, its `ZoneLook`. Nothing else
  switches on a pile's role.
- **Build the rows from `src/games/common/zone_presets.ts`** (`foundationRow`,
  `cellRow`, `columnRow`, `stockZone`, `wasteZone`), which carry the
  placeholder artwork, the stacking, the face rule and the grab defaults. Ids
  come from `src/games/common/pile_ids.ts`, and how a pile arranges its cards
  from `src/games/common/pile_layouts.ts`.
- **A pile that is never a destination gets `accept: null`,** not a rule that
  refuses everything: null keeps a drag from offering it as a target.
- **A zone's `grab` must agree with its build rule from step 2.** The kinds
  are `GrabRule`'s, in `src/engine/tableau/rules/grab.ts`.
- **Write the zones as a plain function of the choices that shape the
  board,** such as the variant or the draw count. The game hands the result
  to `super` once, so its zones are fixed for its life: changing a rule deals
  a new game.
- **A slot need not be a whole cell of a plain row.** `zoneRow`
  (`src/engine/tableau/zones/zone_builder.ts`) takes a function for `column`,
  as in `src/games/flower_garden/flower_garden_zones.ts`, and `zoneAt`, beside
  it, places one slot anywhere, at a fraction of a cell if need be, as in
  `src/games/pyramid/pyramid_zones.ts`.
  Piles are drawn in the order declared, so declare last the ones that lie on
  top.

## 4. `<game>_deal.ts` — the opening position

A plain function of the `Deal` (`src/engine/tableau/dealing/deal.ts`) and the
piles, which says the side every card shows as it is placed.

- **Place every card through the `Deal`,** never a pile's `addCard`. It
  covers the odd deal too: `pull()` for cards placed before the rest, then
  `peek()`, `putBack()`, `putUnder()` and `drawAll()`.
- **Reuse first:** `dealColumnsThenCells()`, `dealRowFromStock()` and
  `dealRowCollectingRuns()` in `src/games/common/row_deal.ts`, and
  `sinkKings()` in `src/games/common/sink_kings.ts`.
- **A deal bypasses the placement rules,** so it keeps to a pile's `capacity`
  itself. A cell's `capacity: 1` holds for moves, not for the deal.

## 5. `<game>_game.ts` — the class

Extend `DealtTableGame` (`src/engine/tableau/game/dealt_table_game.ts`), which
owns the new-game and restart cycle. `src/games/klondike/klondike_game.ts`
shows the shape.

- **The constructor takes one options object extending `DeckOptions`**
  (`src/games/common/deck_options.ts`), destructured with its defaults.
  `cardIds` and `random` are there so a spec can deal a short deck and a
  fixed shuffle. A variant is an option, not a field set later, because the
  zones are built from it in `super`.
- **The one override a game must write is `dealBoard(deal)`.**
- **`applyMoveEffects(move)` is what a move does beyond moving its cards.**
  `src/games/common/move_effects.ts` has the two common shapes,
  `flipOnlyEffects` and `runCollectingEffects`. A game with Klondike's stock
  and scoring extends `KlondikeFamilyGame`
  (`src/games/klondike/klondike_family_game.ts`) and writes only `dealBoard`,
  as Double Klondike does. A pairing game (Nestor, Monte Carlo, Pyramid)
  takes its rule and its effect from `src/games/common/pair_removal.ts`; its
  paired piles must have no `capacity`, which is checked before the accept
  rule.
- **A stock action moves its cards with `drawToWaste()` or
  `recycleWasteToStock()`** (`src/games/common/stock_pile.ts`) and commits
  the transfers they return with `commitAction(kind, transfers, options)`,
  its kind an `ActionKind` (`src/games/common/action_kinds.ts`).
- **A game that limits an action reads `timesApplied(kind)`,** never a count
  of its own: the history keeps it right through undo, restart and restore.
- **Every recorded change of pile goes through `this.tabletop`**
  (`src/engine/tableau/game/tabletop.ts`): `relocate()` for cards leaving one
  pile, `rearrange()` for a redeal. Never build a `CardTransfer` by hand, or
  call a pile's `addCard` or `removeCard`. Undo re-appends a transfer's cards
  in the order they sat in the pile they left, which is easy to get backwards
  when cards land turned over, as a draw's do.
- **Fold a consequence into the action that caused it.** A run collected
  after a move goes in that move's `followUpTransfers` and `flippedCardIds`,
  and a dealt row and the runs it completed go in one `commitAction` call,
  which `dealRowCollectingRuns()` sets up. Recorded as an action of its own,
  it takes undo two presses.
- **A game never writes its metrics.** The score changes only by the
  `scoreDelta` a game reports from `applyMoveEffects` or `commitAction`. A
  deal that starts at a score other than zero overrides `initialScore()`.
- **Override `isWon()` only for a game won by the order of its cards,** as
  Montana is, and leave `winsWhenAllCardsIn` unset there.

## 6. `<game>_layout.ts` — the grid

`boardLayout()` (`src/games/common/board_layout.ts`) reads the slots off the
zones, as `src/games/klondike/klondike_layout.ts` shows.

- **`designHeightPx` is the grid's height plus room for the longest column to
  fan,** or long columns fall off the board: Klondike's 877 on a grid of 746,
  FreeCell's 1047 for columns of thirteen cards 45 apart. A board where
  nothing fans down leaves it out. Add no room for the shell's chrome, which
  the board reads from the canvas's insets at run time.
- **Every rule option of an entry deals onto this one grid,** which
  `test/ui/app/provider/catalog.spec.ts` checks for every game.

### Arranged grids (optional)

Without them a game lies on its one grid everywhere, compacted on a phone.
With them it is laid out for a phone, its columns fanning to fit, and a player
may put its piles at the top or the bottom and its side pile at the left or
the right. Most games have them.

- **Declare the board to `arrangedLayouts()`**
  (`src/games/common/arranged_layouts.ts`), beside the grid. `ArrangedBoard`
  there says what each field is, and `src/games/klondike/klondike_layout.ts`
  is the plainest use. For the rarer fields, see `beside` in
  `src/games/canfield/canfield_layout.ts`, `uprightLines` in
  `src/games/eight_off/eight_off_layout.ts` and `pileLayouts` in
  `src/games/spider/spider_layout.ts`.
- **`side` is the row pile the side setting places:** the stock, or in a game
  without one the pile a player plays from most, such as FreeCell's free
  cells. Leave it out where the row holds only foundations, or where a mirror
  would hurt: Flower Garden's bouquet would show each card's suit edge, not
  its rank. The board is then never mirrored.
- **On `rails`, mark `overlapped` a pile whose top card is all a player
  reads:** a foundation, a cell, a reserve. An overlapped foundation moves
  its ring to the top edge by itself. List a rail's piles in the order their
  zones are declared, since cards stack in that order.
- **Never put a pile that can sit empty under an overlapped pile of another
  kind.** Every pile's outline is drawn beneath all the cards, so the card
  above would hide it. Give it a rail of its own, or show the pile above it
  whole, as Flower Garden's foundations and Nestor's discard are.
- **Set `roomyBottomMaxHeightPx` when the catalog spec's 85% check fails.**
  On a 1920 × 1080 window it holds a game's cards with the piles below to 85%
  of their size with the piles above. The cap is `floor(1007 / (0.85 × s))`,
  where `s` is the grid above's scale there,
  `min(1920 / width, 1007 / height, 1)`.
- **A board with no columns to fan writes its `ArrangedLayouts` out by
  hand,** with `phoneLayout()` for the phone grids, as
  `src/games/poker_squares/poker_squares_layout.ts` and
  `src/games/pyramid/pyramid_layout.ts` do;
  `src/games/aces_up/aces_up_layout.ts` adds `PHONE_GAP` and
  `fannedColumnHeight()` for the columns it has. Its `columns` names the
  piles a mirror keeps in order, and its grid with the piles at the top on a
  larger screen must be the catalog's own.
- **Name the grids on the catalog entry as `arrangement`** (step 8), with
  `pilesName` and, exactly when the grids name a side pile, `sideName`: what
  the drawer calls the row's piles and the side pile, in the rules page's
  words ("stock and foundations", "stock").
- **Add a `test/games/<game>/<game>_layout.spec.ts` that calls
  `itLaysOutArrangedGrids()`** (`test/support/arranged_grids.ts`), with the
  game's own checks beside it, as
  `test/games/klondike/klondike_layout.spec.ts` does.

## 7. `<game>_gestures.ts` — only if a press means something

- **A game with no stock needs no file.** Map it to `stocklessGestures`
  (`src/engine/tableau/gestures/table_gestures.ts`) in step 8.
- **Otherwise call `tableGestures(game, options)`,** as
  `src/games/klondike/klondike_gestures.ts` does. `onCardPress` takes a
  handler from `src/engine/tableau/gestures/press_handlers.ts`:
  `drawOnStockTop()` for a stock whose top card draws, `dealOnStockPress()`
  for one that deals a row wherever it is pressed, and `playOnPress()` where
  one press plays a card, with `autoMoveFrom: []`.
- **`onPilePress` is a press on an empty slot,** such as Klondike's recycle.
  Pair it with `emptyIsActionable` on the zone, which gives the slot its
  pointer cursor and hover border.
- **A slot that can run out of things to do is marked in the game's
  constructor,** with `markPile(pile, marker)` and a marker from
  `recycleMarker()` (`src/games/common/zone_presets.ts`), as
  `KlondikeFamilyGame` and `MontanaGame` do. Don't override
  `pileBackgroundKey` or `isEmptySlotActionable`. Pip artwork exists only for
  the counts in `PIP_COUNTS`.
- **`autoMoveFrom` lists the roles a double press sends a card from.** Leave
  it out where every pile answers one.

## 8. Register it — four provider edits

1. **`src/ui/app/provider/game_catalog.ts`:** declare the entry with
   `satisfies CatalogEntry<MyGame>` and its `id` `as const`, not with a type
   annotation, which would lose the literal id and the game's type that the
   board registry is checked against. Add it to `CATALOG_ENTRIES`. Its
   `create` returns `dealt(new MyGame({ … }))`.
2. **`src/ui/app/provider/board_catalog.ts`:** map the id to its gestures in
   `GESTURES`. There is no board file for a game.
3. **`src/ui/app/provider/game_documentation_data.ts`:** add the rules page.
   Then, with the dev server running, run `yarn capture:screenshots <id>` and
   `yarn build:thumbs`, and point the page's `screenshot.url` at
   `./docs/screenshots/<id>/preview.webp`. Specs fail while one of the
   game's images is missing.
4. **`src/ui/app/provider/game_profile_data.ts`:** add the profile the game
   browser lists it by. `test/ui/app/provider/game_profile.spec.ts` checks
   its `decks` and `allCardsVisible` against a deal.

A game missing from the last three doesn't compile. Two more places follow:

- **`index.html` names the game and its named variants** in its `<noscript>`
  list, in the browser's order, and them and their aliases in its keywords.
  `test/ui/index_html.spec.ts` fails until it does. The routes and the game
  browser need no edit.
- **The site lists the game only once its own catalog does:**
  `frontend/site/src/app/provider/games.ts`. The site's build checks that
  file against the `id` and `name` this build writes to `dist/game.json`, so
  renaming a game or its id fails the site's build until that file follows.

## 9. Test it

`test/games/<game>/<game>_game.spec.ts` covers the deal, each rule that is
this game's own, the win, and undo of anything that moves more than one card
at a time, on a fixed `random` and, where it sharpens the spec, a short
`cardIds` deck. The fixtures are in `test/support/`.

## Where new code is allowed to live

Each tier imports only the tiers below it. `eslint.config.js` holds each
tier's fence and says what it refuses. When unsure where a piece belongs:

- **It names a card, pile, rank, suit or shuffle and nothing else:**
  `src/engine/core`.
- **It is geometry,** where a card sits or what a drag is over:
  `src/engine/render`, which never names Phaser, so its math is specced with
  no mocks.
- **It draws:** `src/engine/render/phaser`, which takes nothing from
  `src/engine/tableau`. The adapter draws what it is handed, and the tableau
  runtime reaches it only as data in `BoardSceneOptions`.
- **It works for any solitaire** (moves, undo, zones, rule combinators):
  `src/engine/tableau`. Every game inherits this tier, so it never names a
  game, and what it depends on they all do.
- **It joins a table game to the Phaser board:** `src/engine/board`.
- **It is one game's rules, deal, layout or gestures:** `src/games/<game>/`.
- **Two or more games need the same helper:** `src/games/common/`, and not
  before the second needs it.
- **It names a game from the shell:** `src/ui/app/provider`, the only folder
  of the shell that may.
- **No tier under the shell imports `rxjs` or Angular.** A game publishes
  through the engine's own `EventEmitter`
  (`src/engine/core/common/event_emitter.ts`), and the shell adapts at its
  own boundary.
