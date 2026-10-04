# Phone board layouts: work log

This file tracks the work on phone layouts for Klondike and Spider: a grid for
a phone held upright, another for a phone on its side, columns that fan to fit
the room below them, chrome that moves out of the board's way, and a mirrored
layout for a left hand. It records what was decided, what is done and what is
next, so the work can stop and restart at any commit. The research and the
options it chose between are in [phone-board-layouts.md](phone-board-layouts.md).

**Branch:** `feature/phone-board-layouts`, cut from `main` at `6fecaa4`.

**Status:** in progress. See [Progress](#progress).

## How to pick this up

1. `git checkout feature/phone-board-layouts` and read [Progress](#progress).
2. Run `yarn tsc && yarn test` to confirm the tree is green before going on.
3. Take the first unchecked step. Each step is one commit, or a few, and adds an
   entry to [Log](#log) saying what changed and anything surprising.
4. Check a visible change in Chrome's phone emulation against `yarn start`
   (port 9000): 390 × 844 upright and 844 × 390 on its side, plus 360 and 430
   wide. Close every page the DevTools MCP opened when done.

## Decisions

Settled with the project owner on 2026-10-04, after reviewing the options.

1. **Upright phone: piles at the bottom by default.** K-P2 and S-P2 are the
   default grids for a phone held upright. K-P1 and S-P1, the classic grid with
   fitted fans, are offered as a setting.
2. **Phone on its side: a side rail.** The header becomes a rail down the side
   of the screen. Klondike gets K-L2 and Spider S-L2.
3. **Left-handed mirror: yes,** in this release.
4. **Fans fit one column at a time,** each to the room below it, with a cap on
   how far a short column opens.
5. **Klondike and Spider first.** Their variants (Whitehead, Thumb and Pouch,
   Saratoga; one, two or four suits) share their grids and come along. Every
   other game keeps its grid and fans, and gets a follow-up once these two are
   settled.
6. **Built to be reused.** The layout management is general, so another game
   can take on phone grids easily later. A game declares its columns, the row
   of piles beside them and what goes on each rail. A shared builder derives
   its grids from that, and everything else (the chooser, fitted fans, the
   mirror, the settings) works for any game that declares phone grids.

### Implementation choices

Made while planning, within the decisions above. Each is easy to revisit.

- **One bar at the bottom when upright.** The K-P2 sketch had a status strip at
  the top and a tool bar at the bottom. The header instead docks at the bottom
  as one bar, which puts every action in thumb reach and gives the board the
  most height. Chrome is shared, so this applies to every game on an upright
  phone, as the rail does on its side.
- **Phone detection by shape.** A window is compact when it is narrower than
  720 CSS px or shorter than 500; compact and taller than wide is an upright
  phone, compact and wider than tall is a phone on its side. So a sideways
  phone gets compact chrome and gaps and, under the Auto card style, the mobile
  deck, in every game.
- **Fitted fans only on the phone grids.** The grids used on larger screens are
  unchanged. Long columns can run off the bottom there too; that is noted as a
  follow-up, not fixed here.
- **The cap is 110 design units,** about a third of a card. It is one constant,
  to be tuned once the layouts have been tried on a phone.
- **The floor is 40 design units,** enough to keep the mobile deck's rank (drawn
  6 to 42 units down the strip) readable. Hidden cards tighten first, from 18
  to 10 units.
- **The bottom row is the top row, mirrored.** An upright grid with the piles
  at the bottom moves the row of piles from above the columns to the bottom
  edge and mirrors it. Whatever sat at the left on a larger screen, the stock in
  both games, ends up under a right thumb, and a spread such as the waste fans
  the other way. This gives K-P2 exactly. For Spider it gives the foundations in
  columns 0 to 7 and the stock in column 9, whole cards rather than the
  overlapped runs the S-P2 sketch drew; the room is the same either way, since
  the row is one card tall.
- **Whole cards, not half-hidden ones.** S-L2 puts the stock and the runs
  together on one rail on the right rather than half-hidden piles on both
  edges, so nothing relies on the edge of the canvas to hide half a card. The
  cards come out the same size as in the sketch.
- **Rails fit themselves.** A rail stacks its piles down a column, overlapping
  them evenly when they do not fit, but never so far that less than an index
  strip of each shows. When even that does not fit, the grid asks for more
  height, which scales the board down instead.
- **The Spider stock shows one sliver per deal** on the phone grids, so a
  player can see how many deals are left.
- **The mirror flips grids only for games that declare phone grids,** on every
  screen size. The chrome follows the hand for every game: the rail moves to
  the right and the bottom bar reverses.
- **No `viewport-fit=cover`.** Without it the browser keeps the page inside the
  safe area, so a notch never covers a column and nothing needs safe-area
  insets.
- **Settings appear where they apply.** "Upright phone layout" shows only on a
  phone and only for a game with phone grids; "Hand" shows for a game with
  phone grids. Both are read from what the game's catalog entry declares, never
  from its id.

## Design

### Where the pieces go

| Piece                                                   | Tier                             | File                                                 |
| ------------------------------------------------------- | -------------------------------- | ---------------------------------------------------- |
| Insets on every side of the viewport                    | `engine/render`                  | `view/table_view_state.ts`, `layout/table_layout.ts` |
| Form factor of a viewport                               | `engine/render`                  | `layout/form_factor.ts` (new)                        |
| Spreads in any direction, sliver groups                 | `engine/render`                  | `layout/pile_layout.ts`                              |
| Bottom-anchored and offset slots, room below each pile  | `engine/render`                  | `layout/table_layout.ts`                             |
| Fitting a fan to its room                               | `engine/render`                  | `layout/pile_layout.ts`                              |
| Board layouts, the arrangement, the mirror, the chooser | `engine/render`                  | `layout/board_layouts.ts` (new)                      |
| Resolving a pile's arrangement for a frame              | `engine/tableau/view`            | `pile_arrangement.ts` (new)                          |
| Choosing the grid each frame                            | `engine/board`                   | `table_board_scene.ts`                               |
| Phone fan limits                                        | `games/common`                   | `pile_layouts.ts`                                    |
| The phone grid builder every game uses                  | `games/common`                   | `phone_layouts.ts` (new)                             |
| Klondike and Spider phone grids, declared               | `games/klondike`, `games/spider` | `*_layout.ts`                                        |
| Catalog entries name their phone grids                  | `ui/app/provider`                | `game_catalog.ts`, `board_catalog.ts`                |
| Form factor signal, settings, chrome                    | `ui/app`                         | `service/`, `component/`, `styles/`                  |

### How a frame finds its grid

1. `formFactorOf(viewport)` says `roomy`, `phone-portrait` or
   `phone-landscape`.
2. `chooseTableLayout(layouts, formFactor, arrangement)` picks the roomy grid,
   the upright grid for the chosen pile position, or the sideways grid, and
   mirrors it for a left hand when the game allows.
3. `measureTable` scales the grid into the viewport less its insets, places
   every slot (bottom-anchored rows from the bottom edge, offsets added), and
   measures the room below each pile.
4. For each pile, `pileArrangement` takes the zone's own arrangement, applies
   the grid's override for that pile, flips it if mirrored, and fits a
   downward fan to its room. The drawn cards, the drop rectangles and the stack
   in hand all read this one result.

The chooser runs every frame, so turning the phone or changing a setting moves
the cards to their new places the way any move does.

### Declaring a game's phone grids

A game hands `phoneLayouts` (in `games/common/phone_layouts.ts`) four things,
and the builder derives the three grids from them:

- **columns:** the tableau piles, left to right. They fan down and take the
  height.
- **row:** the other piles and the grid column each sits in on a larger
  screen, as the row above the columns.
- **rails:** for a phone on its side, which of those piles stack down a rail at
  the left and which at the right, and whether a spread pile spreads down
  there.
- **pileLayouts** (optional): an arrangement a pile takes on every phone grid,
  such as the Spider stock's slivers.

Then:

- **Upright, piles at the top** is the larger screen's grid with phone gaps and
  fitted fans.
- **Upright, piles at the bottom** puts the columns at the top and the row,
  mirrored, along the bottom edge.
- **On its side** puts the rails at the edges and the columns between them,
  starting at the top. Each rail fits itself to the height (see above).

Taking on phone grids in another game is then a declaration and a line in its
catalog entry. The catalog spec checks every grid of every entry places every
pile, and the settings appear by themselves.

### The grids for these two games

Columns are counted from the left for a right hand; the mirror counts them
from the right.

- **K-P2 (Klondike upright, default):** the seven columns at the top; at the
  bottom, the four foundations in columns 0 to 3, the waste in column 5
  spreading left, the stock in column 6.
- **K-P1 (Klondike upright, setting):** today's grid with fitted fans.
- **K-L2 (Klondike on its side):** nine columns. The foundations stack down
  the left rail, each overlapping the next; the seven columns fill the middle
  from the top; the stock tops the right rail with the waste spreading down
  below it.
- **S-P2 (Spider upright, default):** the ten columns at the top; at the
  bottom, the eight foundations in columns 0 to 7 and the stock in column 9,
  one sliver per deal still to come.
- **S-P1 (Spider upright, setting):** today's grid with fitted fans.
- **S-L2 (Spider on its side):** eleven columns. The ten columns fill the left
  from the top; the right rail holds the stock, one sliver per deal, with the
  foundations overlapping below it.

## The plan

### Phase 0: record the plan

- **0.1** Commit the options doc, its sketches and this log.

### Phase 1: engine foundations, nothing visible yet

- **1.1 Insets on every side.** `Viewport.insetTop` becomes `insets` (top,
  right, bottom, left, in CSS px). `ViewportScaler` reads
  `--board-inset-top`, `-right`, `-bottom` and `-left`; `PhaserHost`,
  `BoardScene`, `makeTableBoardScene` and the board catalog pass them through;
  `computeScale` and `computePileOrigins` lay the board out inside all four.
  The canvas still declares only the top.
- **1.2 Spreads in any direction.** The `fan-right` arrangement becomes
  `spread` with a `direction` (right, left or down) and an optional
  `groupSize`, so a stock dealt ten at a time shows one sliver per deal.
  `pileWidth` becomes an extent that knows a leftward spread reaches left of
  its origin, and drop rectangles use it. The waste, Forty Thieves and
  Beleaguered Castle move over unchanged.
- **1.3 Anchored and offset slots.** A slot may be anchored to the board's
  bottom edge and may carry an offset in design units. `TableMetrics` gains
  the room below each pile: down to the board's bottom, or to the top of the
  nearest slot below it. The loading skeleton places bottom-anchored slots at
  the bottom.
- **1.4 Fitted fans.** `FanFit` (floor, cap, face-down floor) and
  `fitFanDown`. A grid may carry a `fanFit`, per-pile arrangement overrides and
  a `mirrored` flag. `pileArrangement` resolves a pile's arrangement for a
  frame, and the view builder, the held stack's gap and the drop target all
  use it.
- **1.5 Board layouts and the chooser.** `formFactorOf`, `BoardLayouts`,
  `BoardArrangement`, `mirrorTable`, `chooseTableLayout`.
  `TablePresentation.boardArrangement()`; the board scene measures through the
  chooser; catalog entries may name `phoneLayouts`. The settings service
  answers with the defaults until phase 4.

### Phase 2: chrome

- **2.1 Phone detection in the shell.** `ViewportService.formFactor`, mirroring
  `formFactorOf`; `isCompact` follows it, so the card style's Auto follows it
  too. `_breakpoints.scss` gains `compact`, `phone-portrait` and
  `phone-landscape` mixins, and the compact header and header height switch to
  `compact`. Visible: a sideways phone gets the compact header and gaps, and
  the mobile deck under Auto.
- **2.2 Side rail.** On a phone on its side the header becomes a rail down the
  left; the canvas declares `--board-inset-left`; the overflow menu opens
  beside the rail; the loading overlay and the deck badge read the insets
  rather than the header height.
- **2.3 Bottom bar.** On an upright phone the header docks at the bottom; the
  canvas declares `--board-inset-bottom`; the overflow menu opens upward.

### Phase 3: the grids

- **3.1 The phone grid builder.** `PHONE_FAN_FIT` in
  `games/common/pile_layouts.ts`; `phoneLayouts` in
  `games/common/phone_layouts.ts`, with its rail fitting and the overrides for
  a mirrored row and a pile spreading down a rail. Specs against a made-up
  board, so the builder is tested apart from any game. The catalog spec checks
  that every grid of every entry places every pile.
- **3.2 Klondike.** Its declaration in `klondike_layout.ts`, named by the
  catalog entry. Specs: the waste keeps the draw count's fan, a long column
  fits on the reference screens.
- **3.3 Spider.** Its declaration in `spider_layout.ts`, the same way, with
  the sliver stock.
- **3.4 Browser check.** Both games, both orientations, 360, 390 and 430 wide;
  a long column, a drag onto a squeezed column, a rotation mid-game. Tune.

### Phase 4: settings and the mirror

- **4.1 Settings service.** `phonePiles` (`bottom` by default) and `hand`
  (`right` by default), stored and validated with the rest, and
  `boardArrangement()`.
- **4.2 Settings drawer.** "Upright phone layout" (piles at the bottom, piles
  at the top) on a phone, and "Hand" (right, left), each for a game with phone
  grids.
- **4.3 Mirrored chrome.** The hand is set on the document root; the rail
  moves to the right and the bottom bar reverses for a left hand. Browser check
  of every grid mirrored.

### Phase 5: finish

- **5.1 Docs.** `.agents/AGENTS.md`; the `add-solitaire-game` skill gains how
  to give a game phone grids; any other skill that describes the layout code;
  `phone-board-layouts.md` updated to say what shipped.
- **5.2 Verify.** `yarn verify`; raise the coverage floor if the figures rose.
- **5.3 Last look** on the phone sizes; close the log.

### Not in this work

- Phone grids for the other games (the follow-up the owner asked for).
- Fitted fans on the grids for larger screens, where long columns can also run
  off the bottom.
- A taller index for the mobile deck, and moving a card with a single tap.

## Progress

- [x] 0.1 Record the plan
- [x] 1.1 Insets on every side
- [x] 1.2 Spreads in any direction
- [x] 1.3 Anchored and offset slots
- [ ] 1.4 Fitted fans
- [ ] 1.5 Board layouts and the chooser
- [ ] 2.1 Phone detection in the shell
- [ ] 2.2 Side rail
- [ ] 2.3 Bottom bar
- [ ] 3.1 The phone grid builder
- [ ] 3.2 Klondike grids
- [ ] 3.3 Spider grids
- [ ] 3.4 Browser check
- [ ] 4.1 Settings service
- [ ] 4.2 Settings drawer
- [ ] 4.3 Mirrored chrome
- [ ] 5.1 Docs
- [ ] 5.2 Verify
- [ ] 5.3 Last look

## Log

### Setup

Branch cut from `main` at `6fecaa4`. Baseline: `yarn tsc` clean, `yarn test`
132 files and 3974 tests passing in about 45 s.

### 0.1 Record the plan

The options doc, its twelve sketches and this log. The owner's decisions are
recorded in both. After planning, the owner asked for the layout management to
be general enough for other games to take on later (decision 6). That replaced
the hand-placed grids first planned for step 3 with a builder that derives
them from a declaration.

### 1.1 Insets on every side

`Viewport.insetTop` is now `insets`, an `Insets` of top, right, bottom and left
in CSS pixels, with `NO_INSETS` for none (both in
`engine/render/view/table_view_state.ts`). `ViewportScaler.INSET_PROPERTIES`
names the four custom properties it reads, `--board-inset-top`, `-right`,
`-bottom` and `-left`; `PhaserHost` hands `insets()` to each board, and
`BoardScene`, `makeTableBoardScene`, the board catalog's `BoardSetting` and the
canvas component pass it through. `computeScale` fits the board inside all four
and `computePileOrigins` starts it at the left inset, centring it in the width
left between the side insets. The canvas still declares only the top, so
nothing on screen moves. New specs cover side and bottom insets in the layout
math and all four in the scaler.

### 1.2 Spreads in any direction

The `fan-right` arrangement is now `spread`, with a `direction` of `right`,
`left` or `down` and an optional `groupSize`. `spreadOffsets` replaces
`fanRightOffsets`: with a group size, a run of cards moves as one, so fifty
cards in groups of ten show as five slivers and `maxVisible` counts groups. The
Klondike waste, the Forty Thieves waste, the Beleaguered Castle rows and the
fake table's waste all spread right, as they fanned right before.

`pileHeight` and `pileWidth` gave way to `pileBounds`, the rectangle a pile's
cards cover relative to its origin, which reaches left of the origin for a
leftward spread. Drop rectangles use it, so a pile spreading left takes a drop
over the cards it shows. Nothing on screen changes.

There was no spec for `pile_layout.ts` of its own; the offsets were covered from
`drop_geometry.spec.ts`. The new spreads and bounds have one,
`test/engine/render/layout/pile_layout.spec.ts`, which step 1.4 extends.

### 1.3 Anchored and offset slots

`SlotPlacement` takes an optional `anchor` (`"bottom"` counts the row up from
the board's bottom edge, above the bottom inset, however tall the screen is)
and an optional `offset` in design units, for piles overlapping down a rail.
`computePileOrigins` places both.

`TableMetrics.rooms` holds how far each pile's cards may reach below its
origin, in design units, from the new `computePileRooms`: down to the board's
bottom edge less its padding, or to a gap above the nearest pile below. A pile
below counts if it shares the column, or if it is bottom-anchored. A row along
the bottom is a floor under the whole board, because a pile in it may spread
beyond its own column; the waste spreading left under column 4 in K-P2 is the
case that needs this.

The loading skeleton counts a bottom-anchored row up from the last row and
turns an offset into grid cells. Nothing on screen changes; no grid uses either
yet.
