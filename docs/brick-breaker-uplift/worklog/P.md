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

### 2026-11-14: `board-panel()` into `@fz/style`'s toolkit

Brick Fuzz Pop's `src/app/panels/_panel.scss` became `@fz/style`'s
`board-panel($compact: false)`, in `src/toolkit/_boards.scss` beside
`board-card()`, and the partial is gone: both panels' stylesheets include
`board-panel` through the game's toolkit, as its other components take
theirs.

- **Brick Fuzz Pop's CSS is the same, byte for byte.** Compiled with Dart
  Sass, the old `_panel.scss` body and `board-panel` give identical CSS
  under each panel's `:host`, its own `grid-template-rows` after it.
- **The compact rule** is an option, as the plan asks, that Brick Fuzz Pop
  doesn't take: with `$compact: true` the panel is a size container of its
  own, named `fz-board-panel`, prefixed as everything the library shares
  is, and a container query on it hides its children past the second,
  not counting its `<h2>` (`:nth-child(n + 3 of :not(h2))`), since the
  plan's parts are the sections under a panel's heading. The query
  measures the content box, so it asks for under 374px: 400px less the
  small card's padding and border. The 400px and the two parts are the
  plan's, written into the rule rather than made parameters, since no
  second user asks for others. Looked at in headless Chrome on a page of
  its own: a panel 399px tall, a heading and three parts, hides the third;
  one 400px tall shows all three.
- **Its heading** is an `<h2>`, unmargined: Brick Fuzz Pop's panels are
  regions named by one, and the plan asks the same of Brick Breaker's.
- The toolkit's spec gains `winning()`, the value each property takes
  over every rule of a selector, the last winning, since a mixin that
  includes `board-card()` writes its own declarations in a second rule
  after the card's nested ones.

**Review** (a fresh agent): it found Brick Fuzz Pop's CSS unchanged, the
`@use` path sound, and Angular's emulated encapsulation scoping the
`@container` rule and its `:nth-child()` as meant. Its comments:

1. The compact rule counted the heading as a part, so a panel with an
   `<h2>` first would keep the heading and one part, where the plan keeps
   two sections. Fixed: `:nth-child(n + 3 of :not(h2))`, which Angular's
   scoping keeps whole (checked with `encapsulateStyle()`), and the docs
   say "past its heading".
2. A container query measures the content box, so `height < 400px`
   compacted panels under 426px. Fixed: `height < 374px`, with why, and
   the spec pins it.
3. The specs would pass with the card's include removed. Fixed: one spec
   holds the whole look the panel takes, every property's winning value,
   and one its `.card-title`; `winning()`'s doc says it reads a rule in an
   at-rule as always applying.
4. Turning on `$compact` makes what is inside the panel size itself from
   the panel, and the panel needs a definite height. Fixed: the doc
   comment says both.
5. Wording: the doc's opening said "beside" twice, and the skill had
   `sidePanels()` place the panel. Fixed.

These correct the change rather than reshape it, so it wasn't reviewed
again.

**Checks:** `@fz/style`'s lint, typecheck and test (13 files, 303 specs),
before the fixes and after, and its coverage; Brick Fuzz Pop's lint
(stylelint among it), typecheck and test (148 files, 6,494 specs), its
build, and its `check:layout`, which holds at every shape and turn (19 s);
the root's lint, typecheck and test, under the lock, before the fixes and
after.
