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
  at a pixel ratio of 1 (a board of 1920 × 1007 under the 73 px header), the
  cards with the piles below are at least 85% the size of the cards with the
  piles above: the cap is 1007 / (0.85 × the grid above's scale there), and the
  board never draws above a scale of 1. Where the longest column fits below that
  height the cap changes nothing. This applies to Klondike too: its grid with
  the piles below drops from 1217 design units to 1184, and only six hidden
  cards under twelve face up reach the row. Spider's needed height already
  costs under 15%, so it takes no cap.
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
- **No empty pile under a card on a rail.** Every pile's outline is drawn on one
  layer beneath all the cards (`RenderLayer.PILE_BACKGROUND`), and cards stack
  in the order the zones are declared. So a pile that can sit empty, such as a
  foundation or a discard, may only follow an overlapped pile on a rail when
  that pile is empty too or of its own kind; otherwise the card above hides it.
  Found in 4.7.
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
- [x] 1.2 Catalog and drawer
- [x] 1.3 Cap
- [x] 1.4 Columns where the larger screen has them
- [x] 1.5 Two lines on an upright phone
- [x] 1.6 Spec helpers
- [x] 2.1 Spiderette, Easthaven
- [x] 2.2 Scorpion
- [x] 2.3 Forty Thieves family
- [x] 2.4 Bristol
- [x] 2.5 Golf
- [x] 2.6 Browser check
- [x] 3.1 FreeCell family
- [x] 3.2 Seahaven Towers
- [x] 3.3 Nestor
- [x] 3.4 Yukon, Simple Simon
- [x] 3.5 Mrs. Mop, Baker's Dozen
- [x] 3.6 Browser check
- [x] 4.1 Double Klondike
- [x] 4.2 Calculation
- [x] 4.3 Canfield
- [x] 4.4 Eight Off
- [x] 4.5 Penguin
- [x] 4.6 Flower Garden
- [x] 4.7 Browser check
- [x] 5.1 Poker Squares
- [x] 5.2 Monte Carlo
- [x] 5.3 Aces Up
- [x] 5.4 Pyramid
- [x] 5.5 Browser check
- [x] 6.1 Docs
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

### 1.2 Catalog and drawer

- **Catalog.** `CatalogEntry.arrangedLayouts` became `arrangement`, a
  `CatalogArrangement` holding `layouts`, `pilesName` and `sideName?`.
  Klondike and Spider call theirs "stock and foundations" and "stock".
  `boardLayoutsOf` reads `arrangement?.layouts`. The catalog spec checks
  that every game gives `sideName` exactly when its grids name a side pile.
- **Drawer.** Top, Bottom, Left and Right lost their fixed descriptions;
  `pilesDescription` and `describeSide` build them from the game's names
  ("The stock and foundations along the top, or at the top of a sideways
  phone's rails."; "The stock at the left of the table."). The side group's
  label is the side name in title case plus "Side", and the group shows only
  for a game whose arrangement names a side pile. The Piles description no
  longer says "above the columns", so it reads right for a board with a grid
  of cards instead.
- **Mock.** The catalog mock gained Yukon, arranged without a side pile on
  Klondike's grids as a stand-in until Yukon has its own (step 3.4). The
  drawer spec covers the label, both descriptions in the game's words, and
  Piles alone for Yukon.
- **Docs.** The skill and `.agents/AGENTS.md` name the new field; the skill's
  full rewrite waits for 6.1.
- **Lesson.** A regular expression written through a Node heredoc inside a
  template literal lost its backslashes (`` became a backspace). Edit such
  lines with the Edit tool.

### 1.3 Cap

`ArrangedBoard.roomyBottomMaxHeightPx` bounds the height `roomyPilesBelow`
grows to; it never goes below the larger screen's own height, and a cap above
what the column needs changes nothing. Three builder specs cover those cases.
Klondike's cap is 1184, so its cards with the piles below come out at 85.05% of
the grid above's at 1920 × 1080 rather than 82.7%; its spec now promises six
hidden cards under eleven face up clear of the row instead of twelve. A new
catalog spec checks the 85% rule for every arranged game, so a game added later
cannot forget its cap. Measured on other screens, Klondike's uncapped grid cost
about 15% at 1280 × 800 and 1440 × 900 at a pixel ratio of 2 as well, so the
reference screen does not flatter the rule.

### 1.4 Columns where the larger screen has them

The builder used to lay the columns out from grid column 0 on every grid, which
only suits a board whose columns start at the left edge. Now the grids with a
row above or below (the larger screen's with the piles below, and both upright)
put each column in the grid column `roomy` gives it, read by
`roomyColumnOf`, and are as wide as `roomy`. A sideways phone still puts them
side by side from the first rail, in the larger screen's order. Klondike's and
Spider's grids come out exactly as before.

`ArrangedBoard.beside` names piles in the columns' row that are not columns,
for Canfield's reserve. They are laid out with the columns (`columnRow` sorts
both by their larger-screen column), but `ArrangedLayouts.columns` leaves them
out, so a mirror moves them on their own and they follow the stock across.
Specs cover a board whose columns start at grid column 1, a reserve beside the
columns upright, on its side and in a mirror, and a column `roomy` does not
place, which now throws.

### 1.5 Two lines on an upright phone

`ArrangedBoard.uprightLines` gives an upright phone the row in lines, listed
from the columns outward, each pile in the grid column it takes there.
`pilesAbove` and `pilesBelow` became one `upright(board, columnHeight,
position)`: line k sits k lines out from the columns, counted from the edge
it is anchored to, so the outermost line is on the edge either way, and the
grid is as tall as its lines plus the longest column. With lines, the columns
sit side by side from the left edge and the grid is only as wide as the columns
or the widest line (fractional columns round up); without them nothing
changes, which Klondike's and Spider's specs confirm. `checkLines` throws
unless every row pile is in exactly one line. The larger screen's grids keep
the row in one line. Specs cover a made-up board of four cells and three
foundations over five columns: its width, where each line and the columns go
above and below, its height, and both refusals.

### 1.6 Spec helpers

`test/support/arranged_grids.ts` holds the screens (`SCREENS`, `UPRIGHT`,
`SIDEWAYS`, `DESKTOP`), the arrangements and their `CASES`, `gridChooser`,
`slotOf`, `sideOf`, `leastRoom` and `columnHeightAtFloors`, and
`itLaysOutArrangedGrids`, which declares what every arranged game shares: on
six phone sizes under Auto and the four choices, every column has room for the
longest column at the floors and the columns keep their order; a larger screen
keeps the catalog's grid under Auto; and the side pile lands on the side asked
for on every screen, or, for a game without one, no grid is ever mirrored.
Klondike's and Spider's specs now call it and keep only their own checks (257
lines fewer). Checking every column's room rather than the last one's is a
little stronger than before; both games pass.

Every later step runs `check.sh` from the session scratchpad before
committing: Prettier on the changed files, ESLint on them, and `yarn tsc`,
stopping at the first failure. (Step 1.5's first commit went in unformatted
because a `| tail` hid Prettier's exit status; it was amended.)

### 2.1 Spiderette, Easthaven

Both take Spider's arrangement: the stock with the four foundations above or
below the seven columns, and on a sideways phone the stock and then the
foundations down one rail at the right (grid column 7 of 8), the stock showing
one sliver per deal. Spider's sliver stock moved to `games/common/pile_layouts.ts`
as `sliverStockLayout(deals, columns)` and `sliverStockReach(deals)`, which
Spider now uses too; `STOCK_SLIVER_GAP` went with them.

| Game       | Stock deals                 | Longest column (phone) | Bottom grid needs | Cap  | Bottom cards at 1920 × 1080 |
| ---------- | --------------------------- | ---------------------- | ----------------- | ---- | --------------------------- |
| Spiderette | 4, or 5 in Will o' the Wisp | 6 hidden, 13 up        | 1253              | none | 86%                         |
| Easthaven  | 5                           | 2 hidden, 14 up        | 1249              | 1208 | 85% (82% uncapped)          |

Under Easthaven's cap two hidden cards under twelve face up clear the row on a
larger screen. Both games name their piles "stock and foundations" and their
side pile "stock". The spec helper gained `layoutOn`, a pile's arrangement on
a grid with the mirror applied, for the sliver checks. To work a cap out by hand: the grid above is `w = 251c + 50` wide for `c` grid
columns; its scale on the reference window is `s = min(1920 / w, 1007 / h, 1)`
for its height `h`; the cap is `floor(1007 / (0.85 s))`; and the grid with the
piles below needs `433 + 313 + 10d + 36(u - 1) + 15` for a longest column of
`d` hidden and `u` face-up cards. This reproduces Klondike's 1217 and 1184.

### 2.2 Scorpion

The same arrangement as Spiderette's, for all three variants (the variant
changes only what a column accepts), except that the stock stays stacked on
every grid: it holds three cards and deals once. The phone grids keep three
hidden cards under fifteen face up on screen, a king-to-ace run with what a
move carried onto it. The grid with the piles below would need 1295 (cards 83%
the size); its cap is 1267 (85%), under which three hidden cards under fourteen
face up clear the row.

### 2.3 Forty Thieves family

`fortyThievesArrangedLayouts(roomy, variant)` builds the four boards' grids:
Forty Thieves (shared by Josephine, Rank and File, Indian and Number Ten),
Maria, Limited and Lucas. On a sideways phone the eight foundations stack down
the left rail, overlapped, and the stock stands above the waste on the right,
as in Klondike; one rail of ten piles would have been taller than the columns
(1309 against 848), costing more than the second rail's width. The phone grids
keep fourteen face-up cards on screen, which also covers Rank and File's three
hidden cards under a full run. At ten columns or wider the grid with the piles
below needs only 1229 of the 1327 the grid above already has, so no board
grows or takes a cap. The drawer calls the row "stock, waste and foundations".
Lucas and Limited stay narrow upright (thirteen and twelve columns); their gain
is the bottom row and the rails.

### 2.4 Bristol

Bristol and Belvedere share one board: the stock, three reserves and four
foundations above eight fans. Upright, the row keeps the larger screen's order,
so with the stock at the right the reserves stand between it and the
foundations. On a sideways phone the foundations stack down the left rail and
the stock and then the reserves down the right, the reserves overlapped to
their index strip as foundations are, which is all a player needs to see of a
pile only its top card leaves. The phone grids keep a fan of thirteen on screen;
the grid with the piles below needs 1193 of the grid above's 1227, so it does
not grow and takes no cap. The drawer calls the row "stock, reserves and
foundations".

### 2.5 Golf

Golf and its variants take the stock and the foundation above or below the
seven columns; upright with the stock at the right, the foundation sits beside
it towards the columns. Columns only shrink from their five dealt cards, so the
phone grids need room for five, and their fans open towards the cap. On a
sideways phone both piles share the right rail with the stock marked
`overlapped`: the foundation, whose card a player must read whole, sits
uncovered below, and the stock tucks under it as far as it must, so the rail is
no taller than a column of five and the cards are as big as the columns allow.
The grid with the piles below needs 905 of the grid above's 947. The drawer
calls the row "stock and foundation".

### 2.6 Browser check

Checked against `yarn start` in an isolated context, emulating each screen.

- **Spiderette, 390 × 844 upright.** The columns along the top in the mobile
  deck, the foundations along the bottom left and the stock at the bottom
  right showing four slivers, one per deal left.
- **Spiderette, 844 × 390 on its side.** The chrome rail at the left; the stock
  tops the right rail with its slivers running down and the foundations
  overlapped below it, the rail filling the height as Spider's does.
- **Golf, 844 × 390 on its side.** Big cards, the columns fanned open; the stock
  tucked behind the foundation at the foot of the right rail, the
  foundation's card whole.
- **Forty Thieves, 390 × 844 upright.** Ten columns along the top; the eight
  foundations and the stock along the bottom, the stock at the right.
- **Easthaven, 1280 × 800, Piles set to Bottom.** The columns along the top,
  the stock at the bottom left and the foundations at the bottom right,
  desktop cards.
- **The drawer** for Golf reads "The stock and foundation along the bottom,
  under your thumb, or at the foot of a sideways phone's rails." and "Stock
  Side".

The page was closed afterwards. Setting a presentation choice through
`localStorage` (`fsolitaire-presentation`) needs a reload, not a hash change,
since the service reads it once at start.

### 3.1 FreeCell family

FreeCell, Baker's Game and Challenge FreeCell share `FREECELL_LAYOUT`, so one
`FREECELL_ARRANGED_LAYOUTS` and one `FREECELL_ARRANGEMENT` in the catalog
serve all three. The side pile is the first free cell, so Auto puts the cells at
the bottom right of a phone, under the thumb, and the foundations at the bottom
left; on a larger screen it keeps the cells at the left, as they always were.
The drawer calls the row "free cells and foundations" and the side setting
"Free Cells Side". On a sideways phone the cells stack down the left rail and
the foundations the right, both overlapped; the rail has the columns' height
to share, so each cell shows 165 of its 313 units. The phone grids keep a
column of thirteen on screen; the grid with the piles below needs 1193 (cards
90% the size), so it takes no cap. `RailPile.overlapped`'s doc now names
cells and reserves beside foundations. The catalog mock's FreeCell stays
unarranged, now described as standing in for a game that is not.

### 3.2 Seahaven Towers

FreeCell's arrangement over ten columns: the cells as the side pile, the cells
down the left rail and the foundations down the right on a sideways phone (grid
columns 0 and 11 of 12). Its rules page says "cells", so the drawer does too:
"cells and foundations" and "Cells Side". The phone grids keep fourteen cards
on screen; the grid with the piles below needs 1229 of the grid above's 1327,
so it neither grows nor takes a cap.

### 3.3 Nestor

The reserve is the side pile, so Auto puts its four cards at the bottom right
of a phone and the discard at the bottom left. The drawer says "reserve and
discard" and "Reserve Side", as the rules page does. Columns only shrink from
six, so the grids need room for six. On a sideways phone everything shares one
rail at the right, which leaves the width-bound board a grid column narrower
than two rails would: the reserve cards, then the discard. (This commit
overlapped all four reserve cards to keep the rail beside a column of six; 4.7
found the empty discard hidden under the last one and shows that one whole.)
The grid with the piles below needs 941 of the grid above's 987.

### 3.4 Yukon, Simple Simon

The first boards without a side pile: their rows hold only foundations, so the
drawer offers Piles alone ("The foundations along the top, ..."), and no grid
is ever mirrored, which the shared spec checks under every arrangement. The
foundations keep the right of the row on every grid, upright at the bottom
right by default, and stack down a rail at the right on a sideways phone, where
the chrome stands opposite under Auto. Yukon (and Russian Solitaire) keeps six
hidden cards under thirteen face up on a phone; its grid with the piles below
needs 1253 (cards 86% the size) and takes no cap. Simple Simon keeps fifteen
face up; at ten columns the grid with the piles below needs 1265 of the 1427 it
has. The catalog mock's Yukon now uses Yukon's own grids instead of
Klondike's.

### 3.5 Mrs. Mop, Baker's Dozen

Both take Simple Simon's foundations-only arrangement: Piles alone, never
mirrored, the foundations at the right and down the right rail on a sideways
phone (grid column 13 of 14). At thirteen columns every phone grid is held to
the screen's width on all six phone sizes, so the phone grids keep the same
longest column the larger screen's grid makes room for at no cost in card
size: twenty-three cards in Mrs. Mop, twelve in Baker's Dozen. Neither grid with
the piles below grows (1553 of 1727, and 1157 of 1227). Upright, the cards are
small, as thirteen columns make them; the gain is the bottom row and the rail.
Mrs. Mop's spec sits beside Simple Simon's in `test/games/simple_simon`.

### 3.6 Browser check

Checked against `yarn start` in an isolated context.

- **FreeCell, 390 × 844 upright.** The columns along the top; the foundations
  at the bottom left and the free cells at the bottom right. The cells' outline
  is open at the bottom, as `card-placeholder` always draws a pile that is not
  a foundation; that is not new.
- **FreeCell, 844 × 390 on its side.** The chrome rail at the left; the
  foundations down the rail beside it and the cells down the right rail, each
  showing about half its height.
- **Yukon, 844 × 390 on its side.** The seven columns from the top, the
  foundations overlapped down the right rail.
- **Drawers.** Yukon offers "Piles" alone; FreeCell offers "Piles" and "Free
  Cells Side", each describing Auto by what it picks.

**Seen in passing, not from this work:** while a board loads, the skeleton draws
its slots in a box 92% wide and 82% tall of the canvas, each slot at most 84 px
wide, so on an upright phone a row anchored to the bottom shows partway down the
screen until the board replaces it. The skeleton is the same code for every
game, so Klondike and Spider do this on `main` too; it lasts a moment and is
left for the owner to judge.

### 4.1 Double Klondike

The first board to need 1.4: its nine columns sit from grid column 1 under an
eleven-wide row (stock, waste, a clear column for the waste's fan, eight
foundations), and every grid with a row above or below keeps them there, in
grid columns 1 to 9 whichever side the stock is on. A sideways phone puts them
side by side between the rails, the eight foundations overlapped down the left
and the stock above the waste, spreading down, on the right, as in Klondike.
The phone grids keep eight hidden cards under a run from king to two on the
deepest column. The grid with the piles below grows from 1177 to 1237, which at
eleven columns costs no card size on the reference window, so it takes no cap.
The drawer says "stock, waste and foundations".

### 4.2 Calculation

Calculation and Sir Tommy share a six-wide board: stock, hand and four
foundations along the top, and a waste pile under each foundation, in grid
columns 2 to 5. The waste piles are the board's columns, so with 1.4 they stay
under the foundations upright and on a larger screen; with the stock at the
right, the mirror moves the foundations to columns 0 to 3 and the waste piles
with them as one block, in their own order, so each still sits under a
foundation though no longer the same one (as Klondike's foundations reverse in
a mirror). A sideways phone puts the foundations down the left rail, overlapped
to their index, which is the part that says what each needs next, and the
stock above the hand on the right. The phone grids keep a thirteen-card waste
pile on screen; the grid with the piles below needs 1193 of the 1327 it has.
The drawer says "stock, hand and foundations", as the rules page calls them.

### 4.3 Canfield

The first board to use `beside`: the reserve shares the columns' row (grid
column 0, under the stock) but is not one of the four columns (grid columns 3
to 6, under the foundations). Upright and on a larger screen the reserve stays
under the stock on either side, and the columns under the foundations. On a
sideways phone the reserve stands between the stock's rail and the columns;
that needed the stock and waste declared on the left rail and the foundations
on the right, the reverse of Klondike, since the builder lays the reserve out
first, where the larger screen has it. With the stock at the right the mirror
gives: foundations rail, columns, reserve, stock rail. The reserve gets the
columns' room, which Superior Canfield's fanned reserve needs. The phone grids
keep fourteen cards on screen; the grid with the piles below needs 1229 of the
1347 it has. The drawer says "stock, waste and foundations".

### 4.4 Eight Off

The first board to use `uprightLines`. A larger screen keeps its one row of
eight cells and four foundations over the eight columns centred beneath (twelve
grid columns). An upright phone is only as wide as the columns: the columns
from its left edge, the four foundations centred in the line next to them
(grid columns 2 to 5), and the eight cells on the edge beyond, under the thumb
with the piles at the bottom. The cells are the side pile; upright they fill
the width, so the side setting there only turns their order around, while on a
larger screen it swaps the cells and the foundations. A sideways phone stacks
the eight cells down the left rail and the foundations down the right. The
phone grids keep fourteen cards on screen; upright the grid is held to the
phone's width, so the two lines cost no card size. The grid with the piles
below grows to 1229, which costs nothing at twelve columns. The drawer says
"cells and foundations" and "Cells Side".

### 4.5 Penguin

Eight Off's arrangement with seven cells (the flipper) and seven columns: a
larger screen keeps its eleven-wide row; an upright phone is seven wide, with
the four foundations centred at half-columns (1.5 to 4.5) next to the columns
and the seven cells on the edge; a sideways phone stacks the cells down the
left rail and the foundations down the right. The rules page calls the cells
the flipper, so the drawer says "flipper and foundations" and "Flipper Side".
The phone grids keep a whole suit of thirteen on screen; the grid with the
piles below needs 1193 of the 1327 it has.

### 4.6 Flower Garden

**A change from the plan:** Flower Garden has no side pile, so the drawer
offers Piles alone. The bouquet is sixteen piles of one card at fractional
columns, each drawn over the one before it, so each card shows its left edge,
where its rank is printed. A mirror moves the piles but not the order they are
drawn in, which would leave each card's right edge showing, where the cards
print only the suit. With nothing else in the row worth a side, it is never
mirrored.

A larger screen keeps its row (the bouquet across grid columns 0 to 4, the
foundations at 5 to 8) over six beds at half-columns 1.5 to 6.5; the beds stay
there with the piles below. An upright phone is six wide: the beds from its
left edge, the foundations centred next to them (columns 1 to 4), and the
bouquet fanned across the whole width on the edge, a third of a column apart,
which shows more of each card than a larger screen does. On a sideways phone
the foundations stack down the left rail and all sixteen bouquet cards down the
right, each overlapped to its index. (This commit first split the bouquet over
both rails with the foundations under its second half, to keep the rails under
the beds' 888; 4.7 found the empty foundations hidden that way and changed it.
The single bouquet rail needs 1063, so the cards on a sideways phone are about
a sixth smaller.) The phone grids keep a fifteen-card bed on screen; the grid
with the piles below needs 1265 of the 1377 it has. The drawer says "bouquet
and foundations".

### 4.7 Browser check, and two rails fixed

Checked against `yarn start` in an isolated context.

- **Eight Off, 390 × 844 upright.** Eight columns across the full width; the
  four foundations centred in the line above the cells, the eight cells along
  the bottom edge, the four dealt to cells at the right with the side on Auto.
- **Flower Garden, 390 × 844 upright.** Six beds; the foundations centred
  above the bouquet, which fans across the whole bottom edge with every rank
  readable.
- **Flower Garden, 844 × 390 on its side: broken, then fixed.** With the
  bouquet split over both rails, the four empty foundations under the second
  half were hidden behind the last bouquet card; only the bottom of one
  outline showed. Every pile's outline is drawn on one layer beneath all cards
  (`depthFor(RenderLayer.PILE_BACKGROUND)` in
  `src/engine/tableau/view/table_view_builder.ts`), so an empty pile cannot
  tuck under a card. The foundations now have the left rail to themselves and
  the bouquet the right; the cards are about a sixth smaller there, and every
  rank and every foundation shows.
- **Nestor, 844 × 390 on its side: the same, then fixed.** The empty discard
  showed as a sliver under the fourth reserve card. That card now shows whole,
  with the discard below it; the rail grows to 786, which costs no card size
  because the board is held to a sideways phone's width (a new spec checks the
  scale at three sideways sizes).
- **Canfield, 844 × 390 on its side.** With the side on Auto: the foundations
  down the left rail, the four columns, the reserve, and the stock on the right
  rail, the reserve beside the stock as intended.

The other rails were checked against the same rule by reading them: the
foundations-only rails (as Klondike's), the cell rails, Golf's stock over a
foundation that always holds a card, and Bristol's reserves, which only the
stock fills, are all fine. A filled foundation still hides the ring of an empty
one below it down a foundation rail, as in Klondike on `main`; the outline below
the card still marks it. The page was closed afterwards.

### 5.1 Poker Squares

**Builder and helpers.** A board laid out by hand still wants the phone grids'
gaps, padding and fans, so `arranged_layouts.ts` now exports `phoneLayout` (a
`HandLaidPhoneGrid` of columns, rows and slots, as tall as its rows unless an
`innerHeight` is given) and `fannedColumnHeight(column, fit)`, which the
builder's own `longestColumnHeight` now calls. The shared spec's column check
became "keeps the columns in the larger screen's order": for every pair of the
named piles it compares which is further left with the larger screen's grid,
so a grid of squares or a pyramid is held to its order as a row of columns is.
Its room check allows a rounding error of a millionth of a unit, since a grid
of single cards has exactly a card's room.

**Poker Squares.** `POKER_SQUARES_ARRANGED_LAYOUTS` is written out: on a larger
screen and a sideways phone the stock above the card to place stands beside
the grid, in its first two rows (Top) or its last two (Bottom); upright they
sit side by side in a row above the grid or along the bottom edge, so the grid
is five cards wide instead of six and the cards are bigger. The stock is the
side pile; the mirror keeps the twenty-five squares in their order. The drawer
says "stock and the card to place", the rules page's words.

### 5.2 Monte Carlo

Written out as Poker Squares is, for Monte Carlo and Thirteens: on a larger
screen and a sideways phone the stock and the discard stand at either side of
the five-by-five grid, beside its first row (Top) or its last (Bottom); upright
they sit at either end of a row above the grid or along the bottom edge, so the
grid is five cards wide rather than seven and its cards about two-fifths
bigger. The stock is the side pile, so Auto puts it at the bottom right of a
phone and the discard at the bottom left; the grid keeps its order in a mirror,
which matters here since pairs are found by neighbouring cards. The drawer says
"stock and discard".

### 5.3 Aces Up

Written out by hand, since its stock and discard share one row with the
columns. On a larger screen and a sideways phone they stand at either side of
the four columns, at the top or on the bottom edge; a pile on the bottom edge in
the columns' own row blocks only its own grid column, so the columns keep their
full height either way. Upright they move to either end of a row above the
columns or along the bottom edge, so the columns take the whole width, four
cards across instead of six. The phone grids fan the columns to fit, keeping
all thirteen cards a column can be dealt on screen; the builder's `PHONE_GAP`
is now exported for the upright grids' height. The drawer says "stock and
discard".

### 5.4 Pyramid

With the piles at the top, every screen keeps the board as it has always been:
the stock and hand in the corner beside the pyramid's peak, the waste and
discard in the other. With the piles at the bottom there is no room in the
corners beside the pyramid's base, which spans the board, so:

- a larger screen and a sideways phone stand the piles in pairs beside the
  base, the stock above the hand at one side and the waste above the discard
  at the other, in a grid a column wider at each side. Those screens are held
  by the board's height, so the cards come out the same size (a spec checks
  1280 × 800 and 780 × 340);
- an upright phone puts them in a row of their own along the bottom edge, in
  the columns they have at the top, using the phone's spare height.

The stock is the side pile, so Auto puts the stock and hand at the right of a
phone and the waste and discard at the left; the pyramid keeps its order in a
mirror, and since its cards overlap only the row below, nothing about the
drawing order changes. The shared spec gained `roomFor`, the piles that need
the longest column's room: a pyramid names its base, since every card above it
lies half under the next by design. The drawer says "stock, hand, waste and
discard".

### 5.5 Browser check

Checked against `yarn start` in an isolated context, all under Auto.

- **Poker Squares, 390 × 844 upright.** The five-by-five grid across the full
  width; the card to place and the stock at the bottom right.
- **Pyramid, 390 × 844 upright.** The pyramid across the top; the stock and
  hand at the bottom right, the waste and discard at the bottom left.
- **Pyramid, 844 × 390 on its side.** The stock above the hand at the right of
  the base, the waste above the discard at its left, the cards as big as the
  height allows.
- **Aces Up, 390 × 844 upright.** The four columns across the full width with
  big cards; the stock at the bottom right and the discard at the bottom left.

Monte Carlo was left to its specs, being Poker Squares' arrangement with the
discard at the far end of the row. The page was closed afterwards.

### 6.1 Docs

- **The `add-solitaire-game` skill**'s "Arranged grids" section was rewritten:
  columns kept where the larger screen has them, `beside`, an optional `side`
  and when to leave it out, `uprightLines`, overlapped rails for cells and
  reserves, the rule that an empty pile never tucks under another kind's card,
  `roomyBottomMaxHeightPx` with the formula for the 85% cap, the sliver stock
  helpers, hand-laid boards through `phoneLayout`, the catalog's `arrangement`
  with `pilesName` and `sideName`, and `itLaysOutArrangedGrids` for the spec.
- **`.agents/AGENTS.md`** says most games name an `arrangement`, that the side
  pile need not be the stock, that the choices are stored once and named in
  each game's words, and that `arranged_layouts.ts` also completes hand-laid
  boards' phone grids.
- **Pointers:** the board arrangement log's status and the phone layouts
  options doc's "Since then" now point here.
