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
   which `checkPhaserLayout()`'s one ratio, 2×, allows.
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

### 2026-11-14: the deck's `spare` in `@fz/dev/board-page`

`PhaserDeck` gains `spare`, a `DeckSpare`: the attribute that says where
the board's room lies (`room`, such as `data-room`) and the CSS px the room
must spare on the board's narrower side for the deck to show (`least`).
`inspectPhaserDeck()` holds a deck with one to showing exactly there: it
reports a deck that shows none of its zones where the room spares enough,
one that shows (lists any zone, even one it can't read) where it spares too
little, and a board that doesn't say where its room lies. Brick Fuzz Pop's
`tools/check-layout.mjs` gives its deck a spare of `data-room` and 184
(`12 + 172`) and drops its own copy of the check, and `readNamedRects`
with it; its inspection still reads `data-room` for the field's shape,
and leaves a missing one to the deck's inspection, so it is said once.

- **The board's place** is read from its attribute (`drawnAt`), in the
  canvas's frame the room is written in, as Brick Fuzz Pop's own check
  read it, so the comparison is exact and what it says needs no rounding.
- **The spare is held exactly,** within a hundredth of a CSS px, as Brick
  Fuzz Pop's own check held it. `sidePanels()` asks 184 CSS px only at a
  whole pixel ratio (the first commit's review), and `checkPhaserLayout()`
  checks only at 2×, so the check is exact where it runs; `DeckSpare`'s
  doc says a game that rounds is checked only at whole ratios. A band of a
  device pixel and a half was weighed and left out: it would loosen the
  check at every ratio it runs at, for ratios it never runs at.
- **`spare` sits beside `allOrNone`** rather than replacing it, as the plan
  words it, and a deck with a spare is shown all or none whatever
  `allOrNone` says, so the two can't contradict each other. Asteroid
  Breaker's deck, shown always, takes neither.
- **Brick Breaker, in P2,** gives its deck the least its own `sidePanels()`
  call needs, measured from the field `data-field` names: 184 where it
  keeps the gap from the same rectangle it writes there, or 184 and its
  wall (186) where it writes the cells and keeps the gap from the wall.

**Review** (a fresh agent): it found Brick Fuzz Pop's panels held to the
same rule as before, a missing room said once in practice, the function
safe to send into the page, and Asteroid Breaker untouched. Its comments:

1. The spec of the message's rounding passed with the rounding removed,
   as 120.1 − 100.1 is exactly 20 in doubles. Answered by 4, which drops
   the rounding and that spec.
2. No spec pinned "held exactly": every row passed with a tolerance of
   half a CSS px. Fixed: a room sparing 19.98 against 20, with the deck
   shown, is reported.
3. The type took a spare without `allOrNone`, and the reports then
   contradicted each other. Fixed: a spare implies all or none in the
   inspection, the doc says so, and a spec holds it.
4. The board's left edge was rebuilt from the window's frame; reading the
   board's attribute is exact and simpler. Taken: `misplaced()` takes the
   board's rectangle as drawn, and leaves a missing one to the board's
   inspection, which a spec holds.
5. A missing room went unsaid where the deck's attribute was missing too,
   against the doc. Answered in the doc: where the deck's attribute is
   missing, the inspection says that alone, as it did for every other
   problem before. Brick Fuzz Pop's board writes both together.
6. Docs: `checkPhaserLayout()` checks at 2× only, not 1× and 2×;
   `DeckSpare`'s doc said holding exactly caused whole-ratio checking;
   and the layout check's header had a stub line. Fixed.

These correct the change rather than reshape it, so it wasn't reviewed
again.

**Checks:** `@fz/dev`'s lint, typecheck and test (16 files, 547 specs),
and its coverage (`src/board_page.ts` whole but for a branch it had
before); Brick Fuzz Pop's lint and typecheck, which check the layout
script, and its `check:layout` on its build, which holds at every shape and
turn; told a spare of 12, it fails where a small phone on its side spares
132 CSS px and shows no panels, so the check runs. Asteroid Breaker's build
and `check:layout`, its deck shown always, which holds. The root's lint,
typecheck and test, under the lock.

## P2. Brick Breaker's two panels

### 2026-11-14: the board's application on an inner `.play`

Brick Breaker's board held the application role on its host, so anything
laid beside the field, the cards and next the panels, sat inside the
application, where a screen reader hands the keys over rather than
reading. As Brick Fuzz Pop's board does, the role, its tab stop, its
name, its description and the press that takes the focus move onto an
inner `.play` around the canvas and the focus ring; the cards stay beside
it, in the host, read as a page does.

- **Phaser's keyboard target stays the host,** to which keys rise from
  `.play`; a card's button keeps its own through `fzKeepKeys`, as before.
  `boardHostOptions()` is made as the component's fields are, before
  `.play` exists, so the host is also the target it can be given.
- **`focus()`, Resume and Next level focus `.play`,** and a press on the
  board focuses it at once: with the cards outside `.play`, a press on a
  card's button no longer reaches the board's handler, so the old guard
  against taking the focus from inside the board had nothing left to
  guard, and the `DOCUMENT` it read went with it.
- **The focus ring** follows `.play:focus-visible`, as Brick Fuzz Pop's
  does, since `board-focus-ring()` looks at the host's focus.

**Review** (a fresh agent): it found the layout unchanged (`.play` is the
host's box, the host stays the size container that `canvasRoom()`
measures), the focus paths sound and the tools unaffected. Its comments:

1. The docs said keys rise to Phaser from a card's button, which
   `fzKeepKeys` stops. Fixed in the component's doc and both places in
   `AGENTS.md`, which now say the application's keys rise and a card's
   button keeps its own; two ragged paragraphs rewrapped.
2. The spec of the keyboard target checked only the config. Fixed: the
   board's scene spec presses Space on the application and expects the
   ball launched; the config spec keeps its plain name.
3. The app's spec handed `runShownScene()` the application as the
   keyboard target, which is now `.play`, not the board's. Fixed: it hands
   it `app-board`.
4. `board-focus-ring()`'s `:host(:focus-visible)` no longer matches in
   either game with an inner application. Left: changing `@fz/style`'s
   mixin is a library change of its own, which Brick Fuzz Pop would adopt
   in the same commit; noted for the integrator as a follow-up.
5. Nits: the template's comment repeated the stylesheet's, dropped; the
   `web-game-accessibility` skill's line on Brick Fuzz Pop's application
   is brought to Brick Breaker with the panels, in the next commit.

**Checks:** Brick Breaker's lint, typecheck and test (59 files, 2,001
specs, with `sim`), before the review and the board's and app's specs
after; the root's lint, under the lock (33 s).
