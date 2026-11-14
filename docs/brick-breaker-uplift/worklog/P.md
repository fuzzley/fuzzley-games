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

### 2026-11-14: the bench and in play beside a wide room's field

The two panels of C9, C10 and C11, as Brick Fuzz Pop's stand: `fieldMetrics()`
lays them with `sidePanels()`, the board stands them over its room, and
`src/app/panels/` holds the bench, `<app-bench>`, on the left, and in play,
`<app-in-play>`, on the right, each a region named by a heading only a
screen reader hears, its parts small labelled sections under it. No stars
yet: P3 adds them.

- **The gap is kept from the wall,** so the panels stand level with it,
  from its top to the field's foot, and look set beside the field rather
  than its cells. `data-field` stays the cells, as the field's checks read
  it, so the deck's spare is measured past them: 12 + 172 + 2 = 186 CSS
  px, which `tools/check-layout.mjs` says and `field_metrics.spec.ts`
  holds at 632 and 631 px wide.
- **The scene hands the shell the whole `FieldMetrics`** through
  `onLayout()`, rather than the field's rectangle, so the board takes the
  panels from the same layout as the field. This changes a line of
  `src/scene/bricks_scene.ts` and its spec, which streams F and L own:
  a signature, not an addition, which a rebase of theirs will meet.
- **Before the scene lays out,** the board lays out its own, from the room
  it measured with the finger's room and the game's height, so the panels
  stand where they will; `data-room` and `data-panels` (`""` where none
  show) wait for the scene's, as Brick Fuzz Pop's do.
- **Pictures settle,** as Brick Fuzz Pop's do: the first bake's at once,
  a later one's after 250 ms of no other (`PICTURES_SETTLE_MS`), since the
  panels read them while they show and each bake of a resize would encode
  every picture again.
- **`GameService`'s signals change on events only:** the streak as a
  brick breaks or the ball meets the paddle, the effects as one starts,
  ends or ticks down a whole second (`showsEffects()`, which makes nothing
  so it can be asked each frame), the rest from the run and the level. The
  level after this one is `levelAfter`, since `nextLevel()` is a method.
  `nextLifeOf()` says null at six lives, so the bench says "6 lives at
  most" rather than a score that brings nothing.
- **What a compact panel keeps:** the bench its level and its lives, in
  play its streak and its effects; the next level, the kinds and the
  capsules drop. How to play has every kind, and the Ready card, in the
  next commit, names a kind new here.
- **The kinds here include the plain brick,** as C9 has level 1's plain
  bricks new there. The new kinds from K1 (cage, plated, key, gate) show
  from the catalog with their pictures as the atlas draws them.
- **Capsules here** are those a gift is pinned to and, where any brick may
  draw from the pool (the level's chance, or a gift with none pinned), the
  level's pool, but for the bad ones at Relaxed, which lets none fall.
- **The ring of an effect** is an SVG circle dashed by its share, stepped
  with the whole seconds, never animated in CSS.
- `web-game-accessibility`'s line on Brick Fuzz Pop's application now
  says the same of Brick Breaker's.

**Review** (a fresh agent): it found the layout, the signals, the
pictures' settling and the check sound, and worked the 1280 × 720 figures
and the 632/631 px threshold by hand. Its comments:

1. The meter's tick lines sat half a label left of their marks, the ×4's
   a whole label short, as the span carried the line and was shifted to
   centre its words. Fixed: a `::before` draws the line at the span's
   middle (its end for the last), so it stands at `--at`; the spec now
   reads each tick's `--at`.
2. The bench's doc said the pips were hidden, which are one picture named
   by the level's place. Fixed.
3. Five lives waiting ran off the plank on a panel under about 186 px
   wide. Fixed: the plank is an inline-size container, and each fuzzball
   is at most 24 px and at least small enough for five and their gaps.
4. Specs that would pass with the code broken: the meter's fill and the
   ticks' places, the next level's bricks' places, and the capsules at a
   speed other than Normal. Fixed: specs for the fill at 12 and past 20,
   each tick's place, each brick's `x`, `y` and opacity on a level with
   bricks in two rows and columns, and the capsules at Relaxed on a pool
   with a narrow paddle in it (which fails with the speed hard-coded, as
   tried).
5. `AGENTS.md`'s "The board holds an application" left out the panels,
   and two lines ran past 80 columns. Fixed.
6. Optional: `takePictures()` copies Brick Fuzz Pop's board; left, as a
   lift into `@fz/phaser/canvas` changes Brick Fuzz Pop too, and is noted
   for the integrator. The board spec's `canvasOf()` only wrapped
   `viewport()`; dropped.

**Checks:** Brick Breaker's lint, typecheck and test (62 files, 2,214
specs, with `sim`), its `dom` and `pure` specs with coverage before the
review (2,013 specs, `app/panels` whole), its build; the root's lint,
under the lock.

### 2026-11-14: the Ready card names a kind new here

C9's other half: the Ready card names each kind of brick the level is the
first to hold, its picture beside "New: Steel brick." and its line, from
`GameService.kindsHere()`, as the level opens (before its first serve,
not again at a serve after a lost ball).

- **On every board, panels or none,** as Brick Fuzz Pop's Ready card does
  and plan.md's "Cards" says: a compact panel drops its kinds, so a card
  shown only where no panels stand would leave a phone on its side with
  the kind nowhere but How to play.
- **Every kind new here, not one:** level 33 brings in the key and the
  gate together.
- **It never covers the ball.** The card stands between the bricks and
  the paddle as before, but a card too tall for that gap rises, its foot
  kept a ball's width above the ball (`--card-foot`), over the bricks'
  lowest rows; it is no wider than the field; and on a small field (the
  card's own small size) the line is left out, the picture and the name
  kept. Seen in a browser at 844 × 390, 568 × 320 and 320 × 568, the last
  two with level 33's two long lines put in its place: on the field, clear
  of the ball. Before, at a unit of 10 the two-line card reached the
  paddle's top, over the ball. The layout check now holds the card's foot
  at every shape (and fails, as tried, with the card dropped as before).
- **Pictures:** the board reads them for the card only where a kind is new,
  so a level that brings none in, on a board without panels, has the
  scene encode nothing until How to play opens; the app's spec of that
  now starts on such a level. Three board specs hold when the scene
  encodes: a new kind on the card, the panels, and neither.
- The testing skill notes the panels' specs and the board spec's roles
  and encoding spy.

**Browser** (headless, port 9204, its own page, closed, the server
stopped): 1280 × 720 and 844 × 390 show both panels, the latter compact
(level and lives; streak and effects); 1000 × 1000 and 390 × 844 show
none; the accessible tree reads each region by its heading and the
level's heading as "Level 1 · Basics Stripes". `/tmp/p2-panels.png` is
1280 × 720 at 2×.

**Review** (a fresh agent): it found the CSS sound (the layer centres the
card on the field's middle, the `min()` only raises it, `--card-foot`
follows a taller field) and the pictures' gate lazy. Its comments:

1. The spec named one kind and never checked the space between the name
   and the line. Fixed: it opens the specs' wide level, where steel and
   gift are both new, and reads each whole line in How to play's order.
2. The new kinds came back at every serve, the card taller over a
   mid-level serve. Fixed: only as the level opens (`outcome` "ready"),
   as the plan's card is "the one a level opens on" and Brick Fuzz Pop's
   is; a spec holds them gone at the next serve after a lost ball (it
   fails without the gate, as tried).
3. The card's rise rested on a browser check. Fixed: the layout check
   reads `--card-foot` and holds the Ready card's foot to it.
4. Nits: `.ready`'s `max-width` now says it repeats `board-card()`'s;
   the picture keeps a brick's room, 2 by 1, even before it comes, so the
   words don't move; the scene's paragraph in `AGENTS.md` names the three
   that ask for the pictures; the board spec's sized scene is one helper,
   at a level, which the encoding specs use too.

**Checks:** Brick Breaker's lint, typecheck and test (62 files, 2,222
specs, with `sim`), its build and `check:layout` (every shape and turn);
the root's lint, under the lock.

## P3. Stars in the shell

### 2026-11-14: before any change

- The branch held the integration tip, d11a2092 (P1, R1, K1, L1, P2, R2,
  L2, F1 and R3).

### 2026-11-14: the board's focus ring on the application inside it

P2's first follow-up. `@fz/style`'s `board-focus-ring($offset)` wrote a
`:host(:focus-visible)` rule, which can't match in Brick Breaker or Brick
Fuzz Pop now that each holds its application on an inner `.play`; each
board wrote its own `.play:focus-visible > .ring` beside it. The mixin
gains `$application`, the selector of the element inside the host that
holds the application: with it, the ring shows while that element has the
focus from the keyboard (`.play:focus-visible .ring`), and the `:host` rule
is left out; without it, as Snake and Asteroid Breaker call it, it writes
what it wrote. Both boards call it with `$application: ".play"` and drop
their own rule.

- **A descendant, not a child:** the ring shows wherever it sits inside the
  application, so a board that wraps it needn't say so; in both boards it
  is a child of `.play`, as before.
- **Brick Fuzz Pop's look is unchanged:** its compiled rule differs only in
  the combinator, and the dead `:host` rule is gone. Seen in headless
  Chrome (port 9204, its own page) at 1280 × 720: Tab onto the board shows
  the ring around the frame in the focus ring's color; Tab on to the bar's
  link leaves it transparent. Brick Breaker's the same, around its wall.
- `lib/style/AGENTS.md` and the `fuzzley-ui` skill's row say what the
  option does; the skill's row stays inside its column, so the table isn't
  padded again.

**Review** (a fresh agent): it found the mixin sound, Snake's and Asteroid
Breaker's CSS unchanged, the dropped `:host` rule dead in both boards, and
Brick Fuzz Pop's ring matching the same element with the same specificity.
Its comments:

1. The new spec packed two `includes()` into an object of booleans, which
   hides the CSS when it fails. Fixed: `toContain()` and `not.toContain()`,
   as the rest of the file reads.
2. In `lib/style/AGENTS.md`, "which also writes" read as if it followed the
   width, and a line ran short. Fixed: two sentences, rewrapped.
3. The mixin's doc put the rule a caller must keep, the ring inside the
   element, last among asides. Fixed: it says it plainly.

**Checks:** `@fz/style`'s lint, typecheck and test (13 files, 304 specs),
before the review and after; Brick Fuzz Pop's lint, typecheck and test
(147 files, 6,489 specs) and Brick Breaker's (67 files, 2,715 specs, with
`sim`); the root's lint, typecheck and test, under the lock (2 min 39 s),
and its lint again after the fixes.

### 2026-11-14: the boards' settling of their pictures, lifted into `@fz/phaser/canvas`

P2's second follow-up. Brick Breaker's board took a bake's pictures as
Brick Fuzz Pop's did, in a copy of its `takePictures()`, its timer and
`PICTURES_SETTLE_MS`. `@fz/phaser/canvas` gains
`src/canvas/settled_pictures.ts`: `settledPictures(hand)`, called as a
board is made, returns what the board hands each bake's pictures to, which
hands them on to `hand`, the first at once and a later one only once no
other has come for `PICTURES_SETTLE_MS` (250), and drops one still waiting
as the board is destroyed. Brick Breaker's board hands them to its own
signal, Brick Fuzz Pop's to its game (`onPictures()`), as each did; their
specs of the wait take `PICTURES_SETTLE_MS` from the library and are
otherwise unchanged.

- **In the canvas entry,** beside `canvasRoom()`, which a board also calls
  as it is made: the pictures themselves are `@fz/phaser/scene`'s
  (`picturesWhenAsked()`), but the shell may import the scene's helpers only
  by type, and what waits on the bakes is the board's, in Angular.
- **A function, not a signal:** the two boards hand the pictures on to
  different places, so the helper takes where, rather than holding them.
- **Generic in what it hands on,** as each game's `Pictures` is its own.
- Its spec, in the library, holds each case on a board of its own: the first at
  once, a later one held a millisecond short of the wait and handed on at it,
  the wait begun again at each bake, a burst handing on only its last, nothing
  handed on once the board is gone, and a refusal outside an injection context.
  `src/canvas/` stays whole.

**Review** (a fresh agent): it found both boards' behaviour unchanged
(Brick Breaker's `askPictures() === null` and the closure's flag are one
test, since nothing sets it back to null), the layering and the idioms
`canvasRoom()`'s, and no reference to the old code left. Its comments:

1. "Waits again at each bake" passed with a throttle that keeps its first
   timer, as it checked only the end. Fixed: two cases, as the boards'
   specs have them: a millisecond short of the wait after the last bake,
   nothing new; at it, only the last of the burst.
2. The refusal outside an injection context checked a bare `toThrow()`,
   which `inject()` throws anyway. Fixed: it expects the error to name
   `settledPictures()`, as `canvasRoom()`'s spec does.
3. The `phaser-core` skill didn't name the helper. Fixed: beside
   `canvasRoom()` in the canvas entry, and where `picturesWhenAsked()` says
   a scene hands its shell new pictures at each bake.
4. Nits: the games' `AGENTS.md` left short lines where the helper's name
   came in; each now names `settledPictures()` alone, in the line the
   constant held, so neither paragraph moves. The library's "as the board
   says" is "to where the board says". This entry said "a frame short",
   which is a millisecond.

**Checks:** `@fz/phaser`'s lint, typecheck, test (59 files, 904 specs) and
coverage (`src/canvas/` whole but for two branches it had before); Brick
Fuzz Pop's lint, typecheck and test (147 files, 6,489 specs); Brick
Breaker's (67 files, 2,715 specs, with `sim`); the root's lint, typecheck
and test, under the lock; after the fixes, the library's spec and lint and
the root's lint again.

### 2026-11-14: the stars kept, and shown on the bench and the Ready and Cleared cards

C6's record in the shell, and three of the places a star shows.

- **`src/app/stats/stars.service.ts`,** `StarsService`, keeps
  `brick-breaker-stars` at version 1 (`STARS_KEY`, `STARS_VERSION` beside
  it, as the stats' and the progress's are), a `storedSignal()` read
  through R3's `starsRecordOf()` with `ProgressService.cleared()`, so a
  level cleared before stars were kept holds its first. `recordWon(id,
won)` adds what `starsWon()` gave through `withStars()` and returns the
  stars the level didn't hold before; `heldBy(id)` names those it holds.
  The shell reads stars by name (`starsIn()`), never by bit. "What It
  Keeps" lists the key.
- **`GameService`** gains `mark` and `starsHeld` (§5.3), and `bestStreak`,
  the field's, copied each frame as the streak is, and `newStars`, the
  stars a level's clearing won that it didn't hold before, for its card,
  forgotten as a new run begins. `keepCleared()` keeps them for a level
  cleared and for the last, which wins the run.
- **`src/app/stars/`,** `<app-stars>`: a list named "Stars", a star a line,
  each with what it asks (`describe.ts`'s new `starAsks()`: "Clear the
  level", "Lose no life", "Reach a streak of 15", the bench's art's words
  in one mood, the third naming the mark). Held, `@fz/ui`'s filled star in
  the warning's gold; not yet won, an outline of it, its words muted, so
  its shape tells it as well as its color; one just won marked New (the
  in-play panel's badge); and beside the streak's star not held, where the
  card gives it, the play's best streak, "best 11", as `art/mechanics.svg`
  draws it. A screen reader hears each star's state in words, "Lose no
  life, won just now", the stars and the marks hidden from it.
- **`@fz/ui`'s icons gain `star-outline`,** the star drawn a ninth smaller
  about its middle, so its outline reaches as far as the filled star does.
  The frontend's rule is that an icon is `<fz-icon>`, never an inline
  `<svg>`, and the icon's styles can't be reached from a component to
  outline the filled one; Brick Fuzz Pop's levels show only the stars won
  for want of it. `@fz/ui` is no stream's, and this is an addition: a name
  in `ICON_NAMES` and a case, which its specs hold to a drawing of its own
  and to an outline.
- **The bench** shows the stars in its first part, under the level's pips,
  so a compact panel, which keeps its first two parts, keeps them and the
  lives, as `art/panels.mjs`'s compact bench does. The plan's list of the
  bench's parts names the stars second, which would have dropped the lives
  from a phone on its side; the art keeps both.
- **The Ready card** names the stars under the level's name as the level
  opens, before its first serve, as it names a kind new here, and not at a
  serve after a lost ball, where the card would only stand taller; on
  every board, panels or none, as the plan's "Cards" says.
- **The Cleared card** shows them over its tally, those just won marked,
  the play's best streak beside the third where it wasn't won.
- **`tools/check-layout.mjs`** holds each panel to holding the parts it
  shows whole, as a panel clips what runs past its foot (tried: told to
  report every panel, it finds both at each shape that shows them).
- The spec level Dare's mark is 10, past the five its blasts make, so it
  clears without its third star; nothing else read its mark.

**Choices where the plan was silent:** stars are kept at any speed, Custom
and the debug menu's scales among them, as decision 5 and C6 say and runs
at those keep their records; the announcer's words come in the next commit.

**Seen in headless Chrome** (port 9204, its own page): at 1280 × 720 the
bench's three stars under its pips and the Ready card's under the level's
name; level 1 played to its clear by steering the paddle under the ball
from the page, the Cleared card shows two stars lit and marked New and the
third an outline with "best 4" (`/tmp/p3-stars.png`, 1280 × 720 at 2×). At
844 × 390 both compact panels keep their first two parts, the stars among
the bench's, and fit; the Ready card rises over the lowest row of bricks,
clear of the ball, and the Cleared card fits the field. At 568 × 320, no
panels, the Ready card of level 33, with its two new kinds, covers most of
the bricks before the first serve but stays on the field; the Cleared card
fits the field with 11 px to spare, so one with a line for double pay
would reach a few pixels over the field's wall, on the board still. Laying
the stars across a card was tried and saves nothing there, as no two fit a
line of so small a card.

**Review** (a fresh agent, on the staged change), four comments:

1. Nothing held the board's bench to the game's stars: binding the bench's
   `stars` or `mark` to a constant passed every spec. Fixed: the board's
   panels block gains a case that keeps Dare's first star, lays the panels
   out and reads the bench's stars, "Reach a streak of 10" naming Dare's
   own mark (tried: with `[stars]="[]"` it fails).
2. `bestStreak` read 0 after a reload until play went on, since `takeUp()`
   lays a new field, which sets it to 0, and only then lays the kept one's
   counts over it, and a run is taken up paused. No card read it there yet,
   but the signal's word is the field's. Fixed: `takeUp()` copies the kept
   field's longest streak, and `SavedGameService`'s spec takes up the
   streak of a level's play (tried: without the line it fails).
3. The specs read what a screen reader hears of a star twice over, and
   found a panel's part by its heading twice. Fixed: `src/testing/heard.ts`
   holds `heardIn()`, `starsHeard()` and `partHeaded()`, which the stars',
   the bench's, the in-play panel's and the board's specs use; AGENTS.md's
   Tests and the testing skill name it.
4. The last level's stars show nowhere new, as a won run goes to its
   result; and a Cleared card with a double-pay line, at 568 × 320, would
   reach past the field's wall, which `check:layout`, looking only at the
   Ready card, can't see. Left: the plan names no stars on the result card,
   and the next commit's announcer says the last level's stars as the run
   is won (`newStars` is set for it), and the Levels dialog shows them. The
   tall Cleared card is a follow-up for the integrator: tightening the
   stars' rows saves about 11 px of the 24 the line adds, so it wants the
   card laid out anew at that size (the stars beside the tally, say), more
   than this package's change; it stays on the board, over the field's
   wall and room, and only there.

**Checks:** Brick Breaker's lint, typecheck and test (69 files, 2,748
tests), `@fz/ui`'s (24 files, 317 tests), the root's lint, typecheck and
test, and `check:layout` at every shape after a build, all pass.

### 2026-11-14: the stars in the Levels dialog, How to play and the announcer

The rest of P3: the last places a star shows, and the words for them.

- **The Levels dialog** gains a line under its first, saying what each
  level's three stars are won for, at any speed, that they open nothing
  (decision 6), and how many every level holds of all there are, "You hold
  7 of 99 stars", the plan's total; each set's count of its levels' stars
  beside its name, "★ 7 of 30", a paragraph after the heading so the set's
  region keeps its name; and under each level's name its three small stars,
  filled in gold where held and outlined where not, as `<app-stars>` draws
  them, with one text alternative for the three, "2 of 3 stars", the words
  Brick Fuzz Pop's tiles use, where Brick Fuzz Pop's draw only the stars
  earned. Every level shows its three, a locked one too, as the plan says
  ("three small stars on each level"), so each tile's name grows by its
  stars: "3 Steel 0 of 3 stars Locked".
- **How to play** says what the stars are won for, that a star won is kept,
  that they open nothing, and where they are counted, after the scoring.
- **The announcer** says the stars a clearing won that the level didn't
  hold before, after the clearing's words or a won run's end, and what
  each was for: "Level 1 cleared! Score 2,100. 2 new stars, for clearing
  the level and losing no life." (`describe.ts`'s `describeStarsWon()`;
  `GameService` says it from `newStars`, so a star held already is not
  said again, and the last level's, which no card shows, are said as the
  run is won).
- The dialog's spec keeps a level cleared as a play does, with its first
  star (`clearLevel()`), since `StarsService` reads the progress only as
  it starts.

**Choices where the plan was silent:** the reasons are said as gerunds
("for losing no life"), where the cards name a star by what it asks
("Lose no life"), as the announcer says what happened and the cards what
to do; the stars are said after the clear and after the end, not before,
so the turning point comes first; the web-game-accessibility skill's rule,
that a run's turning points are announced, already covers a star won, so
it is unchanged, as no role changed.

**Seen in headless Chrome** (port 9204, its own page), with three levels of
Basics cleared and seven stars kept: at 1280 × 720 the dialog's line
reads "You hold 7 of 99 stars", Basics "★ 7 of 30" at the end of its
heading's line, the tiles' stars lit as held (Stripes three, Gifts the
first two, Pyramid the first and third) and three outlines on every other
level, locked ones too; at 844 × 390 and at 360 × 740 the tiles keep two to four columns, the
stars on a line of their own. How to play's paragraph sits after the
scoring.

**Review** (a fresh agent, on the staged change), four comments and a nit:

1. The dialog's line said the second star was "for losing no life on it",
   looser than the rule, which How to play words right, and "for reaching
   its streak" where the dialog shows no mark; How to play left out that
   the streak counts only in a play that clears the level; and "You hold 4
   of 27" had no noun. Fixed: both say "for clearing it, for clearing it
   without losing a life, and for reaching its streak, the mark its Ready
   card names, in a play that clears it", and the total ends "stars". The
   announcer keeps "for losing no life", as it says it at the clearing.
2. The set's count sat a few pixels above its name, as the count lines up
   by its icon's foot. Fixed: the heading's line centres the two, the same
   size of text; seen in headless Chrome, both now span the same pixels.
3. `listed()` repeats the "a, b and c" join Brick Fuzz Pop's
   `platedWords()` makes inline, where the games share `@fz/core`'s word
   helpers. Left for a follow-up: lifting it into `@fz/core/format` with a
   spec, and Brick Fuzz Pop onto it, is a library change of its own, a
   commit and a review more, for six lines; noted for the integrator.
   `words.at(-1) ?? ""`, suggested in its place, has a branch no call can
   take, which the rules' coverage would count.
4. The spec finds a set's count as its heading's next element. Left: the
   count's place beside the name is what the case holds, and the region's
   text can't find it, since a tile's words, "0 of 3 stars", match the
   same text.

Nit: two AGENTS.md entries ran past the file's width. Fixed, rewrapped.

**Checks:** Brick Breaker's lint, typecheck and test (69 files, 2,758
tests), its coverage (`pure` and `dom`, every floor held, the run's rules
whole), the build and `check:layout` at every shape, and the root's lint,
all pass.

## P4. The follow-ups P3 and L3 left

The integrator's package, not in the implementation plan's §6: the Cleared
card on a small board, one "a, b and c" in `@fz/core/format`, and the focus
ring and the placeholder at the rim's width.

### 2026-11-14: before any change

- The branch held the integration tip, 98d22048 (P1 to P3, R1 to R3, K1,
  K2, L1 to L5, F1 and F3a).

### 2026-11-14: the Cleared card fits a short field

Measured first, in headless Chrome on the dev server (port 9204, its own
page), over a run kept on Fuse that clears with every star new and a line
for double pay: at 568 × 320 the card, set small there, stood 299 CSS px
tall over a field of 285, 7 px past it above and below; at 320 × 480,
where the board is no small one and the card takes its full size, 356 px
over a field of 330, 13 px past it each way; at 844 × 390, 356 px over 360,
2 px to spare.

- **Over a field under 380 CSS px tall** (`FULL_CLEARED_CARD_FIELD_CSS_PX`,
  the full card's 356 and room to spare), the board's `shortField` sets the
  Cleared card smaller (`board-card-small`, as a small board's cards are),
  its tally's lines closer, and hands `<app-stars>` `across`: the three
  stars side by side, each a little larger over its mark (New, or the best
  streak), what each asks visually hidden, so a screen reader still hears
  "Clear the level, won just now". The card is then 262 px tall: 34 px to
  spare each way at 320 × 480, 49 at 844 × 390 and 12 at 568 × 320, and
  4 over a field at the least unit the layout allows, 9 CSS px.
- **The board decides from where the field lies** (`laid ?? placeholder`),
  not a container query: the field's height is the scene's metrics', which
  the board holds, where a query on the board's size would only guess at
  it from the room, the finger's room and the rounding of the unit.
- **The stars lie across, rather than losing their words to a line,** as
  the Ready card drops its kind's line on a small field: on so narrow a card
  a star's words take a line each with or without the rest, and three
  stars side by side, each over its New, take one line and a mark's height.
- **The layout check holds it.** `tools/check-layout.mjs` opens the game
  again at each shape, at 2×, over a run it keeps (`CLEARING_RUN`): Fuse,
  level 13, its tough row broken at double pay (`keptRun()`'s new `pay`)
  and the blast brick in the middle of its fuse broken, its fuse lit. A
  script before the page's own (`keepRunAndGoOn()`) keeps the run and
  presses its Paused card's Resume once the field is drawn; the fuse burns
  along the row and clears the level with the ball still on the paddle, so
  no steering or timing is needed, and the check waits for the Cleared
  card (`.card.cleared`) before it inspects. The board's own inspection
  then holds the card on the field, and `inspectField()` holds that it
  shows a line for double pay. Tried with the old layout (the threshold set
  to 0): "small phone landscape, the Cleared card: The card over the field
  runs off it.", and the same at the smallest phone; with the new, the
  layout holds at every shape and turn and the Cleared card at each shape,
  in 29 s in all.
- `tools/stored_run.mjs` keeps and stores the runs the two scripts hand a
  page, as Brick Fuzz Pop's does: the saved game's key, `loadScreenshotApi()`,
  `storedRun()` and `CLEARING_RUN`, moved from or beside the screenshots'
  script, which imports them now. `tools/stored_run.spec.ts` holds the run
  to clearing its level, taken up by the rules and stepped with the ball on
  the paddle, with double pay and every star, so a change to Fuse or the
  blasts fails in the specs, not only in Chrome.
- The board's spec lays a level cleared on a board of 504 × 320 (the 568 ×
  320 window's) and of 1280 × 720: the card set small, its stars across and
  still heard, on the first; full, its stars listed, on the second (each
  fails with the threshold at 0 or at 10,000, as tried). The stars' spec
  holds them across where asked, every word still heard.

**Outside this stream's files,** none of them another stream's:
`src/testing/kept_run.ts` and `script_api.ts` gain an optional `pay`, with
a case in `kept_run.spec.ts`, and `script_api.ts` and `screenshot_api.ts`
say both scripts take the API; `tools/capture-screenshots.mjs` takes its
saved game's key and `loadScreenshotApi()` from `stored_run.mjs`, and
`shownRun()` stamps its run through `storedRun()`; its spec takes
`loadScreenshotApi()` from there too.

**Seen in headless Chrome** (port 9204, its own page) over the kept run:
at 568 × 320 and 844 × 390 the card shows three gold stars across, each
over a New badge, then the four lines of the tally with Double pay 13,100,
the score and Next level, inside the field's wall; at 844 × 390 the bench
beside it lists the stars with their words; at 320 × 480 the same card
sits between the field's top and the paddle.

**Review** (a fresh agent, on the staged change): it found the threshold,
the stars across, `pay` and the check's flow sound. Its comments:

1. The layout check took its run's pieces from the screenshots' script,
   and its spec imported the layout script, which then needed an
   `import.meta.main` guard, where Brick Fuzz Pop keeps them in
   `tools/stored_run.mjs`. Fixed: `tools/stored_run.mjs` holds the key,
   `loadScreenshotApi()`, `storedRun()` (handing back the saved run and its
   stored form, as Brick Fuzz Pop's does) and `CLEARING_RUN`; both scripts
   import it, the spec is `tools/stored_run.spec.ts` (with `storedRun()`'s
   two cases), and the guard is gone.
2. Docs behind the code: `inspectField()`'s and `FIELD`'s docs, the script
   API's comments naming only the screenshots, the lists of what `pure`
   runs in `tools/`, and an AGENTS.md line run to 131 columns. Fixed, each;
   AGENTS.md's tools paragraph names `stored_run.mjs`.
3. The script before the page's own stopped watching once the run played,
   so a pause after Resume would wait out the check's ten seconds. Fixed:
   it watches until the level is cleared, pressing Resume whenever it
   shows.
4. Nit: `CLEARED_AT` rebuilds `@fz/dev/layout`'s private `PHASER_SHAPES`.
   Left: exporting it is a library change, with the root's typecheck and
   test, for one line, and the pass names the same public pieces the
   library exports for a check's shapes (`SHAPES`, `SMALLEST`,
   `shapesAt()`).

**Checks:** Brick Breaker's lint, typecheck and test (76 files, 3,221
tests), its build and `check:layout` (every shape and turn, and the Cleared
card at each shape), and the root's lint under the lock, before the review
and again after the fixes.

### 2026-11-14: "a, b and c" in `@fz/core/format`

P3's review's third comment. `@fz/core/format` gains `listed(words)`,
words as a list, as a sentence says one: "a, b and c", the last two joined
by "and", one word as it is and none as nothing, with its spec in the
library (none, one, two and three words). Brick Breaker's announcer, which
kept it in `describe.ts`, Brick Fuzz Pop's `platedWords()`, which joined
the plates' faces inline the same way, and Sudoku's hints, which kept the
same join as `inWords()`, all call it; Brick Fuzz Pop's and Sudoku's specs
pass unchanged, so their words are as they were.

- **The name** is P3's, `listed()`, beside `count()` and `tierWords()`,
  each named for what it hands back.
- **The library's docs:** `lib/core/AGENTS.md`'s `src/format.ts` entry,
  its `package.json` description and the games' list of its helpers in
  `frontend/games/AGENTS.md`, which repeats it, and the `fuzzley-ui` skill
  (the paragraph of what `@fz/core` holds besides its row, and a row in the
  table of what to reach for, inside its columns, so the table isn't
  padded again).
- **Outside this stream's files,** none of them another stream's: Brick
  Fuzz Pop's `src/rules/run/describe.ts` and Sudoku's `src/rules/describe.ts`,
  each now calling `listed()`.

**Review** (a fresh agent, on the staged change): it found `listed()`
Brick Breaker's own function line for line and Brick Fuzz Pop's words the
same for every input, its plates' empty case included. Its comments:

1. Sudoku's `inWords()` was a third copy of the same join, which the
   games' rule, to share `@fz/core`'s helpers rather than keep copies,
   would have left behind. Fixed: Sudoku's hints call `listed()`, its
   `inWords()` is gone, and its specs, which name one, two and three notes
   and lines, pass unchanged; `lib/core/AGENTS.md` names it among the
   callers.
2. `frontend/games/AGENTS.md`'s list of `@fz/core`'s helpers, which repeats
   the package's description, didn't gain "words in a list". Fixed, the
   paragraph rewrapped.
3. Optional: `words.slice(-1).join("")` builds an array to read one word.
   Taken: `words.at(-1) ?? ""`, as Sudoku's was, whose `?? ""` the
   library's spec of no words reaches, so its branches stay covered.

**Checks:** `@fz/core`'s lint, typecheck and coverage (373 tests, every
line, branch and function covered); Brick Fuzz Pop's lint, typecheck and
test (147 files, 6,489 tests); Brick Breaker's (76 files, 3,221 tests);
after the review, Sudoku's (29 files, 595 tests) and the library's again;
the root's lint, typecheck and test under the lock, before the review and
after (2 min 41 s).

### 2026-11-14: the placeholder and the focus ring at the rim's width

L3's follow-up for this stream. The scene draws the rim round the field
wider than the layout's wall where the unit allows (`rimWidth()`, in
`src/view/field/rim.ts`), round at its outer corners; the placeholder drew
a 2 CSS px wall, square, and the focus ring lay 2 px out from the field,
over the rim.

- **The board works the rim out in TypeScript** (`rim`), from the scene's
  metrics or, until it has drawn, its own (`fieldAt`, which the panels,
  the backdrop and the Cleared card's `shortField` read too): `rimWidth()` over the pixel ratio, in CSS px, and its outer corners'
  radius, `RIM.corner` times that, which it hands the stylesheet as
  `--rim-width` and `--rim-corner`, unitless as `--finger-room` is; the
  wall's 2 px, square, until it is measured. The rim's rule stays in one
  place, where the scene reads it.
- **The placeholder draws the rim as the shadow of a box over the field,
  clipped at the field's foot** (`.field::before`, its `box-shadow`
  `--rim` wide, its `clip-path: inset(...)` round at `--rim-radius`), not
  as a border: a border as wide would round the field's own corners where
  its radius passes the border's width, and its sides would run a mitre's
  triangle below the foot, where the scene draws nothing. So the field
  keeps its square corners and the rim its round ones, at its feet too, as
  the scene draws them; the lip, the gutter and
  the net it leaves to the scene. The layout check still holds the field
  inside it where the scene drew it, to the pixel (its wall, the border it
  reads, is now none).
- **The focus ring** takes `--rim` for `board-focus-ring()`'s offset, so it
  lies outside the rim by the focus ring's own offset. At its widest the
  rim is 8 CSS px past the field's edge (the wall and half the panels'
  12 px gap), so the ring, 5 px past that, stops a px short of a panel.
  Brick Fuzz Pop and the mixin are as they were: it already takes an
  offset.
- The board's spec holds `--rim-width` and `--rim-corner` to `rimWidth()`
  of the field the board will lay out at 2×, in CSS px (it fails with the
  ratio left out, as tried), `--rim-width` to the rim of the field the
  scene laid out (it fails with the scene's metrics left out), and neither
  set before the board is measured, so the stylesheet's wall stands.

**Seen in headless Chrome** (port 9204, its own page): at 1280 × 720 at 2×
the rim is 6 CSS px and the ring, from the keyboard's Tab, lies outside it
with its 2 px gap, a few px clear of each panel; with the canvas hidden
and the placeholder shown in its place, the rim's width and its round
corners, top and feet, match the scene's to the pixel, the scene's lip and
gutter aside. At 844 × 390 the rim is 3.5 px and the same holds, the ring
6 px clear of the bench.

**Review** (a fresh agent, on the staged change): it found the clip's
geometry the scene's `fillRoundedRect()`, the ratio and the defaults right,
and the ring a px or more clear of the panels at whole and fractional
ratios. Its comments:

1. The clip cut the field's own feet: the shadow was the field's, so the
   clip, round at the rim's radius, clipped the field too, under a CSS px
   tall and some 4 px along at each foot of the 6 px rim at 1280 × 720,
   against the comment's and this log's square corners. Fixed: the shadow and its clip are a `::before` box's
   over the field, which clip only the shadow; seen again in headless
   Chrome, the field's feet square and the rim's round.
2. The spec held only the board's own metrics. Fixed: two more cases, the
   rim of the field the scene laid out (with the scene it loads), and none
   handed before the board is measured; the first named for what it holds,
   the rim handed the stylesheet.
3. `this.laid() ?? this.placeholder()` was written out four times. Fixed:
   `fieldAt`, documented once, which the four read.
4. Nit: a line of the workspace's `AGENTS.md` ran to 91 columns. Fixed,
   the lines after it rewrapped.

**Checks:** Brick Breaker's lint, typecheck and test (76 files, 3,224
tests), its coverage over `pure` and `dom` (every floor held; this
package's last change to the rules, the previous commit's, whole), its
build and `check:layout` (every shape and turn, and the Cleared card at
each shape), and the root's lint under the lock, before the review and
after the fixes.
