# Board arrangement: work log

This file tracks the work that lets a player choose where Klondike's and
Spider's piles go on every screen: the stock and foundations along the top or
the bottom, and the stock on the left or the right, each with an Auto choice
that follows the screen. It records what was decided, what is done and what is
next, so the work can stop and restart at any commit. It builds on the phone
layouts, whose record is [phone-board-layouts-log.md](phone-board-layouts-log.md).

**Branch:** `feature/board-arrangement-auto`, cut from `main` at `cdbe0a3`.

**Status:** merged to `main` on 2026-10-05 after the owner's review. Since
extended to most of the catalog, with a side pile that need not be the stock,
as the `add-solitaire-game` skill describes.

## How to pick this up

1. `git checkout feature/board-arrangement-auto` and read [Progress](#progress).
2. Run `yarn tsc && yarn test` to confirm the tree is green before going on.
3. Take the first unchecked step and add an entry to [Log](#log) saying what
   changed and anything surprising.
4. Check a visible change against `yarn start` (port 9000) at 1280 × 800, 390 ×
   844 upright and 844 × 390 on its side. Close every page the DevTools MCP
   opened when done.

## Decisions

Settled with the project owner on 2026-10-05.

1. **Two settings, on every screen.** "Piles" (Auto, Top, Bottom) and "Stock
   Side" (Auto, Left, Right) are offered for a game that declares arranged
   grids, on a larger screen, an upright phone and a sideways one alike.
2. **Left and right name the stock's side,** not the player's hand. Today's
   "Right Hand" put the stock at the right of an upright phone with the piles
   below and on a sideways phone, but at the left of a larger screen and of an
   upright phone with the piles above. Naming the stock's side means the same
   choice puts it on the same side everywhere.
3. **Auto follows the screen.** On a compact screen (a phone upright or on its
   side, by the existing 720 × 500 CSS px test) it means Bottom and Right; on a
   roomy one, Top and Left. These match today's defaults on an upright phone and
   on a larger screen.
4. **A rail keeps its order.** On a sideways phone, Bottom stands each rail's
   stack on the bottom edge instead of hanging it from the top; the piles on it
   keep the order they have today, the stock still above the waste.
5. **Labels:** "Piles: Top / Bottom" and "Stock Side: Left / Right".

### Implementation choices

- **The chooser finds the stock.** A game's arranged grids name the pile the
  side setting places. `chooseTableLayout` picks the grid for the screen and
  the resolved pile position, then mirrors it when that pile sits in the other
  half from the side asked for. The builder therefore lays every grid out with
  the row as a larger screen has it, left to right, and no longer mirrors the
  row along the bottom of an upright phone itself; the chooser's mirror gives
  the same grid.
- **Auto resolves in one place.** `resolveArrangement(arrangement, formFactor)`
  in `engine/render` is what the board calls each frame and what the shell's
  chrome reads, so they cannot disagree.
- **A larger screen's bottom grid fits its fans.** With the piles below, a long
  column would run over them rather than off the screen, so that grid fits its
  fans to the room above the row. They never open wider than today's gaps.
- **Room beside a rail.** A pile anchored to the bottom edge blocks every column
  above it, because a bottom row's spread may reach past its own column. A rail
  anchored to the bottom shares the columns' grid row, so it blocks only its own
  column.
- **Stored settings move to new keys,** `piles` and `stockSide`, since the old
  values meant something else. An old `phonePiles: "top"` becomes `"top"`,
  which keeps every screen as it was; an old `hand: "left"` becomes `"left"`,
  which keeps a phone as it was. Anything else becomes Auto.
- **The chrome follows the resolved side.** The document root's `data-hand`
  becomes `data-stock-side`, set to the side Auto or the player picked for the
  current screen. The sideways rail and the upright bar move as they did for a
  left hand when the stock is on the left.

### What changes for a player

- On a sideways phone, Auto means Bottom, so Klondike's stock and waste stand at
  the bottom of the right rail rather than hanging from its top. Spider's rail
  already fills the height, so it does not move.
- On an upright phone, choosing Top with the side on Auto puts the stock at the
  top right; "Piles Above" used to put it at the top left.
- A desktop window narrower than 720 or shorter than 500 CSS px counts as a
  phone for Auto, as it already does for the card style.

## The plan

### Phase 0: record the plan

- **0.1** Commit this log.

### Phase 1: the engine and the grids

- **1.1 Room beside a bottom rail.** `computePileRooms` lets a bottom-anchored
  pile block every column only from a lower grid row.
- **1.2 Arrangement, chooser and grids.** `PilePosition`, `StockSide`,
  `OrAuto`, `BoardArrangement` with `piles` and `stockSide`,
  `resolveArrangement`. `PhoneLayouts` becomes `ArrangedLayouts`, with a top
  and a bottom grid for each screen, the columns and the stock. The builder in
  `games/common` becomes `arrangedLayouts`, builds the larger screen's bottom
  grid with fitted fans and the sideways bottom grid, and leaves the row
  unmirrored. Klondike and Spider name their stock and their larger grid; the
  catalog field becomes `arrangedLayouts`. The settings service, the drawer and
  their doubles move to the new names, keeping today's offer for now.

### Phase 2: the shell

- **2.1 Settings service.** `piles` and `stockSide` with Auto, stored under the
  new keys with the old ones read once, and `resolvedArrangement`.
- **2.2 Settings drawer.** "Piles" and "Stock Side" groups, both with Auto
  first, shown on every screen for a game with arranged grids. Auto describes
  what it picks.
- **2.3 Chrome and skeleton.** `data-stock-side` from the resolved side; the
  canvas re-reads the chrome's insets when it changes; the loading skeleton
  places a bottom-anchored rail at the bottom.

### Phase 3: finish

- **3.1 Docs.** `.agents/AGENTS.md`, the `add-solitaire-game` skill, and a
  pointer from the phone layout docs.
- **3.2 Verify.** `yarn verify`; raise the coverage floor if the figures rose.
- **3.3 Browser check.** Klondike and Spider at the three screen sizes, under
  Auto and all four fixed combinations; FreeCell unchanged.

## Progress

- [x] 0.1 Record the plan
- [x] 1.1 Room beside a bottom rail
- [x] 1.2 Arrangement, chooser and grids
- [x] 2.1 Settings service
- [x] 2.2 Settings drawer
- [x] 2.3 Chrome and skeleton
- [x] 3.1 Docs
- [x] 3.2 Verify
- [x] 3.3 Browser check

## Log

### 0.1 Record the plan

This log, from the plan agreed with the owner.

### 1.1 Room beside a bottom rail

`computePileRooms` counted every bottom-anchored pile as blocking every column
above it, which a rail stood on the bottom edge would do to every column beside
it. It now counts a bottom-anchored pile across columns only when it sits in a
lower grid row than the pile it limits, read from the top through
`rowFromTop`. An upright phone's bottom row still stops every column; a rail in
the columns' own row stops only the piles above it on the rail. Two specs cover
the rail.

### 1.2 Arrangement, chooser and grids; 2.1 and 2.2 with it

These landed together, since the shell could not compile against the new
arrangement without its settings and drawer moving too.

- **Engine.** `board_layouts.ts` has `PilePosition`, `StockSide`, `OrAuto`,
  `BoardArrangement` (`piles`, `stockSide`, both `"auto"` by default),
  `ResolvedArrangement`, `AUTO_ARRANGEMENTS` and `resolveArrangement`.
  `PhoneLayouts` became `ArrangedLayouts`: a `top` and a `bottom` grid for
  `roomy`, `portrait` and `landscape`, plus `columns` and `stock`.
  `BoardLayouts.phone` became `arranged`. `chooseTableLayout` resolves the
  arrangement, picks the grid, and mirrors it (columns kept in order) when the
  stock's column is in the other half; a stock in the middle column, or absent,
  is left alone.
- **Builder.** `games/common/phone_layouts.ts` is now `arranged_layouts.ts`, with
  `arrangedLayouts(board)` and `ArrangedBoard`, which gains `roomy` and `stock`
  (checked to be in the row). The upright grid with the piles below no longer
  mirrors the row; the chooser's mirror gives the same grid as before for a
  stock at the right. New grids: the larger screen's with the row along the
  bottom, and the sideways one with each rail stood on the bottom edge, in the
  same order. Since every board now has a row, the no-row branches went.
- **The larger screen's bottom grid is taller when it must be.** On a 16:9
  desktop the columns get only about 520 design units above the row, so a long
  Klondike run would spill over the stock and foundations. That grid reserves
  room for the longest column at `ROOMY_FAN_FIT`'s floors (36 face up, 10 face
  down, never wider than the usual 45), which makes Klondike's 1217 units tall
  rather than 877. The cards are smaller when a player picks Bottom on a
  desktop; Auto keeps the grid above there.
- **Games and catalog.** `KLONDIKE_ARRANGED_LAYOUTS` and
  `SPIDER_ARRANGED_LAYOUTS`; the catalog entry field is `arrangedLayouts`, and
  `boardLayoutsOf` hands it on. A stray doc comment above `boardLayoutsOf` that
  belonged to `catalogEntry` moved back.
- **Settings service (2.1).** `piles` and `stockSide` signals, `setPiles`,
  `setStockSide`, and `resolvedArrangement`, computed from the viewport's form
  factor. Stored under `piles` and `stockSide`; `phonePiles: "top"` and
  `hand: "left"` from the last build are read once, and the old keys go with
  the next save.
- **Drawer (2.2).** "Piles" (Auto, Top, Bottom) and "Stock Side" (Auto, Left,
  Right), shown for any game with arranged grids on every screen. Auto has no
  fixed description: the drawer builds one from `AUTO_ARRANGEMENTS` and the
  resolved arrangement, such as "Bottom on a phone, upright or on its side, and
  Top on a larger screen: Top here." The drawer no longer needs the viewport.
- **Chrome (part of 2.3).** The app root writes the resolved side to
  `data-stock-side`, which the header and canvas stylesheets read where they
  read `data-hand`; the canvas refreshes the chrome's insets when the resolved
  side changes.
- **Docs (part of 3.1).** `.agents/AGENTS.md` and the `add-solitaire-game`
  skill describe the arranged grids.
- **Specs.** The chooser over every screen and choice, Auto, the builder's new
  grids, Klondike's and Spider's grids under Auto and all four choices on six
  phone sizes and a desktop, the stock landing on the side asked for, the
  settings' storage and migration, the drawer's groups and Auto descriptions,
  and the document root's side. The presentation double gained a `formFactor`
  signal so a spec can decide Auto for a phone.
- **Environment.** `yarn tsc` failed on `@types/node` because this checkout's
  `node_modules` predated `9ec136f`; `yarn install --immutable` fixed it.

### 2.3 Chrome and skeleton

The chrome moved with 1.2. The loading skeleton counted a grid's height in its
rows alone, so on a board taller than its grid, as every phone grid is, an
offset rail pile already landed below the board, and a rail stood on the
bottom edge would have landed above it. `skeletonSlots` now counts the extra
design height as rows, measured as the board measures it, so the skeleton's
cells are a row of the real board tall and a bottom-anchored slot sits on its
bottom edge. A grid without a design height comes out as before; a larger
screen's Klondike skeleton has its columns a little higher, where the board
puts them.

### 3.1 Docs

`.agents/AGENTS.md` and the `add-solitaire-game` skill moved with 1.2. The phone
layout docs now point here: the options doc's "What shipped" names the renamed
builder, and the phone layout log's status says it merged and what replaced its
settings.

### 3.2 Verify

`yarn verify` passes: lint, type check, build, and 4427 tests. Coverage is
98.39% of statements, 92.23% of branches, 98.97% of functions and 99.38% of
lines, well above the floor, which was left as it is.

### 3.3 Browser check

Checked against `yarn start` in isolated contexts.

- **1280 × 800, Klondike.** Auto lays out the classic grid, and the drawer
  describes Auto as "Top here" and "Left here". Bottom and Right put the columns
  along the top, the foundations at the bottom left and the stock at the bottom
  right, the waste fanning towards the foundations with its top card beside the
  stock. The cards are smaller, as 1.2 expected. A column of six hidden cards
  under thirteen face up fits above the row at the 36-unit floor, every rank
  readable. Top and Right is the classic grid mirrored, the columns in deal
  order.
- **390 × 844 upright, Klondike.** Auto gives the grid that shipped: stock at
  the bottom right, the bar in its usual order. Top with the side on Auto puts
  the stock at the top right. Bottom and Left puts it at the bottom left and
  reverses the bar.
- **844 × 390 on its side, Klondike.** Auto stands both rails on the bottom
  edge: the foundations on the left, the stock above the waste on the right, the
  chrome rail at the left, and the columns hanging from the top. The board is
  held to the width here, so the rails leave room above them. Top and Left puts
  the stock at the top of the left rail and the chrome rail at the right, the
  board clear of it.
- **Spider.** At 1280 × 800 Bottom with the side on Auto puts the stock at the
  bottom left and the foundations along the bottom. On its side, Auto's rail
  fills the height, so it is where it was. The loading skeleton's rail landed
  inside the board.
- **FreeCell** on an upright phone offers neither setting and keeps its grid,
  and the presentation settings were stored under the new keys.
