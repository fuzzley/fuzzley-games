# Foundation placeholders down a phone's rail

This file plans and tracks a placeholder for the foundations that a phone on
its side stacks down a rail, so that empty ones stop reading as a tangle of
rings. It follows from the phone layouts work; see
[Not in this work](phone-board-layouts-log.md#not-in-this-work) there.

**Branch:** `feature/rail-foundation-placeholder`, cut from `main` at `f00d3a5`.

## The problem

Every foundation's placeholder is `card-placeholder-full-border-circle`
(`FOUNDATION_PLACEHOLDER`): a full card outline with a ring of radius 77 across
its middle, drawn at half opacity. On a phone on its side the foundations stack
down a rail, each overlapping the next: Klondike's four down the left rail
about 187 design units apart, Spider's eight down the right one at the floor
of 50 (`RAIL_MIN_STEP`). The placeholders are translucent and share one render
layer, so none hides another. Each ring runs through the strips of the piles
below it, and each outline's bottom edge crosses a strip lower down, so an
empty rail reads as a stack of overlapping circles rather than as piles.

An upright phone is not affected: its foundations sit side by side along the
bottom, a phone gap apart, and nothing overlaps.

## Decisions

1. **Swap the art only where piles overlap.** About twenty games, every larger
   screen and both upright phone grids use the current frame and look right.
   The new art is two new frames, asked for by the sideways phone grid, not a
   redraw of the shared one.
2. **Move the mark to the strip that shows.** The part of an overlapped pile
   that stays visible is its top, down to where the next pile starts, at least
   `RAIL_MIN_STEP` (50) units. So the ring shrinks to a radius of 14 and moves
   to the top edge, centred in the 45 units inside the outline there.
3. **Leave a covered pile's outline open at the bottom.** A pile the next one
   starts within draws its top and sides only; the next pile's top edge closes
   it. The rail then reads as one column of strips, each with its ring, and the
   last pile is a whole card. This follows `card-placeholder`, the tableau's
   outline, which is open at the bottom for the same reason.
4. **The grid says which art a pile shows, per pile.** A grid may carry
   `pileBackgrounds`, beside `pileLayouts`: for each pile, a function from the
   artwork the game asks for to the artwork the grid draws. The game and its
   markers stay unaware of it, and the mirror keeps it.
5. **The rail builder decides, not each game.** `phoneLayouts` sets the override
   for every `overlapped` rail pile, so Klondike, Spider and any later game with
   phone grids get it without declaring anything. It swaps only the foundation
   ring, and passes any other artwork through.

## Design

### The art

Two cells added to `src/engine/render/assets/sprites/card/card_placeholders.svg`
and to `PLACEHOLDERS.names` in `tools/build-card-atlas.mjs`, then cut into every
deck's atlas by `yarn build:atlas`:

| Frame                                     | Outline                           | Mark                         |
| ----------------------------------------- | --------------------------------- | ---------------------------- |
| `card-placeholder-top-circle`             | top and sides, open at the bottom | ring, radius 14, at y = 37.5 |
| `card-placeholder-full-border-top-circle` | the foundation's full outline     | the same ring                |

Both keep the foundation outline's geometry (x 10.5 to 203.5, stroke 5), so
the sides of a rail's piles fall on one line. The open outline's sides run to
the bottom of the frame, so they always reach the next pile's top edge.

### Which pile shows which

Down a rail on a phone on its side, for each pile marked `overlapped` whose
artwork is the foundation ring:

- If the next pile on the rail starts within its card
  (`CARD_RENDER_HEIGHT_PX`), it shows `card-placeholder-top-circle`.
- Otherwise, as the last pile does, it shows
  `card-placeholder-full-border-top-circle`.

| Piece                                                 | Tier             | File                                            |
| ----------------------------------------------------- | ---------------- | ----------------------------------------------- |
| `PileBackgroundOverride`, `pileBackgrounds` on a grid | `engine/render`  | `layout/table_layout.ts`                        |
| Resolving a placeholder's frame for a frame           | `engine/tableau` | `view/pile_backgrounds.ts`                      |
| Drawing it                                            | `engine/tableau` | `view/table_view_builder.ts`                    |
| The two frame names                                   | `games/common`   | `zone_presets.ts`                               |
| Setting the override down a rail                      | `games/common`   | `phone_layouts.ts`                              |
| The art and the tool                                  | assets, tools    | `card_placeholders.svg`, `build-card-atlas.mjs` |

The board makes each placeholder sprite from the artwork the game asks for, as
now, and the first frame's view swaps it, as it already does for a marker.

## The plan

1. **The art.** The two cells in the SVG, their names in the tool, and the
   atlases rebuilt. Their names in `zone_presets.ts`, with the spec that every
   deck's atlas holds them.
2. **A grid's placeholder override.** `pileBackgrounds` on `TableLayoutSpec`
   and `TableGridSpec`, passed through `tableLayout` and kept by `mirrorTable`;
   `pileBackgroundFrame` resolves it and the view builder draws it. Specs.
3. **The rails ask for it.** `phoneLayouts` sets it on the sideways grid for
   overlapped rail piles. Specs against the made-up board, and Klondike's and
   Spider's rails.
4. **Docs and checks.** The `add-solitaire-game` skill, the atlas skill, this
   file. `yarn verify`. Browser check: Klondike and Spider on their side at
   844 × 390, both hands, an empty rail and one partly filled; upright
   unchanged.

## Progress

- [x] 1 The art
- [x] 2 A grid's placeholder override
- [x] 3 The rails ask for it
- [x] 4 Docs and checks

## Log

### 1. The art

Two cells added after the pips, so no existing frame moves in the sheet. At 2x
the first page of every atlas is unchanged byte for byte; the second, which
holds the placeholders, goes from 9 to 11 frames. At 1x every frame is on one
page, which grows from 16 to 17 frames across (3648 to 3876 px wide, inside
the 4096 limit), so every frame there moves and the manifests change with it.

A mock rail composited from the built frames at half opacity, old art beside
new at Klondike's step (187) and Spider's (52), read as intended before any code
used them. The spec that every deck's atlas holds the artwork a game names now
covers every placeholder name in `zone_presets.ts`, not only the stock's, and
sits in its own block.

### 2. A grid's placeholder override

`pileBackgrounds` sits beside `pileLayouts` and works the same way: a function
from the game's artwork, so a marker's artwork passes through it each frame.
`mirrorTable` keeps it without a change, since it spreads the grid. The spec
for the mirror covers that, and `tableLayout` passing it through.

`pileBackgrounds(view)`, which the board makes its sprites from, still reads the
game's artwork only. The first frame's view swaps it before the board shows,
which is how a marker's artwork already reaches the screen.

### 3. The rails ask for it

A pile counts as covered when the next pile on its rail starts less than a
drawn card (`CARD_RENDER_HEIGHT_PX`) below it. The open outline's sides run to
the bottom of the frame, so even a pile only just covered meets the next one's
top edge. Klondike's four foundations come out three covered and the last
closed; Spider's eight, seven and one. The made-up board's two foundations have
room on their rail, so both are closed, with the ring at the top.

### 4. Docs and checks

The `add-solitaire-game` skill says an overlapped foundation swaps its art
without being asked; the atlas skill says how to add a placeholder.

In Chrome's emulation at 844 × 390: Klondike's and Spider's rails show a column
of strips with a small ring each, mirrored to the left edge for a left hand.
With an ace on Klondike's first foundation, the second's ring is under the ace
and its strip shows below it as an empty cell; the two below keep their rings.
At 390 × 844 the foundations along the bottom keep the large ring.

Left as it was: the sides of a rail's placeholders lie over one another at half
opacity, so they are brighter where more of them overlap, most in the middle of
Spider's rail. The old art did the same. Clipping each covered placeholder to
its strip in the renderer would even it out, if it is worth the change to the
view contract.
