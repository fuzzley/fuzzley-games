# Stream P's log: the panels and the cards

Stream P's log for the build of the Brick Breaker uplift, as
`../implementation-plan.md` §7.6 says: each package's commits, what each
review found and how it was answered, the choices made where the plan was
silent, and what was left. Only stream P writes it.

## P1. The panel rule, the panel's look and the check (lift 1)

### 2026-11-14: `sidePanels()` into `@fz/phaser/layout`

Brick Fuzz Pop's panel rule, from `src/view/field/field_metrics.ts`, moved
into `frontend/lib/phaser/src/layout/side_panels.ts`, with its numbers,
`PANEL_GAP_CSS_PX` (12) and `PANEL_WIDTH_CSS_PX` (172 to 320), and
`SidePanels`, the two rectangles. Brick Fuzz Pop's `fieldMetrics()` and
`fieldShape()` call it.

**The signature,** `sidePanels(room, field, pixelRatio)`: the room inside
the canvas's insets and the field, both `PixelRect`s in device pixels, and
the ratio; it returns `SidePanels | null`, in CSS pixels.

- It takes the field's rectangle, not a unit and a count of columns, since
  the two games keep their gap from different edges: Brick Fuzz Pop from
  its cells, its frame lying in the margin outside the room; Brick Breaker,
  in P2, from whatever it chooses, its cells or its 2 px wall, which
  `fitCells()` lays inside the room. The panels are as tall as the
  rectangle and level with it, so Brick Fuzz Pop hands the field from its
  lintel's top to its band's bottom (`framed`, in device pixels), and Brick
  Breaker its field with or without its wall.
- It measures what each side spares from the field's own edges and takes
  the narrower, rather than working out a centered field's spare from the
  room's width. For Brick Fuzz Pop that is the same number: its field
  stands `floor((room - field) / 2)` from the room's left, which is never
  more than the right spares.
- It takes the room and the ratio rather than a `Viewport`, as
  `cssRectOf()` and `framePixels()` take theirs: both games have the room
  already (`roomInside()`), and Brick Fuzz Pop's `fieldShape()` asks it
  with a room it has worked out.
- `fieldShape()`'s `panels`, which `isSameShape()` reads, asks
  `sidePanels()` with the column the cells take at the shape's unit
  (`cellColumn()`), as tall as the room, since whether panels fit doesn't
  hang on the field's height. `fieldMetrics()` takes the cells' x and
  width from the same helper.
- A side must spare 184 CSS px only at a whole pixel ratio. At another, the
  gap and the least round to whole device pixels, so the threshold strays
  from half a device pixel under 184 CSS px to a pixel and a half over (at
  2.625×, 484 device pixels, 184.4 CSS px). That was Brick Fuzz Pop's rule
  already; the docs now say so.

Brick Fuzz Pop's specs pass unchanged, but `field_metrics.spec.ts` takes
`PANEL_GAP_CSS_PX` from `@fz/phaser/layout` now, its one line that moved.
Its layout check's comments name where the numbers live now.

**Review** (a fresh agent): it found Brick Fuzz Pop's panels and
`FieldShape.panels` unchanged for every room, including a room of a
fractional width and a field overrunning its room mid-flight. Its comments:

1. The docs promised 184 CSS px a side, which the spec itself contradicts
   at 2.625×; and two spec titles misdescribed their cases. Fixed: the
   doc comment, `AGENTS.md` and the skill say 184 at a whole ratio and
   how far it strays at another, and the two specs are retitled. The
   deck's check in this package's third commit holds the rule exactly,
   which `checkPhaserLayout()`'s whole ratios (1× and 2×) allow.
2. No spec pinned `room.x` on the right side. Fixed: a spec where the
   right side is the narrower, beside the one where the left is.
3. No spec pinned the rounding of the widest width, or the float
   tolerance on the least; and a room of a fractional width could give a
   fractional panel on the right. Fixed: specs at 1.33× (425.6 rounds to 426) and at 51/43× (the least floats to 204.00000000000003); the spare
   is floored, which changes nothing for Brick Fuzz Pop, whose left side
   is whole and never the wider.
4. Nits: `acrossRoom()` renamed `cellColumn()`, and `fieldMetrics()` takes
   its x and width from it rather than working them out again; the spec
   helper's doc says it returns the field too.

**Checks,** after the fixes: `@fz/phaser`'s lint, typecheck and test (53
files, 736 specs) and its coverage (99.23% statements, 96.08% branches,
`src/layout/` whole); Brick Fuzz Pop's lint, typecheck and test (148 files,
6,494 specs, all three projects); the root's lint, typecheck and test,
under the lock (2 min 57 s before the fixes).
