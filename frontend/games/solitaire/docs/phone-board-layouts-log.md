# Phone board layouts: work log

This file tracks the work on phone layouts for Klondike and Spider: a grid for a
phone held upright, another for a phone on its side, columns that fan to fit the
room below them, chrome that moves out of the board's way, and a mirrored layout
for a left hand. It records what was decided, what is done and what is next, so
the work can stop and restart at any commit. The research and the options it
chose between are in [phone-board-layouts.md](phone-board-layouts.md).

**Branch:** `feature/phone-board-layouts`, cut from `main` at `6fecaa4`.

**Status:** in progress. See [Progress](#progress).

## How to pick this up

1. `git checkout feature/phone-board-layouts` and read [Progress](#progress).
2. Run `yarn tsc && yarn test` to confirm the tree is green before going on.
3. Take the first unchecked step. Each step is one commit, or a few, and adds an
   entry to [Log](#log) saying what changed and anything surprising.
4. Check a visible change in Chrome's phone emulation against `yarn start` (port
   9000): 390 × 844 upright and 844 × 390 on its side, plus 360 and 430 wide.
   Close every page the DevTools MCP opened when done.

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
6. **Built to be reused.** The layout management is general, so another game can
   take on phone grids easily later. A game declares its columns, the row of
   piles beside them and what goes on each rail. A shared builder derives its
   grids from that, and everything else (the chooser, fitted fans, the mirror,
   the settings) works for any game that declares phone grids.

### Implementation choices

Made while planning, within the decisions above. Each is easy to revisit.

- **One bar at the bottom when upright.** The K-P2 sketch had a status strip at
  the top and a tool bar at the bottom. The header instead docks at the bottom
  as one bar, which puts every action in thumb reach and gives the board the
  most height. Chrome is shared, so this applies to every game on an upright
  phone, as the rail does on its side.
- **Phone detection by shape.** A window is compact when it is narrower than 720
  CSS px or shorter than 500; compact and taller than wide is an upright phone,
  compact and wider than tall is a phone on its side. So a sideways phone gets
  compact chrome and gaps and, under the Auto card style, the mobile deck, in
  every game.
- **Fitted fans only on the phone grids.** The grids used on larger screens are
  unchanged. Long columns can run off the bottom there too; that is noted as a
  follow-up, not fixed here.
- **The cap is 110 design units,** about a third of a card. It is one constant,
  to be tuned once the layouts have been tried on a phone.
- **The floor is 40 design units,** enough to keep the mobile deck's rank (drawn
  6 to 42 units down the strip) readable. Hidden cards tighten first, from 18 to
  10 units.
- **The bottom row is the top row, mirrored.** An upright grid with the piles at
  the bottom moves the row of piles from above the columns to the bottom edge
  and mirrors it. Whatever sat at the left on a larger screen, the stock in both
  games, ends up under a right thumb, and a spread such as the waste fans the
  other way. This gives K-P2 exactly. For Spider it gives the foundations in
  columns 0 to 7 and the stock in column 9, whole cards rather than the
  overlapped runs the S-P2 sketch drew; the room is the same either way, since
  the row is one card tall.
- **Whole cards, not half-hidden ones.** S-L2 puts the stock and the runs
  together on one rail on the right rather than half-hidden piles on both edges,
  so nothing relies on the edge of the canvas to hide half a card. The cards
  come out the same size as in the sketch.
- **Rails fit themselves.** A rail stacks its piles down a column, overlapping
  them evenly when they do not fit, but never so far that less than an index
  strip of each shows. When even that does not fit, the grid asks for more
  height, which scales the board down instead.
- **The Spider stock shows one sliver per deal** on the phone grids, so a player
  can see how many deals are left.
- **The mirror flips grids only for games that declare phone grids,** on every
  screen size. The chrome follows the hand for every game: the rail moves to the
  right and the bottom bar reverses.
- **No `viewport-fit=cover`.** Without it the browser keeps the page inside the
  safe area, so a notch never covers a column and nothing needs safe-area
  insets.
- **Settings appear where they apply.** "Upright phone layout" shows only on a
  phone and only for a game with phone grids; "Hand" shows for a game with phone
  grids. Both are read from what the game's catalog entry declares, never from
  its id.

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

1. `formFactorOf(viewport)` says `roomy`, `phone-portrait` or `phone-landscape`.
2. `chooseTableLayout(layouts, formFactor, arrangement)` picks the roomy grid,
   the upright grid for the chosen pile position, or the sideways grid, and
   mirrors it for a left hand when the game allows.
3. `measureTable` scales the grid into the viewport less its insets, places
   every slot (bottom-anchored rows from the bottom edge, offsets added), and
   measures the room below each pile.
4. For each pile, `pileArrangement` takes the zone's own arrangement, applies
   the grid's override for that pile, flips it if mirrored, and fits a downward
   fan to its room. The drawn cards, the drop rectangles and the stack in hand
   all read this one result.

The chooser runs every frame, so turning the phone or changing a setting moves
the cards to their new places the way any move does.

### Declaring a game's phone grids

A game hands `phoneLayouts` (in `games/common/phone_layouts.ts`) four things,
and the builder derives the three grids from them:

- **columns:** the tableau piles, left to right. They fan down and take the
  height.
- **row:** the other piles and the grid column each sits in on a larger screen,
  as the row above the columns.
- **rails:** for a phone on its side, which of those piles stack down a rail at
  the left and which at the right, and whether a spread pile spreads down there.
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

Columns are counted from the left for a right hand; the mirror counts them from
the right.

- **K-P2 (Klondike upright, default):** the seven columns at the top; at the
  bottom, the four foundations in columns 0 to 3, the waste in column 5
  spreading left, the stock in column 6.
- **K-P1 (Klondike upright, setting):** today's grid with fitted fans.
- **K-L2 (Klondike on its side):** nine columns. The foundations stack down the
  left rail, each overlapping the next; the seven columns fill the middle from
  the top; the stock tops the right rail with the waste spreading down below it.
- **S-P2 (Spider upright, default):** the ten columns at the top; at the bottom,
  the eight foundations in columns 0 to 7 and the stock in column 9, one sliver
  per deal still to come.
- **S-P1 (Spider upright, setting):** today's grid with fitted fans.
- **S-L2 (Spider on its side):** eleven columns. The ten columns fill the left
  from the top; the right rail holds the stock, one sliver per deal, with the
  foundations overlapping below it.

## The plan

### Phase 0: record the plan

- **0.1** Commit the options doc, its sketches and this log.

### Phase 1: engine foundations, nothing visible yet

- **1.1 Insets on every side.** `Viewport.insetTop` becomes `insets` (top,
  right, bottom, left, in CSS px). `ViewportScaler` reads `--board-inset-top`,
  `-right`, `-bottom` and `-left`; `PhaserHost`, `BoardScene`,
  `makeTableBoardScene` and the board catalog pass them through; `computeScale`
  and `computePileOrigins` lay the board out inside all four. The canvas still
  declares only the top.
- **1.2 Spreads in any direction.** The `fan-right` arrangement becomes `spread`
  with a `direction` (right, left or down) and an optional `groupSize`, so a
  stock dealt ten at a time shows one sliver per deal. `pileWidth` becomes an
  extent that knows a leftward spread reaches left of its origin, and drop
  rectangles use it. The waste, Forty Thieves and Beleaguered Castle move over
  unchanged.
- **1.3 Anchored and offset slots.** A slot may be anchored to the board's
  bottom edge and may carry an offset in design units. `TableMetrics` gains the
  room below each pile: down to the board's bottom, or to the top of the nearest
  slot below it. The loading skeleton places bottom-anchored slots at the
  bottom.
- **1.4 Fitted fans.** `FanFit` (floor, cap, face-down floor) and `fitFanDown`.
  A grid may carry a `fanFit`, per-pile arrangement overrides and a `mirrored`
  flag. `pileArrangement` resolves a pile's arrangement for a frame, and the
  view builder, the held stack's gap and the drop target all use it.
- **1.5 Board layouts and the chooser.** `formFactorOf`, `BoardLayouts`,
  `BoardArrangement`, `mirrorTable`, `chooseTableLayout`.
  `TablePresentation.boardArrangement()`; the board scene measures through the
  chooser; catalog entries may name `phoneLayouts`. The settings service answers
  with the defaults until phase 4.

### Phase 2: chrome

- **2.1 Phone detection in the shell.** `ViewportService.formFactor`, mirroring
  `formFactorOf`; `isCompact` follows it, so the card style's Auto follows it
  too. `_breakpoints.scss` gains `compact`, `phone-portrait` and
  `phone-landscape` mixins, and the compact header and header height switch to
  `compact`. Visible: a sideways phone gets the compact header and gaps, and the
  mobile deck under Auto.
- **2.2 Side rail.** On a phone on its side the header becomes a rail down the
  left; the canvas declares `--board-inset-left`; the overflow menu opens beside
  the rail; the loading overlay and the deck badge read the insets rather than
  the header height.
- **2.3 Bottom bar.** On an upright phone the header docks at the bottom; the
  canvas declares `--board-inset-bottom`; the overflow menu opens upward.

### Phase 3: the grids

- **3.1 The phone grid builder.** `PHONE_FAN_FIT` in
  `games/common/pile_layouts.ts`; `phoneLayouts` in
  `games/common/phone_layouts.ts`, with its rail fitting and the overrides for a
  mirrored row and a pile spreading down a rail. Specs against a made-up board,
  so the builder is tested apart from any game. The catalog spec checks that
  every grid of every entry places every pile.
- **3.2 Klondike.** Its declaration in `klondike_layout.ts`, named by the
  catalog entry. Specs: the waste keeps the draw count's fan, a long column fits
  on the reference screens.
- **3.3 Spider.** Its declaration in `spider_layout.ts`, the same way, with the
  sliver stock.
- **3.4 Browser check.** Both games, both orientations, 360, 390 and 430 wide; a
  long column, a drag onto a squeezed column, a rotation mid-game. Tune.

### Phase 4: settings and the mirror

- **4.1 Settings service.** `phonePiles` (`bottom` by default) and `hand`
  (`right` by default), stored and validated with the rest, and
  `boardArrangement()`.
- **4.2 Settings drawer.** "Upright phone layout" (piles at the bottom, piles at
  the top) on a phone, and "Hand" (right, left), each for a game with phone
  grids.
- **4.3 Mirrored chrome.** The hand is set on the document root; the rail moves
  to the right and the bottom bar reverses for a left hand. Browser check of
  every grid mirrored.

### Phase 5: finish

- **5.1 Docs.** `.agents/AGENTS.md`; the `add-solitaire-game` skill gains how to
  give a game phone grids; any other skill that describes the layout code;
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
- [x] 1.4 Fitted fans
- [x] 1.5 Board layouts and the chooser
- [x] 2.1 Phone detection in the shell
- [x] 2.2 Side rail
- [x] 2.3 Bottom bar
- [x] 3.1 The phone grid builder
- [x] 3.2 Klondike grids
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

Branch cut from `main` at `6fecaa4`. Baseline: `yarn tsc` clean, `yarn test` 132
files and 3974 tests passing in about 45 s.

### 0.1 Record the plan

The options doc, its twelve sketches and this log. The owner's decisions are
recorded in both. After planning, the owner asked for the layout management to
be general enough for other games to take on later (decision 6). That replaced
the hand-placed grids first planned for step 3 with a builder that derives them
from a declaration.

### 1.1 Insets on every side

`Viewport.insetTop` is now `insets`, an `Insets` of top, right, bottom and left
in CSS pixels, with `NO_INSETS` for none (both in
`engine/render/view/table_view_state.ts`). `ViewportScaler.INSET_PROPERTIES`
names the four custom properties it reads, `--board-inset-top`, `-right`,
`-bottom` and `-left`; `PhaserHost` hands `insets()` to each board, and
`BoardScene`, `makeTableBoardScene`, the board catalog's `BoardSetting` and the
canvas component pass it through. `computeScale` fits the board inside all four
and `computePileOrigins` starts it at the left inset, centring it in the width
left between the side insets. The canvas still declares only the top, so nothing
on screen moves. New specs cover side and bottom insets in the layout math and
all four in the scaler.

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
the board's bottom edge, above the bottom inset, however tall the screen is) and
an optional `offset` in design units, for piles overlapping down a rail.
`computePileOrigins` places both.

`TableMetrics.rooms` holds how far each pile's cards may reach below its origin,
in design units, from the new `computePileRooms`: down to the board's bottom
edge less its padding, or to a gap above the nearest pile below. A pile below
counts if it shares the column, or if it is bottom-anchored. A row along the
bottom is a floor under the whole board, because a pile in it may spread beyond
its own column; the waste spreading left under column 4 in K-P2 is the case that
needs this.

The loading skeleton counts a bottom-anchored row up from the last row and turns
an offset into grid cells. Nothing on screen changes; no grid uses either yet.

### 1.4 Fitted fans

`pile_layout.ts` gains `FanFit` (face-up floor and cap, face-down floor),
`fitFanDown` and `mirrorPileLayout`, plus the `FanDownLayout`, `SpreadLayout`
and `PileLayoutOverride` names. `fitFanDown` first takes hidden cards' gaps down
towards their floor while face-up gaps would fall below their own. It then
spreads the face-up gaps over what is left, between the floor and the cap. It
always keeps room for the hover expansion, so touching a card never pushes a
column further down than it already reaches.

`TableLayoutSpec` gains `fanFit`, `pileLayouts` (an override per pile id, worked
out from the zone's own arrangement, so a waste keeps its draw count's
`maxVisible` when a grid turns it downward) and `mirrored`. `TableGridSpec` and
`tableLayout` also take `gap` and `padding`, which the phone grids tighten.
`table_layout.ts` imports from `pile_layout.ts` with `import type`, since
`pile_layout.ts` already imports `Size` from it.

`engine/tableau/view/pile_arrangement.ts` has `pileArrangement`: the zone's
arrangement, then the grid's override, then the mirror, then the fit to the
pile's room. The view builder's card offsets, the held stack's gap and
`resolveDragTarget`'s drop rectangles all go through it, so a drop lands where
its highlight showed on a fitted column too. No grid sets any of this yet.

### 1.5 Board layouts and the chooser

`engine/render/layout/form_factor.ts` has `FormFactor` (`roomy`,
`phone-portrait`, `phone-landscape`) and `formFactorOf(viewport)`, and is now
where `COMPACT_MAX_WIDTH_CSS_PX` lives, beside the new
`COMPACT_MAX_HEIGHT_CSS_PX` (500). A square compact screen reads as upright, as
CSS's `orientation` does. `compactFor` still tests width alone until step 2.1
switches the engine and the shell together.

`engine/render/layout/board_layouts.ts` has `PhonePilePosition`, `Hand`,
`BoardArrangement` and `DEFAULT_BOARD_ARRANGEMENT` (piles at the bottom, right
hand), plus `PhoneLayouts` (`portrait.bottom`, `portrait.top`, `landscape`) and
`BoardLayouts` (`roomy` and optional `phone`). `mirrorTable` mirrors each slot's
column (fractional ones too), turns its offset around and flips `mirrored`.
Mirrors are cached per grid in a `WeakMap`, because the chooser runs every
frame. `chooseTableLayout` returns the roomy grid for a game without phone
grids, whatever the hand. Otherwise it picks by form factor and pile position
and mirrors for a left hand.

`TablePresentation.boardArrangement()` is new. The settings service answers the
default until step 4.1, and `TestPresentation` has `setBoardArrangement`.
`makeTableBoardScene` takes `layouts` instead of `layout` and measures each
frame on the chosen grid. `BoardScene` takes a `measure` for its art density and
keeps `layout` (the roomy grid) only for sizing before the canvas is measured.
`CatalogEntry.phoneLayouts` is optional, and `makeBoardScene` passes it on.
Scene specs show a game with phone grids lands a drop on its phone grid's
foundation, and on the mirrored one for a left hand. Still no game has phone
grids, so nothing on screen changes.

### 2.1 Phone detection in the shell

`ViewportService` follows two media queries, compact (narrower than 720 or
shorter than 500) and `(orientation: portrait)`, and exposes `formFactor`, the
same three shapes `formFactorOf` gives the board. `isCompact` is now derived
from it. `compactFor` asks `formFactorOf` too, so the board and the chrome
compact together. A sideways phone therefore gets the compact header (the
overflow menu, the icon-only switcher), the board's compact gaps, the
full-screen game browser and, under the Auto card style, the mobile deck. That
answers the mobile deck's open question about Auto on sideways phones. The Auto
description in the drawer now says "on a phone, upright or on its side".

`_breakpoints.scss` gains `$compact-max-height` and three mixins: `compact`,
`phone-portrait` and `phone-landscape`. The compact header height in
`_tokens.scss`, the header's compact rules, the game browser's and the game
preview's full-screen rules move from `below("tablet")` to `compact`, because
their TypeScript halves read `isCompact` and the two must agree.

The fake `matchMedia` in `test/support/ui/viewport.ts` now evaluates
comma-separated queries of `max-width`, `max-height` and `orientation`
conditions, with `setSize` beside `setWidth`. It calls a query's listeners only
when its answer changes, as a browser does.

`boardLayoutsOf(entry)` in `game_catalog.ts` assembles an entry's grids for the
board and for the loading skeleton. The skeleton now draws the grid the screen
and the arrangement call for.

### 2.2 Side rail

On a phone on its side (`phone-landscape`) the header bar turns into a column
`--rail-width` (64px) wide, down the left edge, full height. From the top, the
rail holds the game switcher, the score, time and moves stacked in one strip
(labels for a screen reader only), then undo, new game and the overflow menu.
The menu opens beside the rail, rising from its button at the foot. The header
host is now `display: block`, and positioned against the overlay in this mode.

The game canvas declares all four `--board-inset-*` on its host, so the loading
overlay and the deck badge can read them as well as the board: the top is the
header height, except on a sideways phone, where it is 0 and the left is the
rail width. The overlay pads itself by all four insets, the loading badge
centres on the space inside them, and the deck badge tucks into the top right
corner inside them.

Checked at 844 × 390 in Chrome's phone emulation on today's Klondike grid. The
board now runs the full height beside the rail, with compact gaps and the mobile
deck, and its cards come out about 98 CSS px wide (80 before, under the full
header). The overflow menu opened at the rail's foot, beside it.

### 2.3 Bottom bar

On a phone held upright (`phone-portrait`) the header docks at the bottom of the
screen, keeping its compact contents, with its border on top. The overflow menu
rises from its button at the bar's right end. The canvas declares a bottom inset
of the header height there, and no top inset, so the board starts at the top of
the screen.

Checked at 390 × 844: the bar sits at 784 to 844, the canvas reads insets of 0,
0, 60 and 0, and the menu opens above the bar at the right. Today's Klondike
grid is still drawn, so the empty space now sits between the board and the bar,
until step 3 gives the board its phone grids.

The 2.2 entry first said the sideways cards came out 76 px wide; measured
against the screenshot they are about 98 px (80 under the full header). This
commit corrects it. The log is now wrapped with `prettier --prose-wrap always`,
which reflowed earlier paragraphs.

### 3.1 The phone grid builder

`PHONE_FAN_FIT` in `games/common/pile_layouts.ts`: face-up floor 40, cap 110,
face-down floor 10.

`games/common/phone_layouts.ts` has `phoneLayouts(board)`, which takes a
`PhoneBoard`:

- `columns`: the column pile ids, left to right.
- `row`: `RowPile`s, the other piles and their grid column on a larger screen.
- `rails`: `left` and `right` lists of `RailPile`, top first. A rail pile may
  give a `reach` (how far its cards hang below its top), `spreadsDown`, and
  `overlapped` (the pile below may cover all but its index strip).
- `longestColumn`: hidden and face-up counts the grids keep on screen with every
  fan at its floor.
- optional `pileLayouts` for every phone grid.

It returns the three grids, with phone gaps (4 and 10), padding (6 and 8) and
`PHONE_FAN_FIT`:

- **piles above:** the row where a larger screen has it, the columns under it.
- **piles below:** the columns along the top, and the row mirrored along the
  bottom edge. Each row pile's arrangement is also mirrored, after the board's
  own override, so a waste or a sliver stock spreads inwards.
- **on its side:** the rails in the edge columns, the columns between them from
  the top. A rail stacks its piles down, each a gap below the last. When that
  does not fit, the `overlapped` ones share the room left, never showing less
  than `RAIL_MIN_STEP` (50). A rail that still does not fit raises the grid's
  design height, so the board scales down rather than running a rail off the
  screen. A `spreadsDown` pile's spread is turned to run down.

Each grid's design height keeps the longest column on screen at the floors, with
the hover expansion: under the row upright, or beside the rails on its side. A
row pile on no rail, or on both, throws when the module loads.

`test/games/common/phone_layouts.spec.ts` tests the builder on a made-up board.
The catalog spec now checks that each of an entry's phone grids places every
pile its game deals; that holds vacuously until Klondike and Spider declare
theirs.

### 3.2 Klondike grids

`KLONDIKE_PHONE_LAYOUTS` in `klondike_layout.ts` is a declaration for the
builder. The row and the columns are read off Klondike's own zones with two new
helpers in `phone_layouts.ts`, `pilesInRow` and `pileIdsInRow`, so a pile's
position is still declared once. The foundations go on the left rail,
overlapped, and the stock on the right, with the waste spreading down under it.
The waste's reach allows for a draw of three, whichever the player chose. The
longest column is six hidden cards under twelve face-up ones. The catalog entry
names the grids.

**A leftward spread now ends at its origin.** In the first browser check of
K-P2, the mirrored waste spread left with its top card leftmost. That left each
card under it showing its right edge, where the mobile deck has a suit pip but
no rank. `"left"` now means each card still lies right of the one under it, as
in a rightward spread, but the spread ends at the origin and reaches left of it.
The covered cards show their indices, and the playable card sits in the waste's
own slot, beside the stock. Cards under the spread sit beneath its first card.

Checked at 390 × 844 and 844 × 390. Upright, the columns run along the top, the
foundations sit bottom left, and the waste and stock bottom right, just above
the bar. A column of six hidden and twelve face-up cards, built in the dev
console, fans at the cap (about 27 px a card) with every index readable. On its
side, the foundations stack down the left rail, the stock tops the right rail
with the waste below it, and the same column fits the height at about 46 units a
card. Cards are about 83 px wide. The four empty foundations, overlapped down
the rail, draw their placeholder outlines over one another; filled ones show
each top card's index.

`test/games/klondike/klondike_layout.spec.ts` checks that the long column fits
the room below it on six phone sizes, from 360 × 640 upright to 932 × 380 on its
side, under each arrangement. It also checks where the stock and foundations go,
and that the waste spreads towards the stock upright and down on its side while
keeping the draw's count.
