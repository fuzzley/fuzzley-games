# Board arrangement: work log

This file tracks the work that lets a player choose where Klondike's and
Spider's piles go on every screen: the stock and foundations along the top or
the bottom, and the stock on the left or the right, each with an Auto choice
that follows the screen. It records what was decided, what is done and what is
next, so the work can stop and restart at any commit. It builds on the phone
layouts, whose record is [phone-board-layouts-log.md](phone-board-layouts-log.md).

**Branch:** `feature/board-arrangement-auto`, cut from `main` at `cdbe0a3`.

**Status:** in progress.

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
- [ ] 1.2 Arrangement, chooser and grids
- [ ] 2.1 Settings service
- [ ] 2.2 Settings drawer
- [ ] 2.3 Chrome and skeleton
- [ ] 3.1 Docs
- [ ] 3.2 Verify
- [ ] 3.3 Browser check

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
