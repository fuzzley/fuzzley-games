# Arranged layouts for the other games: work log

This file tracks the work that gives the rest of the catalog what Klondike and
Spider already have: grids for a phone held upright and on its side, columns
that fan to fit, and the Piles and side settings on every screen. It records
what was decided, what is done and what is next, so the work can stop and
restart at any commit. It builds on the board arrangement work, whose record is
[board-arrangement-log.md](board-arrangement-log.md).

**Branch:** `feature/arranged-layouts-other-games`, cut from `main` at
`3a2bf9f`.

**Status:** in progress; see [Progress](#progress).

## How to pick this up

1. `git checkout feature/arranged-layouts-other-games` and read
   [Progress](#progress).
2. Run `yarn tsc && yarn test` to confirm the tree is green before going on.
3. Take the first unchecked step and add an entry to [Log](#log) saying what
   changed and anything surprising. Commit the step with its log entry.
4. Check a visible change against `yarn start` (port 9000) at 1280 × 800, 390 ×
   844 upright and 844 × 390 on its side. Close every page the DevTools MCP
   opened when done.

## Decisions

Settled with the project owner on 2026-10-09.

1. **One shared side setting, named by each game.** The stored `stockSide`
   stays one value across games, meaning "the pile I play from goes on this
   side". Each game names that pile in the drawer: "Stock Side" in Klondike,
   "Free Cells Side" in FreeCell, "Reserve Side" in Nestor.
2. **Piles only for a game with no side pile.** Where the row holds only
   foundations (Yukon, Simple Simon, Mrs. Mop, Baker's Dozen), the drawer
   offers Piles and hides the side setting, and the grids are never mirrored.
3. **The larger screen's grid with the piles below is capped per game.** It
   grows to keep the longest column clear of the row, as it does today, but no
   taller than a height each game declares. Past the cap a column fans at its
   floor and runs over the row, which only the longest columns reach.
4. **Every phase of the plan.** Games that fit the builder, the games without a
   stock, the builder's extensions, and the hand-built grids.

### Implementation choices

- **The cap's rule.** Each game sets its cap so that, on a 1920 × 1080 window
  (a board of 1920 × 1007 under the 73 px header), the cards with the piles
  below are at least 85% the size of the cards with the piles above. Where the
  longest column fits below that height the cap changes nothing. This applies
  to Klondike too: its grid with the piles below shrinks from 1217 design units
  to the cap, so its cards are bigger, and the very longest columns (six hidden
  under ten or more face up) reach the row. Spider's needed height already
  costs nothing at that size, so it is unchanged.
- **The side pile moves to the catalog's words.** `ArrangedLayouts.stock`
  becomes an optional `side`, the pile the side setting places. The catalog
  entry's `arrangedLayouts` becomes `arrangement`, holding the grids and what
  the drawer calls the piles the settings move (`pilesName`, such as "stock and
  foundations") and the side pile (`sideName`, such as "stock"), since every
  word a player reads lives in `src/ui/app/provider`.
- **The drawer describes Piles without naming the columns.** "The stock and
  foundations along the top, or at the top of a sideways phone's rails." That
  reads the same for a game with a grid of cards instead of columns.
- **The chrome keeps following the player's side.** The plan proposed that a
  game with no side pile set the chrome by Auto instead. Keeping the stored
  side everywhere puts the chrome on the same edge in every game, which matters
  more than which rail it stands beside, so the chrome does not change.
- **Columns where the larger screen has them.** The builder lays each grid's
  columns out in the grid columns the larger screen's grid gives them, rather
  than from column 0, and on a sideways phone side by side from the first rail
  in the same order. This is what Double Klondike, Calculation, Eight Off,
  Penguin and Flower Garden need, and leaves Klondike and Spider unchanged.
- **Piles beside the columns.** A pile in the columns' row that is not a
  column, as Canfield's reserve, is laid out with the columns but mirrored on
  its own, so it follows the stock to the other side.
- **Two lines of piles on an upright phone.** A board whose row is wider than
  its columns (Eight Off, Penguin, Flower Garden) may give an upright phone the
  row in two lines, listed from the columns outward, so the grid is only as
  wide as the columns.
- **Rails on a sideways phone.** Games with seven columns or fewer and a stock
  put everything on one rail, as Spider does, which leaves the board narrower;
  wider games split the piles over two rails, as Klondike does. A pile the
  player picks from, such as a cell or a reserve, may be overlapped down a rail
  as a foundation is, showing its index.
- **Shared spec helpers.** Every game gets a `<game>_layout.spec.ts`. The checks
  every arranged game shares (the longest column fits on six phone sizes under
  Auto and the four choices, the columns keep their order, the side pile lands
  where asked, a larger screen is unchanged under Auto, the cap) live in a
  helper under `test/support`, so each game's spec holds only its own checks.

## The plan

### Phase 0: record the plan

- **0.1** Commit this log.

### Phase 1: the engine, the builder and the shell

- **1.1 Side pile.** `ArrangedLayouts.side?` replaces `stock`; the chooser
  never mirrors a grid without one. `ArrangedBoard.side?` replaces `stock` and
  is checked to be in the row when given.
- **1.2 Catalog and drawer.** `CatalogEntry.arrangement` with `layouts`,
  `pilesName` and `sideName?`; `boardLayoutsOf` reads it. The drawer offers the
  side setting only for a game with a side pile, labels it from `sideName`, and
  describes both settings in the game's words. The catalog spec checks that a
  game names its side pile exactly when its grids have one.
- **1.3 Cap.** `ArrangedBoard.roomyBottomMaxHeightPx`; Klondike takes its cap.
- **1.4 Columns where the larger screen has them,** and piles beside the
  columns.
- **1.5 Two lines on an upright phone.**
- **1.6 Spec helpers** under `test/support`, with Klondike's and Spider's specs
  moved onto them where they repeat.

### Phase 2: games that fit the builder

- **2.1** Spiderette, Easthaven: stock above the foundations on one rail.
- **2.2** Scorpion (Wasp, Scorpion II): the same.
- **2.3** Forty Thieves, Maria, Limited, Lucas: foundations down one rail, stock
  and waste down the other.
- **2.4** Bristol: foundations down one rail, the stock and reserves the other.
- **2.5** Golf: the stock above the foundation on one rail.
- **2.6** Browser check of the phase.

### Phase 3: games without a stock

- **3.1** FreeCell, Baker's Game, Challenge FreeCell: free cells as the side
  pile, cells down one rail and foundations the other.
- **3.2** Seahaven Towers: the same over ten columns.
- **3.3** Nestor: the reserve as the side pile, reserve and discard on one rail.
- **3.4** Yukon (and Russian Solitaire), Simple Simon: Piles only, foundations
  on one rail.
- **3.5** Mrs. Mop, Baker's Dozen: the same.
- **3.6** Browser check of the phase.

### Phase 4: games that need the builder's extensions

- **4.1** Double Klondike: columns from grid column 1.
- **4.2** Calculation: the waste piles under the foundations.
- **4.3** Canfield: the reserve beside the columns.
- **4.4** Eight Off: two lines upright, cells then foundations.
- **4.5** Penguin: the same.
- **4.6** Flower Garden: two lines upright, the bouquet down the rails.
- **4.7** Browser check of the phase.

### Phase 5: hand-built grids

These boards have no columns for the builder to fan; their grids are written
out as `ArrangedLayouts` directly.

- **5.1** Poker Squares: stock and hand in a row above or below the grid
  upright, beside it at the top or the bottom elsewhere.
- **5.2** Monte Carlo: the same with the stock and discard pile.
- **5.3** Aces Up: stock and discard pile above or below the four columns
  upright, at the top or the bottom of the side columns elsewhere.
- **5.4** Pyramid: stock and hand, and waste and discard pile, in the top
  corners or along the bottom upright, on rails elsewhere.
- **5.5** Browser check of the phase.

### Phase 6: finish

- **6.1 Docs.** `.agents/AGENTS.md`, the `add-solitaire-game` skill, and the
  board arrangement log's pointer here.
- **6.2 Verify.** `yarn verify`; raise the coverage floor if the figures rose.

### Not in this work

Montana and Blue Moon (the grid is the game), Black Hole, Beleaguered Castle,
Fortress and Grandfather's Clock (symmetric or fixed boards), TriPeaks (the
stock already sits centred below the peaks), All in a Row and Bisley (a centred
foundation, or foundations at both ends of thirteen columns), La Belle Lucie and
Trefoil (two rows of fans, little gained by moving their few piles).

## Progress

- [x] 0.1 Record the plan
- [x] 1.1 Side pile
- [ ] 1.2 Catalog and drawer
- [ ] 1.3 Cap
- [ ] 1.4 Columns where the larger screen has them
- [ ] 1.5 Two lines on an upright phone
- [ ] 1.6 Spec helpers
- [ ] 2.1 Spiderette, Easthaven
- [ ] 2.2 Scorpion
- [ ] 2.3 Forty Thieves family
- [ ] 2.4 Bristol
- [ ] 2.5 Golf
- [ ] 2.6 Browser check
- [ ] 3.1 FreeCell family
- [ ] 3.2 Seahaven Towers
- [ ] 3.3 Nestor
- [ ] 3.4 Yukon, Simple Simon
- [ ] 3.5 Mrs. Mop, Baker's Dozen
- [ ] 3.6 Browser check
- [ ] 4.1 Double Klondike
- [ ] 4.2 Calculation
- [ ] 4.3 Canfield
- [ ] 4.4 Eight Off
- [ ] 4.5 Penguin
- [ ] 4.6 Flower Garden
- [ ] 4.7 Browser check
- [ ] 5.1 Poker Squares
- [ ] 5.2 Monte Carlo
- [ ] 5.3 Aces Up
- [ ] 5.4 Pyramid
- [ ] 5.5 Browser check
- [ ] 6.1 Docs
- [ ] 6.2 Verify

## Log

### 0.1 Record the plan

This log, from the survey of the catalog and the owner's four decisions.

### 1.1 Side pile

`ArrangedLayouts.stock` is now `side?`, documented as the stock or the pile
that stands in for it, and `chooseTableLayout` leaves a grid alone when there
is none. The builder's `ArrangedBoard.stock` became `side?` too, checked to
be in the row only when given (`checkSide`). Klondike and Spider name their
stock as `side`; the board scene's spec moved with them. New specs: the
chooser never mirrors a board without a side pile, and the builder hands on its
absence.
