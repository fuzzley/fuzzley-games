# Work log: candidate games 10 to 26

This log tracks the build of items 10 to 26 from
[`candidate-games.md`](candidate-games.md), so the work can be picked up again
from here. Update it with every commit.

## Goal

Add every game in Parts B and C of the survey, with the shared extensions they
need:

10. **Bisley**, a new game.
11. **Aces Up**, a new game.
12. **Golf**, a new game, with **Putt Putt** as an option.
13. **Calculation**, a new game, with **Sir Tommy** as an option.
14. **Flower Garden**, a new game, after E3.
15. **Bristol**, a new game, with **Belvedere** as an option.
16. **Nestor**, a new game, with P1.
17. **Monte Carlo**, a new game, with **Thirteens** as an option.
18. **La Belle Lucie**, a new game, with **The Fan** and **Shamrocks** as
    options and **Trefoil** as an entry sharing the class.
19. **Canfield**, a new game, with **Storehouse**, **Superior Canfield** and
    **Rainbow** as options, after E1 and E2.
20. **Penguin**, a new game.
21. **Black Hole**, a new game, and **All in a Row**, an entry sharing it.
22. **Grandfather's Clock**, a new game.
23. **Pyramid**, a new game, after E4.
24. **TriPeaks**, a new game.
25. **Beleaguered Castle**, a new game, with **Streets and Alleys** and
    **Citadel** as options and **Fortress** as an entry sharing the class,
    after E5.
26. **Poker Squares**, a new solitaire-adjacent game.

## Decisions

- **Branch:** `candidate-games-10-26`, off `main` at `0a0c719`. Not pushed: a
  push to `main` deploys.
- One commit per item at least, each passing `yarn lint`, `yarn tsc` and
  `yarn test`, so any commit is a checkpoint to come back to. A new entry
  cannot pass `yarn test` without its screenshot and thumbnails (the game
  browser spec checks they exist), so each entry's commit carries them.
- Screenshots as before: the Chrome DevTools MCP in an isolated browser
  context, so no saved game is restored, at 1440 × 810 at 2×, on the dev
  server on port 9000. Re-encoded losslessly with sharp at compression level
  9, then `yarn build:thumbs`.
- The extensions land with their first user rather than all up front, so
  every commit adds something playable: E1 with Golf, E3 with Flower Garden,
  P1 with Nestor, E2 with Canfield, E4 with Pyramid, E5 with the Castle
  family.

## Plan

- [x] 0. Commit this log.
- [x] 1. Bisley.
- [x] 2. Aces Up.
- [x] 3. E1, then Golf and Putt Putt.
- [x] 4. Calculation and Sir Tommy.
- [x] 5. E3, then Flower Garden.
- [x] 6. Bristol and Belvedere.
- [x] 7. P1, then Nestor.
- [x] 8. Monte Carlo and Thirteens.
- [x] 9. La Belle Lucie, The Fan, Shamrocks and Trefoil.
- [x] 10. E2, then Canfield, Storehouse, Superior Canfield and Rainbow.
- [x] 11. Penguin.
- [x] 12. Black Hole and All in a Row.
- [x] 13. Grandfather's Clock.
- [ ] 14. E4, then Pyramid.
- [ ] 15. TriPeaks.
- [ ] 16. E5, then Beleaguered Castle, Streets and Alleys, Citadel and
      Fortress.
- [ ] 17. Poker Squares.
- [ ] 18. The README, the survey's status, the skill, `yarn verify` and
      coverage.

## Progress

### 2026-10-03

- Step 0 (`06db3ff`): wrote this log.
- Step 1 (`c888bad`): Bisley.
  - `src/games/bisley`: the Ace foundations (`foundation-0` to `-3`) and
    the King foundations (`king-foundation-0` to `-3`) both play the
    `FOUNDATION` role, so `winsWhenAllCardsIn` covers the two kinds. Each
    closes over a suit in `ALL_SUITS` order, which is the order the deal lays
    the Aces in. An emptied Ace foundation takes only its own Ace back, so its
    pairing with the King foundation cannot drift.
  - Columns build up or down in suit (`any(ascendingSameSuit,
descendingSameSuit)`), top-only, and never refill. The deal pulls the
    Aces with `pullCards`, then deals the rest in rows: 3 to each of the
    first four columns, 4 to each of the other nine (Wikipedia's 13
    columns, not PySol's 12).
  - Board: 13 × 2, Aces at columns 0–3 and Kings at 9–12 of the top row,
    `designHeightPx` 1300 as Baker's Dozen.
  - A "Bisley" entry (`bisley`), `stocklessGestures`, a rules page, a
    profile in "More games" (Easy), the README, the screenshot and
    thumbnails.
  - Tests: `test/games/bisley/bisley_game.spec.ts`.
- Step 2 (`55e63c6`): Aces Up.
  - `src/games/aces_up`: stock, four columns and a discard in one row
    (6 × 1, `designHeightPx` 1050 for a thirteen-card column).
    `DISCARD_PILE_ID` joined `src/games/common/pile_ids.ts`, since Nestor,
    Monte Carlo and Pyramid discard too.
  - The discard's rule is the game: a column's top card while another
    column's top card is the same suit and higher, counting the Ace as 14
    (`acesHighValue`). An empty column takes a single card, or under the
    `emptyColumns` option (`AcesUpSpaces`) only an Ace.
  - The stock deals a row with `dealRowFromStock` as one action, pressed
    through `dealOnStockPress`. A double press tries the discard, then a
    space. `isWon` is overridden: the stock is empty and only Aces are left.
  - An "Aces Up" entry (`acesup`), a rules page, a profile in "More games"
    (Hard), the README, the screenshot and thumbnails.
  - Tooling: provider edits are scripted by a registration helper kept in the
    session scratchpad, not the repository; it only inserts text at fixed
    markers, so the diffs read as hand edits.
  - Tests: `test/games/aces_up/aces_up_game.spec.ts`.
- Step 3 (`673ffb1`): E1, then Golf and Putt Putt.
  - E1: `rankAboveWrapping` and `rankBelowWrapping` in
    `src/engine/core/card/playing_card.ts`. In `src/engine/tableau/rules.ts`:
    the wrapping adjacencies `isSameSuitRunWrapping` (Penguin),
    `isOrderedPairWrapping` (Canfield) and `isAnySuitRunWrapping` (Rainbow),
    with their builds `descending…Wrapping`; `isAdjacentRank(wraps)` for the
    Golf family; and the foundations `ascendingSameSuitWrapping` and
    `ascendingAnySuit`. All landed now, with tests, so later steps only use
    them.
  - `src/games/golf`: stock and foundation along the top, seven columns of
    five beneath (7 × 2, `designHeightPx` 1020). The foundation is also the
    waste: the stock turns onto it with `drawToWaste`. Columns have
    `accept: null`; the foundation has `grab: none`.
  - `GolfVariant`: Golf (nothing on a King), Queens on Kings (a house rule
    the survey lists), and Putt Putt (wraps). One "Variant" option rather
    than the survey's two, since Putt Putt makes the Kings rule moot.
  - A single press plays a column card (`autoMoveCard`) or turns the stock,
    as PySol does; `autoMoveFrom: []` so a double press does nothing more.
    Checked in the browser with synthetic mouse events on the canvas (pointer
    events do not reach Phaser; `mousedown` on the canvas and `mouseup` on
    `window` do).
  - Golf scoring (strokes, lower is better) is left out: it needs E6 or a
    header label change, and the game is playable without it.
  - A new "Golf family" in `FAMILIES`. A "Golf" entry (`golf`), a rules
    page, a profile (Hard, Putt Putt Medium) with "Putt Putt" as a named
    variant, the README, the screenshot and thumbnails.
  - Tests: `test/games/golf/golf_game.spec.ts`, and E1 cases in
    `rules.spec.ts` and `playing_card.spec.ts`.
- Step 4 (`aaac4bd`): Calculation and Sir Tommy.
  - `src/games/calculation`: stock, hand and four foundations along the
    top, a waste pile under each foundation (6 × 2, `designHeightPx` 1400
    for a thirteen-card waste pile). `HAND_PILE_ID` joined
    `src/games/common/pile_ids.ts` (Pyramid and Poker Squares use one too).
  - The hand is a one-card pile with `accept: null`; the stock draws into
    it only while it is empty (`canDraw`), which enforces "place each card
    before turning the next". Waste piles take a single card only from the
    hand (`WASTE_RULE`), so a parked card can leave only for a foundation.
  - `calculationFoundationRule(step)`: starts on rank `step`, then each card
    is `step` ranks higher, wrapping, in any suit; `capacity: 13` closes it
    at its King. Foundations have `grab: none`. The deal takes the first
    Ace, Two, Three and Four the deal reaches (`pullCards` with a predicate
    that removes each rank from a set as it is found).
  - `CalculationVariant`: Sir Tommy deals no foundation and builds each
    from an Ace with `ascendingAnySuit`. A "Variant" option, and Sir Tommy
    (alias Old Patience) as a named variant.
  - A "Calculation" entry (`calculation`, alias Broken Intervals), a rules
    page, a profile in "More games" (Medium), the README, the screenshot and
    thumbnails.
  - Screenshot note: a game left in progress in the `shots` browser context
    raises the "switch games?" confirmation on navigation; open each new
    entry in a fresh isolated context instead.
  - Tests: `test/games/calculation/calculation_game.spec.ts`.
- Step 5 (`69e88fe`): E3, then Flower Garden.
  - E3: `skeletonSlots` in the new `src/ui/app/model/skeleton_slots.ts`
    places each skeleton slot as a percentage of the board: left and top from
    its column and row, width and height of one cell. The canvas component
    exposes it as a `computed()`, and the template draws absolutely
    positioned `.skeleton-cell`s inside a `.skeleton-board` that is the grid's
    padding box, half a gap of padding on each side of every cell. The CSS
    grid and `grid-column`/`grid-row` are gone. Checked in the browser by
    forcing the overlay visible: Flower Garden's bouquet overlaps as the board
    does, and Klondike's skeleton still reads as its 7 × 2 grid.
  - `src/games/flower_garden`: the bouquet is sixteen one-card piles
    (`bouquet-0` to `-15`) at columns `i × 4 / 15`, so each card shows about
    67 design units; `accept: null`, top-only, no placeholder, so a played
    card leaves a gap. The foundations sit at columns 5–8 of the top row and
    the six beds are centred beneath at column 1.5 (9 × 2, `designHeightPx`
    1450 for a fifteen-card bed). Beds: `byEmptiness(anyCard,
descendingAnySuit)`, top-only.
  - A "Flower Garden" entry (`flowergarden`, aliases The Garden and
    Bouquet), `stocklessGestures`, a rules page, a profile in "More games"
    (Medium), the README, the screenshot and thumbnails.
  - Tests: `test/ui/app/model/skeleton_slots.spec.ts` (a fractional layout)
    and `test/games/flower_garden/flower_garden_game.spec.ts`.
  - Tooling: the work log is now updated by a second scratchpad helper that
    ticks the plan, stamps the previous step's commit and rewrites "Next".
- Step 6 (`b118615`): Bristol and Belvedere.
  - `sinkKings` moved from `bakers_dozen_deal.ts` to
    `src/games/common/sink_kings.ts`, with a spec of its own.
  - `pullFirstCard` joined `src/games/common/pull_cards.ts`: it takes the
    first matching card the deal would reach. Belvedere uses it for its Ace,
    and Calculation's deal now uses it per rank instead of a stateful
    predicate.
  - `src/games/bristol`: stock, three reserves (`reserve-0` to `-2`,
    stacked, `accept: null`, top-only) and four foundations along the top,
    eight fans beneath (8 × 2, `designHeightPx` 1300). Foundations:
    `byEmptiness(Ace, ascendingAnySuit)`. Fans: `byEmptiness(never,
descendingAnySuit)`, top-only. The stock deals a row onto the reserves
    with `dealRowFromStock`, through `dealOnStockPress`.
  - `BristolVariant`: Belvedere lays the first Ace the deal reaches on the
    first foundation. A "Variant" option and Belvedere as a named variant.
  - A new "Fan family" in `FAMILIES`, which La Belle Lucie joins at step 9.
    A "Bristol" entry (`bristol`), a rules page, a profile (Medium), the
    README, the screenshot and thumbnails.
  - Tests: `test/games/bristol/bristol_game.spec.ts`,
    `test/games/common/sink_kings.spec.ts`, and `pullFirstCard` cases in
    `pull_cards.spec.ts`.
- Step 7 (`ae35067`): P1, then Nestor.
  - P1 in `src/games/common/pair_removal.ts`, written there at once since
    Monte Carlo follows: `pairsWithTop(isPair)` accepts a single card that
    pairs with the pile's top card, `sameRank` is Nestor's pair, and
    `discardPairEffects(move, discard)` sends the top two cards of the
    target pile to the discard as a follow-up transfer, so one undo puts both
    back. A move straight onto the discard is left alone (Pyramid's Kings).
  - `src/games/nestor`: four reserve piles (`reserve-0` to `-3`) at the
    left of the top row and the discard at its right, eight columns beneath
    (8 × 2, `designHeightPx` 1060). Columns and reserves carry no capacity,
    per P1. `winsWhenAllCardsIn: DISCARD`; `autoMoveRoles` are the columns
    and reserves, so a double press pairs a card with the first free partner.
  - The deal passes a card that repeats a rank in its column to the bottom of
    the deck; after a full turn of the deck with nothing usable it gives the
    rule up and takes the next card, so it always ends.
  - A new "Pairing games" family. A "Nestor" entry (`nestor`),
    `stocklessGestures`, a rules page, a profile (Medium), the README, the
    screenshot and thumbnails. Checked in the browser: a double press on a
    column's Nine paired it with the reserve's Nine.
  - Tests: `test/games/nestor/nestor_game.spec.ts`, including the deal's
    give-up case on a hand-built deck.
  - Tooling: the scratchpad gate script now exits non-zero on a failure, so a
    commit chained after it cannot land on a red gate.
- Step 8 (`7e596a0`): Monte Carlo and Thirteens.
  - `src/games/monte_carlo`: the stock at column 0, the 5 × 5 grid at
    columns 1–5 (`cell-<row>-<column>`), the discard at column 6 (7 × 5,
    no `designHeightPx`: nothing fans). Each cell's rule closes over the set
    of its up to eight neighbours' ids and takes a partner only from one of
    them (`monteCarloCellRule`), with no capacity (P1).
  - `consolidate()` takes every card off the grid, lays them back in
    reading order, then deals the stock face up into the cells left at the
    end, committed as one `"consolidate"` action with a one-card transfer per
    card that moved. `canConsolidate` is true when a gap has a card after it
    or the stock can fill one, which also covers "only after a pair has been
    removed": a full grid has no gap.
  - The stock's slot keeps `emptyIsActionable`, so once the stock is out the
    slot still consolidates. `pileBackgroundKey` shows the recycle arrow
    while consolidating would do something, the plain outline otherwise, and
    `isEmptySlotActionable` follows it.
  - `MonteCarloVariant`: Thirteens pairs cards whose values (`pipValue`,
    Ace 1 to King 13) total 13 (`totalsThirteen`), and its discard takes a
    lone King from the grid. Pyramid will want `totalsThirteen` too; it moves
    to `common` then.
  - A "Monte Carlo" entry (`montecarlo`, alias Weddings) in the Pairing
    games, a rules page, a profile (Medium) with Monte Carlo Thirteens as a
    named variant, the README, the screenshot and thumbnails. Checked in the
    browser: a double press paired two touching Kings, and a press of the
    stock closed the gap and dealt two cards.
  - Tests: `test/games/monte_carlo/monte_carlo_game.spec.ts`.
- Step 9 (`70ae357`): La Belle Lucie, The Fan, Shamrocks and Trefoil.
  - `src/games/la_belle_lucie`: one `VARIANT_RULES` table pairs each
    variant's fan count, empty and occupied fan rules, fan capacity, redeal
    count and whether the Aces start on the foundations. La Belle Lucie (18
    fans, down in suit, 2 redeals), The Fan (Kings to empty fans, no redeal),
    Shamrocks (up or down in any suit, `capacity: 3`, no redeal) and Trefoil
    (16 fans, Aces dealt to the foundations, 2 redeals).
  - Board: the redeal marker at the left of the top row, the foundations at
    its right, and the fans in two rows, the second at row 2.4: a fractional
    pitch of 1.4 rows (`FAN_ROW_PITCH`) keeps a four-card fan clear of the row
    beneath, which a whole row could not do even for three cards. 9 × 3.4
    for eighteen fans and 8 × 3.4 for Trefoil, `designHeightPx` 1470.
  - The redeal follows Montana's: gather fan by fan, shuffle with the game's
    `random`, deal in threes from the first fan, one `"redeal"` action,
    `afterUndo` hands the redeal back, `saveExtra`/`restoreExtra` keep the
    count, and the marker shows pips or the plain outline. Fans hold several
    cards, so the redeal records one transfer per card, listing each fan's
    cards top first: undo replays them in reverse, appending each card to its
    old fan bottom first, which rebuilds every fan in order however the new
    deal mixed them. The variants without a redeal keep the marker (every
    option of an entry deals onto one grid) as a plain, inert outline.
  - Entries "La Belle Lucie" (`labellelucie`, with a "Variant" option of La
    Belle Lucie, The Fan and Shamrocks) and "Trefoil" (`trefoil`, its own
    grid), both `laBelleLucieGestures`, in the Fan family. Rules pages,
    profiles (La Belle Lucie and The Fan Hard, Shamrocks and Trefoil
    Medium), named variants The Fan and Shamrocks, the README, screenshots
    and thumbnails. Checked in the browser: a press on the marker redeals,
    and undo restores the board exactly. The merci is left out, as the survey
    advised.
  - Tests: `test/games/la_belle_lucie/la_belle_lucie_game.spec.ts`.
- Step 10 (`02f6bad`): E2, then Canfield, Storehouse, Superior Canfield and Rainbow.
  - E2 in `src/engine/tableau/rules.ts`: `baseRankOf(board, role)` reads the
    bottom card of the first occupied foundation, and
    `baseRankFoundation(role)` starts an empty foundation on that rank (any
    card while all are empty) and builds up in suit with wrap. Read from the
    board, so nothing extra is saved and restarts and restores just work.
  - `src/games/canfield`: a `VARIANT_RULES` table pairs each variant's
    column adjacency (build and run grab both derive from it), draw count,
    recycle limit, whether Twos start the foundations, whether the reserve is
    face up, and whether the reserve fills spaces. Canfield (alternating
    colours, draw 3, unlimited), Storehouse (in suit, Twos, draw 1, two
    recycles in pips, as PySol plays it rather than Wikipedia's single pass),
    Superior Canfield (reserve face up and fanned, spaces take any card or
    run), Rainbow (any suit, draw 1, no recycle).
  - Board: stock, waste and foundations as Klondike's top row (7 wide), the
    reserve under the stock, the four columns under the foundations
    (`designHeightPx` 1420 for a fourteen-card column or the fanned reserve).
  - `applyMoveEffects` turns up the reserve's new top card when the move took
    one, and when a move empties a column (and the variant fills spaces) moves
    the reserve's top card in as a follow-up transfer and turns up the next,
    so one undo takes it all back. An empty column takes the reserve's card,
    or a waste card once the reserve is empty.
  - The stock follows `KlondikeFamilyGame` without its scoring: `drawToWaste`,
    `recycleWasteToStock`, a recycle count with `afterUndo` and
    `saveExtra`/`restoreExtra`, pips for a counted limit and the plain
    outline once spent.
  - A new "Canfield family". A "Canfield" entry (`canfield`, aliases Demon
    and Fascination) with a "Variant" option, a rules page, a profile
    (Canfield and Rainbow Hard, Storehouse and Superior Medium) with the three
    named variants, the README, the screenshot (one draw in, to show the
    waste) and thumbnails. Canfield's traditional scoring is left out.
  - Tests: `test/games/canfield/canfield_game.spec.ts` and E2 cases in
    `rules.spec.ts`.
- Step 11 (`39caa39`): Penguin.
  - `src/games/penguin`: seven cells (`cellRow`) and four foundations make
    an eleven-slot top row over seven columns centred at column 2 (11 × 2,
    `designHeightPx` 1400 for a thirteen-card column).
  - Foundations use E2's `baseRankFoundation`. Columns build down in suit
    round the corner (`descendingSameSuitWrapping`) and lift
    `isSameSuitRunWrapping` runs with no stack limit. An empty column takes
    only the rank below the beak, read with `baseRankOf` and
    `rankBelowWrapping`, or a run headed by one.
  - The deal: the first card is the beak, at the top of the first column;
    each other card of its rank goes to the next foundation as it turns up,
    and the card after it is dealt in its place.
  - A "Penguin" entry (`penguin`) in the FreeCell family, `stocklessGestures`,
    a rules page, a profile (Medium), the README, the screenshot and
    thumbnails.
  - Tests: `test/games/penguin/penguin_game.spec.ts`.
- Step 12 (`ea69728`): Black Hole and All in a Row.
  - `src/games/black_hole`: one class for both, a `BlackHoleVariant` picking
    the board. The foundation rule is the same for both:
    `byEmptiness(anyCard, buildsOn(isAdjacentRank(true)))`, one card at a
    time. Black Hole's deal drops the Ace of Spades into the hole with
    `pullFirstCard`, so its foundation is never empty; All in a Row's starts
    empty.
  - Boards, kept in a per-variant table beside the zones: Black Hole is two
    rows of nine at a 1.3-row pitch (a fan of three never grows), the hole in
    the middle of the top row and the seventeen fans around it (9 × 2.3,
    `designHeightPx` 1030). All in a Row puts the foundation in the middle of
    the top row over thirteen columns of four (13 × 2, `designHeightPx` 970).
  - `playOnPress(game, roles)` joined `src/games/common/table_gestures.ts`:
    a single press plays a card from those roles to its best destination.
    Golf's gestures now use it too, and TriPeaks will.
  - Entries "Black Hole" (`blackhole`) and "All in a Row" (`allinarow`, no
    Wikipedia article), both `blackHoleGestures`, in the Golf family; rules
    pages, profiles (Medium), the README, screenshots and thumbnails.
  - Tests: `test/games/black_hole/black_hole_game.spec.ts` and `playOnPress`
    cases in `table_gestures.spec.ts`.
- Step 13: Grandfather's Clock.
  - `src/games/grandfathers_clock`: `DIAL` lists the twelve foundations in
    deal order, PySol's: the Two of Spades at five o'clock, each hour
    clockwise one rank higher with the suits taken in turn, to the King of
    Diamonds at four. Each foundation's `capacity` (4 from five to twelve
    o'clock, 5 from one to four) is computed from its start and its hour and
    closes it there; the rule is `ascendingSameSuitWrapping`, grab none. A
    spec checks the capacities sum to 52.
  - The dial is a true circle: `dialSlot(hour)` places each card on a radius
    of 500 design units and converts to fractional grid columns and rows by
    the column pitch (251) and row pitch (353), so the nine o'clock card
    sits at column 0 and the twelve o'clock card at row 0. The foundations
    are declared top-down, so where neighbours overlap the lower card draws
    over the higher one's bottom and every index stays in view. Eight columns
    of five sit to the right from column 5 (13 × 3.72, `designHeightPx`
    1470, set by the dial). Columns: `byEmptiness(anyCard,
descendingAnySuit)`, top-only.
  - A "Grandfather's Clock" entry (`grandfathersclock`, alias Clock; no
    Wikipedia article), `stocklessGestures`, a rules page, a profile in
    "More games" (Easy), the README, the screenshot and thumbnails.
  - Tests: `test/games/grandfathers_clock/grandfathers_clock_game.spec.ts`.

## Next

Step 14: E4, then Pyramid. E4 adds a grab kind
`{ kind: "uncovered"; coveredBy: readonly string[] }` (top card, and only
while every pile in `coveredBy` is empty); `canGrab` then needs the board,
which touches `zone.ts`, `TableGame.resolveMove`, the
`isCardInteractable…`/`isCardDraggable…` methods, and `stackFromCard` in
`grabbable_stack.ts` (the `TableView` gains `board`). Consider the
drop-target refinement in `resolveDragTarget` (prefer piles that accept the
stack). Pyramid then pairs uncovered cards totalling 13 (move
`totalsThirteen` from Monte Carlo into `pair_removal.ts`), Kings go alone,
a hand pile holds the drawn card, and rows sit at half-row offsets.

Screenshots: open each new entry in a fresh isolated browser context (a game
left in progress raises the "switch games?" confirmation). In a development
build the running game is on `window.fsolitaire`, and synthetic `mousedown`
on the canvas plus `mouseup` on `window` drive presses.

## Picking it back up

```sh
git switch candidate-games-10-26
git log --oneline main..
yarn verify
```

Then carry on from the first unchecked step in the plan.
