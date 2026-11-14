# Stream L's log: the look

Stream L's work log, as `../implementation-plan.md` §7.6 says: each
package's commits, what each review found and how it was answered, the
choices made where the plan was silent, the figures measured and what was
left. Only stream L writes it.

## L1. The slab and the marks, lifted (lift 2)

### How Brick Fuzz Pop's look was held still

Brick Fuzz Pop's specs compare most commands exactly (`toEqual` on numbers
such as `0.26 * 62`), so the lifted code computes every number as Brick Fuzz
Pop's did, in the same order: a mark is laid out at shares of the area it is
handed (`area.x + share * area.width`), never about a middle it worked out
first, which would move a point by a rounding.

Beside the specs, a spec of the moment's own, never committed, hashed every
frame `atlasFrames()` draws, in each of the four palettes, at every unit
from 1 to 140 device pixels and each of the specs' six pixel ratios (235,200
frames, 67 s), before the lift and after each commit. The hashes are of the
frames' JSON, so a number that moves by a rounding shows.

### 2026-11-14: the geometry into `@fz/phaser/shapes`

`feat(phaser): lift the geometry brick fuzz pop's art draws with into shapes` (commit 1 of L1).

- `@fz/phaser/shapes` gains what Brick Fuzz Pop's `symbols.ts` drew with and
  Brick Breaker's art will: `pointAt()` (`within()` now places each point
  through it), `crispEdge()` and `crispOutline()` and `diamond()` in
  `areas.ts`, `bandAlong()` in a new `bands.ts`, `diePips()` and the new
  `pipRow()` in a new `pips.ts`, and `turned()` in `transforms.ts`. Each has
  its specs, `crispEdge()`'s and `crispOutline()`'s at a square and at an
  area twice as wide as tall.
- Brick Fuzz Pop's `symbols.ts` gives up its copies and re-exports the
  library's under the names its kinds and specs take, so no kind's import
  and no spec changes. What is its own stays: `detailed()`, `cellOf()`,
  `cellFrame()`, `boltMark()`, `CRACK_WIDTH`, `EIGHTH`, `ACROSS` and `DOWN`.
- The library's `AGENTS.md`, the `phaser-core` skill and the `fuzzley-ui`
  skill's table name the new pieces.

Choices:

- `pointAt()` is lifted too, though the plan's list leaves it out: the marks
  (commit 3) place single points at shares of their area, and Brick Fuzz
  Pop's kinds take it by the dozen. `crispEdge()` goes with `crispOutline()`,
  as Brick Fuzz Pop's zapper draws its frame about one.
- `EIGHTH` stays Brick Fuzz Pop's: it is `Math.SQRT1_2` under a name, and
  `Math.sin(Math.PI / 4)` is not the same double, so a mark that turns by
  degrees could not stand in for it anyway.
- `pipRow()` refuses a count that isn't a whole number from 0, as
  `diePips()` refuses one no die shows.
- `bandAlong()` now refuses a point where the one before it is and a corner
  that turns all the way back, each of which gave a polygon of NaN that drew
  nothing. Brick Fuzz Pop draws neither, as the hashes show.

The review, and the answers:

1. The pips' specs had their middle on the diagonal, so `x` and `y` swapped
   would pass. Fixed: the middle is (50, 30).
2. `bandAlong()` gave NaN for a repeated point or a corner turning all the
   way back, silently, now that it is a library's export. Fixed: both
   throw a `RangeError`, in its `@throws` and with a spec each.
3. `pipRow()` repeats Brick Breaker's private `pips()`, and the log said
   nothing of what was left. Left for L2, which redraws `brick_art.ts` in
   the slab and takes `pipRow()` there; L1 leaves Brick Breaker's art as it
   is, as the package says. Brick Fuzz Pop's `symbols.spec.ts` keeps its
   specs of the lifted functions, now run through the re-export, as its
   specs don't change.
4. Doc points, all taken: `crispEdge()` and `crispOutline()` say the band is
   a whole number of pixels wide and sit after `edgeRing()`, which stays
   beside its one caller; the `fuzzley-ui` row describes `dashes()` again;
   `transforms.ts`'s header wraps at 80 and says it turns a point; this log
   no longer claims `pointAt()` is specified at two shapes.

Left: Brick Breaker's `pips()` gives way to `pipRow()` in L2.

Checks: `@fz/phaser` lint, typecheck, tests (54 files, 758); Brick Fuzz
Pop's lint, typecheck, tests (149 files, 6,495, with `sim`); the root's
lint, typecheck and tests under the lock; the art's hashes unchanged
(235,200 frames, none differing).

### 2026-11-14: the bricks entry and its slab

`feat(phaser): add the bricks entry with the slab a brick stands on, and
draw brick fuzz pop's tiles on it` (commit 2 of L1).

- A new pure entry, `@fz/phaser/bricks` (`src/bricks/`): `SlabShares`,
  `TILE_SLAB` (Brick Fuzz Pop's tile) and `BRICK_SLAB` (the uplift kit's
  brick: gap .04, corner .16, strip .07, lip .09, lip shade .24, strip light
  .22, each of the short side), `slabBody()`, `slabRadius()`,
  `slabCommands()`, `topCap()` and `showsDetail()`. Its specs hold each at a
  square tile's cell and at a cell of 200 by 100, where `BRICK_SLAB` gives
  the kit's slab to the pixel: its body 4 in, 192 by 92, 16 round, its lip 9
  and its strip 7.
- Brick Fuzz Pop's `tileBody()`, `tileRadius()` and `tileCommands()` are
  the slab in `TILE_SLAB`, its moss cap's outline is `topCap()`, and its
  `detailed()` is `showsDetail()` of a tile a unit wide.
- The fences: `@fz/phaser/bricks` joins `PURE_PHASER_ENTRIES`, with its
  spec; the library's `eslint.config.js` gives the entry a block of its own,
  which lets in only `../shapes`, `../color` and `../fuzzball`, each by its
  index (tried on a throwaway file: `../layout`, `../shapes/areas` and
  `phaser` refused, `../color` let in).
- Docs: the library's `AGENTS.md` (the entry, and the pure entries' rule),
  the `phaser-core` skill, a row of the `fuzzley-ui` skill's table, Brick
  Fuzz Pop's art paragraph, and the view's row of the layers' table in Brick
  Breaker's, Brick Fuzz Pop's, Snake's and Asteroid Breaker's `AGENTS.md`.

Choices:

- `showsDetail(scale, unitsWide)` takes how many field units wide the
  brick is,
  not its width in device pixels: Brick Fuzz Pop's rule reads the unit
  before its cell is rounded to whole pixels, so a cell's width would move
  it at units such as 59.6 at 2 to a CSS pixel. A tile is 1 wide and Brick
  Breaker's brick 2, so its "under 30 px wide" is 15 CSS pixels a unit, as
  L2 asks. Both games take 30 CSS pixels, so the least is the entry's own
  number rather than a parameter.
- `topCap()` is not what the strip is cut from, though the plan says so:
  the strip's lower edge is the corners' arcs moved down, which no foot
  gives, and drawing it from `topCap()` would move its points by a
  rounding. The two share the corners' middles (`topCorners()`, private).
- The plan names only Brick Breaker's and Brick Fuzz Pop's tables of
  layers, but Snake's and Asteroid Breaker's list the same fence's entries,
  which now let the bricks in too, so all four gained it, to stay true.
  None of the other session's changes to Brick Fuzz Pop's `AGENTS.md` lies
  near the table or the art paragraph (it changes one paragraph about How
  to play's pictures), so the reflowed table won't collide.
- The docs say Brick Fuzz Pop draws through the entry and `BRICK_SLAB` is a
  brick "as Brick Breaker's uplift's art kit draws one", since Brick
  Breaker adopts it only in L2, which then says both games do.

The review, and the answers:

1. The specs didn't pin the strip's shape: a solid cap from `topCap()` in
   its place kept its color, its extent and its symmetry. Fixed: a spec at
   each shape holds every point of the strip on its corners' arcs or the
   same arcs moved down, and the points between the corners at its top and
   at its depth only. The solid cap, tried in its place, now fails it.
2. The docs said both brick games draw through the entry, while Brick
   Breaker doesn't yet. Fixed in `slab.ts`, the library's `AGENTS.md`, the
   `phaser-core` skill and the fence's comment; `topCap()` no longer
   speaks of a ghost's sheet, which nothing cuts yet.
3. `slabBody()` gave a cell narrower than a pixel a body larger than
   itself. Fixed: it insets by nothing at least, with a spec of a cell of
   no size. No game makes such a cell, so nothing drawn moves.
4. `wide` was a vague name and `detailed()`'s doc repeated the 30. Fixed:
   `unitsWide`, and the doc names `showsDetail()`'s rule.

Checks: `@fz/phaser` lint, typecheck, tests (55 files, 788) and coverage
(the new files whole); `@fz/dev` lint, typecheck, tests (535); Brick Fuzz
Pop's lint, typecheck, tests (149 files, 6,495); Brick Breaker's lint; the
root's lint, typecheck and tests under the lock; the art's hashes unchanged
(235,200 frames).

### 2026-11-14: the marks

`feat(phaser): add the marks a brick game draws over a slab, and draw brick
fuzz pop's kinds with them` (commit 3 of L1).

- `@fz/phaser/bricks` gains `marks.ts`. In a square it is handed, at Brick
  Fuzz Pop's shares of its tile, its lines' widths too, each a CSS pixel at
  least at a pixel ratio handed in, refusing an area that isn't square:
  `bombMark()` (body, neck, fuse, shine and spark), `sproutMark()`,
  `sheen()`, `portalMark()` (with its `PortalBadge`, a dot or a hollow
  diamond) and `bumperMark()` (its ticks toward the corners, or the way a
  game gives). Laid out across a brick by places and sizes handed in:
  `scallopedCap()`, `rivets()`, `cagedFriend()`, `cageBars()` and
  `plateTeeth()`. Its specs hold each at a square tile's cell and at a cell
  twice as wide as tall, a square mark drawn in the wide cell's middle
  square as in the tile, moved, and in a square twice as large, reaching
  past a brick's top and foot, as in one half as large, scaled.
- Brick Fuzz Pop's `bomb.ts`, `moss.ts`, `steel.ts`, `portal.ts`,
  `bumper.ts`, `cage.ts` and `plated.ts` draw through them, keeping what is
  their own: the bomb's dots, the moss's numbers, the steel's frame and
  rivets' places, the cage's inside, bars' places and crack, and the
  plates' turned layout, gaps and cuts.
- Docs: the library's `AGENTS.md`, the `phaser-core` skill, the
  `fuzzley-ui` skill's row, and Brick Fuzz Pop's art paragraph.

Choices, where the plan's list met the code:

- **A mark that stands in a square takes the square, not a middle and a
  size.** Brick Fuzz Pop's specs compare its points exactly, so a mark puts
  them at `area.x + share * area.width` as its kinds did; worked out about a
  middle, they would move by a rounding. A wide brick picks the square: the
  kit's portal is the tile's at a square 1.11 of its height (its ring .40
  where the tile's is .36), its bumper at 1.08 (.40 against .37), its bomb
  at about 1.18, and its sprout at about 1.26, its foot at 0.3 of the square
  down. Those are L2's and L7's to set, with the kit beside them.
- **The inks are handed in; the mixes both games share are the marks'
  own.** The sheen is half white over the steel and the bumper's shadow and
  cap are 28% black and 52% white over its disc in both, so `sheen()` and
  `bumperMark()` take the steel and the disc and mix them. The kit's steel
  marks in `mix(steel, black, .34)` against Brick Fuzz Pop's `mark` are
  inks, handed in.
- **No dots in `bombMark()`.** Brick Fuzz Pop's seven dots point at the
  bricks around a square tile and the kit's six at those around a wide
  brick: each game's grid, so each places its own.
- **`rivets()` is a grid of shares**, a rivet at each share across on each
  share down, rather than an inset from a frame's corners: Brick Fuzz Pop's
  right rivets are `0.74 * 62`, which `62 - 0.26 * 62` is not, to the last
  digit. Its four rivets and the kit's (.13 and .87 across, .24 and .67
  down) and the kit's plate's two all fit it.
- **`cageMark()` became `cagedFriend()` and `cageBars()`.** Brick Fuzz Pop
  bakes a cage as two frames, its friend in each ink under its bars whole or
  hit, so one mark couldn't draw both. The bars take their count as the
  places of those left of the middle, mirrored, since Brick Fuzz Pop's four
  stand wider apart about the middle than at the sides and the kit's six
  evenly; the bar a hit breaks is the first right of the middle in both.
  The inside is a rounded rectangle, and the crack a `bandAlong()`, each
  game's own.
- **`plateMark()` became `plateTeeth()`.** Brick Fuzz Pop turns each plate
  to its face, cuts its teeth where the next plate's gap begins, runs its
  bar on under it and leaves out the rivets past it, none of which a mark's
  commands could carry without bending to it. What both draw alike is the
  row of teeth, so that is what is shared: Brick Fuzz Pop turns and cuts
  them, and a plate along a wide brick's foot draws them as they are, with
  its bar, a `roundRect()`, over them and its `rivets()` over that. The
  kit's lighter band along the bar is Brick Breaker's to add.
- **Two drifts left as they are**, for L2 and L7 to weigh: the kit's
  second portal badge is a solid diamond, the mark's hollow, which Brick
  Fuzz Pop chose so the two pairs differ in shape at the least units, and
  which Brick Breaker gains as much from; and the kit's sheen fits a square
  about 1.22 of its brick's height by its first stroke, where its second
  lies some 4 kit units further up and to the right along itself than
  `sheen()` puts it, and both are 5 wide against the mark's 5.6. (The
  bumper's ticks, 35° from across in the kit and 45° in Brick Fuzz Pop,
  became a parameter in review, below.)

No browser check: nothing a player sees changed. Brick Breaker's art is as
it was, and every frame of Brick Fuzz Pop's atlas hashes as it did.

Left for L2 and the art packages: Brick Breaker draws nothing through the
entry yet. L2 takes the slab (`BRICK_SLAB`), `pipRow()`, `bandAlong()` for
its three cracks, `crispOutline()`, `rivets()` and `sheen()` for steel,
`bombMark()`, `scallopedCap()` and `sproutMark()`, and `topCap()` for the
shown ghost's sheet; L6 `cagedFriend()`, `cageBars()` and `plateTeeth()`;
L7 `portalMark()` and `bumperMark()`, its ticks at
`turned({ x: 1, y: 0 }, 35)`.

The review, and the answers:

1. The marks' lines were a fixed number of field units wide while all else
   grew with the square, so the kit's squares, 1.08 to 1.26 of a brick's
   height, would have drawn its lines 7–20% thin. Fixed: each line of a
   square mark is a share of its square (`widthIn()`, private: `widthOf()`
   with the square's side for the unit, so a CSS pixel at least at the
   scale's ratio), and the docs say so. The scale then gave only the ratio,
   so the marks now take the ratio (second review, 2). Brick Fuzz Pop's
   cell is `round(unit)` and its unit whole device pixels
   (`FieldShape.unit`), so its frames hash as they did.
2. The specs' square tile and unit were both 62, so a mark reading one for
   the other passed. Fixed: each square mark, drawn at a unit of 62 in a
   square of 2000 reaching past a brick's top and foot, must be itself in a
   square of 1000, scaled by two and moved, its lines twice as wide.
   Squares of 1000 and 2000 rather than 62 and 69, since only there is
   every line's share a whole number of pixels, which a resize keeps.
   Tried: reading the unit for the bomb's radius fails it, and so do
   widths in field units.
3. The bumper's ticks were fixed at 45° though the kit kicks them at 35°.
   Fixed: `bumperMark()` takes the way the bottom right tick kicks out, a
   point a unit from the origin, which the other three mirror, toward the
   corner unless given. A point rather than degrees, since `turned()` by
   45° gives a sine a last digit off `Math.SQRT1_2`, which would move
   Brick Fuzz Pop's ticks by a rounding. With a spec at 35°.
4. Thin specs. Fixed: the bomb's neck (its middle, its side 0.14 rising to
   the right, its end 0.1), its fuse's points and its shine's arc; the
   sprout's leaves' middles, reach and turn; and every line's width in a
   square of 1000, where each share is whole (fuse 36, shine 34, stem 34,
   sheen 46, arms 44, ring 100, ticks 50, bumper's ring 75, the diamond's
   band 35).
5. The leaves' why was lost in the move. Fixed: `LEAVES` keeps it (a
   device pixel under Brick Fuzz Pop's tile's top at every scale), and
   `STEM` says its top is as much lower as its leaves.
6. Two skills were wrong. Fixed: the `phaser-core` skill and the library's
   `AGENTS.md` say a wider brick's square is "as large as the mark, which
   may reach past the brick's edges", not picked inside it; the
   `fuzzley-ui` row names `slabBody()`, `slabRadius()`, `topCap()` and
   `showsDetail()` again.
7. Nits. `PortalInks.badge` is `disc`, as `BumperInks` has it, and Brick
   Fuzz Pop's `portal.ts` with it. `cageBars()`'s doc says its bars lie on
   whole pixels where the area's edges and the width are whole. The
   `@throws` of `scallopedCap()` names a count that isn't whole. Brick Fuzz
   Pop's own `CageLook` stays, declined: `frames.ts` names its frames in its
   own words, as its `PortalMark` (1 or 2) stands beside `PortalBadge`, and
   the two types meet where `cage.ts` calls `cageBars()`, which fails to
   compile once Brick Fuzz Pop has a look the library doesn't draw.

The answers reshaped the marks' widths, so a second review read the change
again, and its answers:

1. No library spec reached the CSS pixel's floor: the diamond's band "at
   the least" was 0.035 of 62 at 2 to one, which rounds to 2 anyway. Fixed:
   that case is a square of 40 (1.4 rounds to 1, the floor 2), and every
   square mark is drawn in a square of 20 at 3 to one, each line 3 wide.
   Tried: widths without the floor fail 8 specs.
2. The marks took an `ArtScale` whose unit they never read, where every
   other `ArtScale` in the library sets a width by its unit. Fixed: they
   take `pixelRatio: number`, and Brick Fuzz Pop hands them
   `scale.pixelRatio`.
3. Nothing refused an area that isn't square, which the marks would draw
   stretched, the likeliest slip a wide brick makes. Fixed: each square
   mark throws a `RangeError` for one, in its `@throws`, with a spec each.
4. `plateTeeth()` took a count that isn't whole, which `Array.from` cuts
   short while the pitch keeps it. Fixed: it throws for a count that isn't
   a whole number from one, with a spec.
5. The log gave no fit of the kit's sheen. Fixed: added to the drifts
   above, for L2.
6. Nits, all taken: the banner comments are gone from `marks.ts`; Brick
   Fuzz Pop's art paragraph no longer runs past the wrap (its fuzzball
   sentence starts a line, so the diff stays on the lines this commit
   changed); the `phaser-core` skill reads "each at shares of a square it
   is handed".

Checks, after the answers: `@fz/phaser` lint, typecheck, tests (855 in
56 files) and coverage (the entry whole); Brick Fuzz Pop's lint, typecheck,
tests (149 files, 6,495, with the snapshot spec); the root's lint,
typecheck and tests under the lock; the art's hashes unchanged (235,200
frames).

## L2. The fur lifted (lift 3), and the seven kinds in the slab

Started from the integration tip c5b2e82d, after the integrator rebased it
onto `origin/main` (the other session's Brick Fuzz Pop work); the branch was
rebased onto it before Brick Fuzz Pop's `fuzzball_art.ts` was touched.

### How Brick Fuzz Pop's look was held still

As in L1: a spec of the moment's own, never committed, hashed every frame
`atlasFrames()` draws, in each of the four palettes, at every unit from 1
to 140 device pixels and each of the specs' six pixel ratios (235,200
frames, 60 s), before the lift and after it. The baseline was taken again
after the rebase, since the other session's work changed Brick Fuzz Pop.

### 2026-11-14: the combed fur into `@fz/phaser/fuzzball`

`feat(phaser): lift brick fuzz pop's combed fur and its sparks into the
fuzzball entry` (commit 1 of L2).

- `@fz/phaser/fuzzball` gains `src/fuzzball/combing.ts`: `combedStrands()`,
  the fuzzball's fur combed a share of the way to standing on end (0 as it
  grew, 0.5 straight and leaning half way out, 15% longer, 1 on end, 30%
  longer), and `sparkCommands()`, the five sparks about fur on end, `by`
  device pixels to a unit of the grid, in a line's style. Its spec holds
  each root kept, the growth, the bend halved a quarter of the way and gone
  from half way, the lean half way out at 0.5 and straight out at 1, the
  shares it refuses, and each spark's zigzag in its place at a `by` of 2.5.
- Brick Fuzz Pop's `fuzzball_art.ts` draws through them: `FUR` is
  `combedStrands(charge / MOST_CHARGE)` for each charge, and a full charge's
  sparks are `sparkCommands()` in the spark's style over the body, and
  again, the outline's width wider either side and in its color, beneath
  it. Its own `combed()`, `FULL_GROWTH`, `STRAIGHT_BY`, the sparks' turns,
  starts and zigzag, and `SPARKS` are gone (and, after the review,
  `outlinesOf()`).
- Docs: the library's `AGENTS.md`, the `phaser-core` skill and Brick Fuzz
  Pop's art paragraph name the two.

Choices:

- **A share of the way, not a charge.** The comb takes 0 to 1, so Brick
  Fuzz Pop hands it its charge over its most and Brick Breaker, in L3, its
  four looks: flat (0), half (0.5), full (1), and full with
  `sparkCommands()`, as the kit's `ball()` draws them at charges 0, 0.5, 1
  and 1 with sparks. Brick Fuzz Pop's half-combed look, straight from half
  way, and its growth, are the kit's own, so neither is a parameter.
- **No `fur` to comb.** `combedStrands(share)` combs the fuzzball's own
  fur, as both games' looks do; a strand rooted at the body's middle would
  have no way out to comb toward.
- **One style for the sparks and their outline.** A spark's outline was
  Brick Fuzz Pop's `outlinesOf()` over the zigzags, a line along each as
  wide as the spark and the outline's width more either side, which is the
  same commands as `sparkCommands()` in that width and color, so the entry
  needs no outline option, and Brick Fuzz Pop keeps the outlines beneath
  its body and the sparks over it, where its order wants them.
- The spark's width stays each game's (Brick Fuzz Pop's a unit of its grid
  in field units, through `widthOf()`), as the line's width is a game's
  rounding.

The review, and the answers:

1. `sparkCommands()`'s doc opened with two sentences and didn't say how
   much wider an outline is. Fixed: one sentence, then a paragraph saying
   an outline is the sparks again, in the outline's color and its width
   wider either side, as `fuzzballCommands()` widens its body and fur.
2. Brick Fuzz Pop wrote the outline's widening twice, in `outlinesOf()`,
   whose width only the flames now passed, always 0, and inline for the
   sparks. Fixed: one `outlineAlong()`, the style of an outline along a
   part's lines, which both the sparks and the flames take; `outlinesOf()`
   is gone.
3. Nothing held the lean between 0, 0.5 and 1, where Brick Fuzz Pop draws
   charges 1, 2 and 4, so an easing that agreed at the three would pass.
   Fixed: the doc says each way is the two unit ways blended by the share,
   and a spec at 0.25 holds every strand's way to that blend.
4. The older docs still called combing each game's own business. Fixed:
   `fuzzball.ts`'s header and `FuzzballStyle.fur`, the library's
   `AGENTS.md` and the `phaser-core` skill say fur combed by
   `combedStrands()` or a game's own way; the `AGENTS.md` clause on the
   sparks' outline reads with commas.

Checks, after the answers: `@fz/phaser` lint, typecheck, tests (58 files, 893) and coverage (`combing.ts` whole); Brick Fuzz Pop's lint, typecheck,
tests (147 files, 6,489); the root's lint, typecheck and tests under the
lock; the art's hashes unchanged (235,200 frames, none differing), before
and after the answers.

### 2026-11-14: the seven kinds on the slab

`feat(brick-breaker): draw every kind of brick on the slab with the marks
that tell it` (commit 2 of L2).

- `brick_art.ts` draws every kind and state on `@fz/phaser/bricks`' slab
  (`BRICK_SLAB`), one flattened frame a look, as `art/bricks.svg` sections
  A, B and E draw them, every number the kit's in its box of 200 by 100:
  a plain brick's lip and strip; a tough brick's slab in its deeper tint,
  its pips in a row (`pipRow()`, which replaces Brick Breaker's own
  `pips()`), cut out, and up to three cracks, one a hit taken
  (`bandAlong()`, cut along the edge each starts on); steel's frame
  (`crispOutline()`), four rivets (`rivets()`) and sheen (`sheen()`); the
  blast brick's bomb (`bombMark()`) and six dots, Brick Breaker's own; a
  gift's ribbon on whole pixels and a bow of two loops and a knot, each
  outlined inside its edge in the marks' color; a hidden ghost's round
  dashes, a dash in each corner and the rest along each side
  (`dashes()`, `stroke()`), and faint eyes, on no slab; a shown ghost's
  body under its top corners (`topCap()`) to a hem of six scallops, its
  eyes cut out; and a regrowing brick's amber earth under a cap of moss
  (`scallopedCap()`) with a sprout cut out of it (`sproutMark()`). The
  growing back stays as the brick painter draws it, a brick scaled up from
  nothing, as the package's brief asks (see what is left, below). Cage,
  plated, key and gate keep their placeholder tints, on the slab. The
  gift's ribbon and the hidden ghost's dashes reach down to the slab's lip
  through `slabFace()`, new in `@fz/phaser/bricks`: the slab's body above
  its lip, which `slabCommands()` now draws its body as, so a mark and the
  slab agree on where the lip is. Brick Fuzz Pop's atlas hashes as it did
  before L2, all 235,200 frames. A brick under 30 CSS px wide (`showsDetail(scale, BRICK_WIDTH)`)
  leaves out its cracks, rivets and sheen.
- `palette.ts` gains the roles the kit's mixes read: `kindInks` (steel's
  frame and rivets, the bomb's spark, the gift's ribbon, the moss and its
  shadow), `ghostTints` (hidden, faded 35% toward the field; shown, paler
  toward white) and `bricks.regrow`, the amber earth. A tough brick's tint
  moves 12% toward the text (`TOUGH_DEEPEN`), not 25%. `tintAt()` moves
  here from `brick_art.ts`, its one copy.
- `contrast.spec.ts` holds the new bodies (a shown ghost's tints, the
  moss, the regrowing brick's earth) to 3:1 against the field, the outline
  and the marks, as every brick is; steel's frame and rivets to 3:1
  against the steel; the spark to 3:1 against the marks it is lit on; and a
  hidden ghost to 2:1 against the field (`FAINT`).
- The specs: `brick_art.spec.ts` holds every slabbed look on the slab in
  the color its shards take, every line of every brick a CSS pixel wide at
  five scales, pips counted and in their row, cracks counted and left out
  small, steel's frame, four rivets and sheen and only its frame small, the
  blast's six dots and its bomb and spark, the gift's ribbon on whole
  pixels, down to the slab's face, and its bow's loops and knot each
  outlined a CSS pixel inside its edge, about the same middle, and
  mirrored, both ghosts, the moss's nine scallops over nine shadows and
  the sprout, and each kind's `brickColor()`. `art.spec.ts` holds the
  atlas inside 4096 px a side at a unit of 54 at 3 to a CSS pixel (it is
  878 × 1034, 140 frames), and How to play's ghost hidden by its frame's
  name (`ghost-<tint>`). `palette.spec.ts` holds each new role's mix.
  `slab.spec.ts` holds `slabFace()` in three cells, and as the body
  `slabCommands()` draws. `src/testing/art_frames.ts` draws at a unit of
  40 at 2× (a brick 40 CSS px wide, in full detail) rather than 24, and
  gives `SMALL_SCALE`, the old 24, a brick too small for detail, and
  `FIELD_SCALES`, the scales both art specs draw at.
- Docs: the workspace's `AGENTS.md` (`src/view/colors/`, `src/view/art/`,
  its colors, `art_frames.ts`), the `brick-breaker-content` skill (a
  regrowing brick's own colors, a kind's inks, which of them the contrast
  spec holds) and the `brick-breaker-testing` skill (the scales, a hidden
  ghost's 2:1); `frontend/lib/phaser/AGENTS.md` and the `phaser-core`
  skill (`slabFace()`).

Choices, where the plan was silent or the kit fell short:

- **Steel's frame and rivets are the steel at 60% black, not the kit's
  34%.** At 34% they stand 1.9:1 to 2.0:1 from the steel in the four
  palettes; a mark that tells a kind is held to 3:1, as the marks' color
  is, and 60% gives 3.1:1 to 3.7:1. They read a little darker than the
  sheet's.
- **A shown ghost is 12% toward white in a light palette, not 18%.** At 18%
  Soft pastel's violet shown ghost is 2.8:1 against the field; at 12% every
  tint is 3.1:1 or more. Dark palettes keep the kit's 30%.
- **A hidden ghost keeps the kit's faint 35% fade, held to 2:1.** It is
  2.3:1 to 3.0:1 against the field, faint as its kind asks, and the spec
  says so in its comment. The sheen, the ribbon band (1.5:1 against the
  gift in dark palettes), the moss against the earth and the scallops'
  shadows are shading, held to nothing: the gift's bow is outlined in the
  marks' color, which holds 3:1 against the gift.
- **A regrowing brick is one look, untinted,** amber earth under green
  moss, as the kit's `regrow()` takes no tint, so it joins steel, blast and
  gift among the kinds drawn in colors of their own; Finale's one regrowing
  brick no longer takes its picture's tint.
- **The sheen is `sheen()` in a square 1.222 of the brick's height,** set
  so its first stroke runs on the kit's. Its second lies 4.4 of the kit's
  units on along itself, toward the lower left, and both are 5.6 wide
  against the kit's 5: under a CSS pixel at the 38 CSS px a brick is at
  1280 × 720 (0.8 px), so the library's piece is kept rather than a copy.
- **The bomb is `bombMark()` in a square 1.08 of the brick's height,** its
  body at (96, 52) and 21 round against the kit's (96, 50) and 23, as the
  library's bomb, fitted by its body at 1.18, puts its spark 6 units above
  the brick's top, outside its frame; at 1.08 the spark's top is half a
  unit inside it.
- **The sprout is `sproutMark()` in a square 1.2 of the brick's height,**
  its foot at the kit's (100, 34): its leaves 11.4 out (the kit's 11), 9.8
  long (10), its stem 4.1 wide (4).
- **The bow's loops and knot are the kit's shapes, outlined inside their
  edges,** a line of 3 kit units wide, a CSS pixel at least, so nothing
  reaches past the frame at any scale; the kit strokes them about their
  edges, so its bow is 1.5 units larger all round. A loop's inside is the
  loop with each side moved in by the line (`shrunk()`, about the middle of
  the circle inside it).
- **A ghost's dashes run along the body above its lip,** their outer edge
  on it, as the kit's dashed rectangle does; a dash sits in each corner,
  and `dashes()` spaces the rest along each side, a gap clear of the
  corners, rather than the kit's one dash pattern round the whole, so the
  four sides match.
- **Dots and pips are a CSS pixel across at least** (`dotRadius()`), so the
  blast's dots show on a phone.
- `brickColor()` gives a ghost its tint as it stands, faded while hidden
  and pale once shown, for its shards.
- Frames: the shown ghost has its own eight (`ghost-shown-<tint>`) where it
  took the plain brick's; the regrowing brick has one (`regrow`) where it
  had eight.

What I added outside stream L's files: nothing.

Left for later packages:

- **The ring of a brick growing back,** in L2's line of the
  implementation plan and the sheet's section B (`regrowing()`: the place
  a broken regrowing brick has left, a ring filling as its ten seconds
  pass, and a sprout), is not drawn: the package's brief kept the growing
  back as Brick Breaker draws it, and Brick Breaker draws nothing in that
  place until the brick grows back, scaled up from nothing over half a
  second. Drawing it takes the brick painter (`src/scene/painters/`, not
  stream L's) drawing the place with the share of `regrowsAt` gone, and a
  frame for it here; the coordinator should give it to a package.
- `brick_art.ts`'s header cites `docs/brick-breaker-uplift/art/`, which
  Z2's move to `docs/archive/` must follow.
- L6 draws cage, plated, key and gate for real.

Review (a fresh agent), and what I did:

1. _How to play's hidden-ghost spec matched the shown ghost's new frames
   too (`/^ghost-/`)._ Fixed: it holds the hidden frame's name,
   `/^ghost-\d+$/`.
2. _L2's ring of a brick growing back is not drawn and not recorded._
   Recorded under what is left, above, for the coordinator: the brief
   kept the growing back as Brick Breaker draws it, and drawing the ring
   takes the scene's brick painter, outside stream L.
3. _`lipTop()` repeated the slab's private lip, right only while a brick
   is twice as wide as tall, and the gift spec hard-coded 0.09._ Fixed:
   `@fz/phaser/bricks` exports `slabFace()`, which `slabCommands()` draws
   its body as; the gift's ribbon, the hidden ghost's dashes and the gift
   spec take it, and `lipTop()` is gone. Brick Fuzz Pop's atlas hashes
   unchanged.
4. _`shrunk()` and the dashed outline are general geometry, in a game, and
   the gift spec would pass with the inset halved or doubled._ The spec is
   fixed: each loop's ribbon has the circle inside its outline, the same
   middle, a CSS pixel smaller, and the knot's the same, which fails with
   the inset halved (tried). The geometry stays in the game: Brick Breaker
   is its one user, and the plan lifts nothing more in L2.
5. _Doc comments: the bomb's body called the kit's; the header's "every
   number is the kit's"; two first paragraphs of two sentences; the
   content skill asking the contrast spec to hold every ink._ Fixed: the
   bomb's comment gives its (96, 52) against the kit's (96, 50); the header
   says every number is the kit's but where a constant's comment says
   otherwise; the sheen's and bomb's squares open with one sentence (and
   the sheen's drift is 4.4 units, as measured); the skill says the spec
   holds an ink that tells a kind and leaves out one that only shades.
6. _The specs' scales twice; `art.spec.ts`'s width helper skipping
   straight lines; inline types for a cell and a kit's square._ The scales
   are `FIELD_SCALES`, in `art_frames.ts`, for both. Counting straight
   lines in `art.spec.ts` fails every ball's frame at units 10 to 24,
   since a fuzzball's fur tapers to 0.49 px, the ball's look and L3's, so
   its helper says why it skips them and `brick_art.spec.ts` keeps the
   bricks' check. `cellOf()` returns an `Area`, and the kit's squares are a
   `KitSquare`.

The browser, on port 9104: Finale (level 30) at 1280 × 720 at 2× in
Midnight blue and Soft pastel, and at 844 × 390 at 3× (a brick 24 CSS px
wide) in Soft pastel and Casino night; Drawbridge (33) at 1280 × 720 in
Classic felt for the placeholders. Each kind draws as the sheet's section A
and B, a crack shows on a tough brick hit in play, and at 844 × 390 the
steel keeps only its frame and the tough bricks no cracks, as section E's
24 px row shows. `/tmp/l2-bricks-game.png` is Finale at 1280 × 720 in
Midnight blue.

## L3 and L5. The paddle, the capsules, the ball and the field's edge

The integrator folded L5 (the gold lip and the Seeker's symbol) into L3,
since both redraw the capsules and R2, which L5 waited for, had landed.
Started from the integration tip 57b9848b (P1, R1, K1, L1, P2, R2 and L2).
L2's ring of a brick growing back came with it, as the brick painter is
stream L's.

### 2026-11-14: the paddle

`feat(brick-breaker): draw the paddle as the kit does, with velcro hooks
while it catches and cannons while it fires` (commit 1 of L3).

- `src/view/art/paddle_art.ts`, new: the paddle's frames as the kit's
  `paddle()` (`art/scene.mjs`) draws them, every length the kit's, a share
  of its 75 tall: its left end (`PADDLE_FRAMES.end`), its lip's round end
  under its cap with a bolt in the marks' color toward the outer side; a
  laser's cannon, a barrel in the warning color on a base in the lip's;
  and one velcro hook in the text, a stem curled over at its head. Each is
  drawn about the point the scene puts it at (`centered()`), so an image's
  middle is that point. `paddleShape()` says how the parts lie at a scale
  (the paddle's height, its bar and lip in whole device pixels, where the
  body starts over the caps, the pad and the hooks' pitch), and
  `hookCount()` how many hooks stand along a paddle so wide, about its
  middle, `MOST_HOOKS` at most (the kit's along the widest paddle, and one
  more). Where a brick is too small for its finest detail (`showsDetail()`,
  under 15 CSS px a unit) the bolts are left out and the hooks stand twice
  as far apart.
- `paddle_painter.ts` draws it from those frames and three rectangles a
  pixel wide, scaled across, as the body was: the lip between the caps'
  middles, the body over the caps' inner halves and the pad along its top,
  each part placed by a function of its own (`placeBar()`, `placePad()`,
  `placeHooks()`, `placeCannons()`), so F2's dip of the pad has one place
  to go. The right end is the left flipped. A pool of `MOST_HOOKS` images,
  made once, shows as many hooks as fit; the catching paddle's rim is gone.
- `palette.ts` gains `paddleInks`: the lip (the accent at 32% black), the
  caps (the accent toward the text, 45% in a light palette and 60% in a
  dark one), the pad (the accent at 55% white), the hooks (the text) and
  the cannons and their bolts (the warning color). The bolt's frame takes
  the cannons' color, as the kit's bolts are gold.
- `contrast.spec.ts` holds the caps, the hooks and the cannons to 3:1
  against the field, and the outline and the marks (the caps' bolts) to
  3:1 against the caps; the lip and the pad are shading, held to nothing.
  The figures, against the field: caps 7.8 to 11.0, hooks 11.9 to 14.9,
  cannons 5.1 to 9.0, lip 3.6 to 8.4; the pad against the body 1.5 to 3.1.
- Specs: `paddle_art.spec.ts` (the shape at every field scale, the hooks'
  count, cap and spread, each frame's commands, the bolt left out small,
  the hook a CSS pixel wide); `art.spec.ts` gives up the old end's check
  and holds the bolt in the cannons' color; the scene's spec holds the
  caps' middles, the lip, body and pad's sizes and places, the right end
  flipped, the hooks a pitch apart about the middle and more as it widens,
  the cannons on its top, and the colors anew in a new palette.
- Docs: the workspace's `AGENTS.md` (`src/view/colors/`, `src/view/art/`,
  `src/scene/`).

Choices, where the plan was silent:

- **The pad is square at its ends.** The kit rounds it 5.5 of 75, two
  device pixels at 1280 × 720; a rectangle scaled across keeps it crisp at
  any width, as the body does, and the rounding doesn't show.
- **The hooks stand about the paddle's middle, an odd number of them,**
  where the kit starts them at its left; each stands a whole number of
  pitches from the middle, so as the paddle widens or narrows (16 units a
  second) none moves, and they come and go in pairs at both ends.
- **The bolts are gold** (the cannons' color), as the kit draws them, where
  they were the paddle's accent.
- The board's placeholder, a pill in the accent drawn in CSS until the
  scene has drawn (stream P's `board.component.scss`), stays as it is.

The review (a fresh agent), and what I did:

1. _The hooks jumped half a pitch each time their count rose by one, as a
   paddle widens through ten counts in an eighth of a second, and the log
   said they came and went at both ends._ Fixed: `hookCount()` stands an
   odd number, so each stands a whole number of pitches from the middle;
   `MOST_HOOKS` is odd too (29), and a spec holds the count odd over a
   paddle widening by quarter pitches.
2. _No spec held the paddle's parts' order or frames._ Fixed: the scene's
   spec holds the lip, the ends, the body, the pad, the hooks and the
   cannons in that order in their layer, and the end, hook and cannon
   frames.
3. _The palette spec couldn't tell the text from black, as its roles' text
   is black._ Fixed for the paddle's inks: it runs on a text of `#102030`.
   The tough tint's spec, L2's, has the same weakness and is left as it is.
4. _`MOST_HOOKS` took the kit's 100 to a unit for granted, and its spec
   used 6 for the widest paddle._ Fixed: the width is
   `WIDEST_PADDLE / PADDLE_HEIGHT * KIT_HEIGHT`, and `WIDEST_PADDLE` is
   exported for the spec.
5. _Small things._ Fixed: the contrast spec's comment and `AGENTS.md` are
   wrapped again; the hook's width is `widthOf()` on the paddle's height,
   a whole number of device pixels and a CSS pixel at least; the shape's
   spec drops the sum that held by construction; the hook's spec holds the
   stem's foot below the paddle's top, not only its round end; the small
   end's spec draws only the paddle's frames; the scene's specs take the
   field's paddle width throughout.

Checks, after the answers: Brick Breaker's lint, typecheck and tests (64
files, 2,556); the root's lint under the lock.

### 2026-11-14: the capsules, the gold lip and the Seeker's sight

`feat(brick-breaker): draw the capsules as the kit does, a bad one on a
gold lip, and give the seeker its sight` (commit 2 of L3, with L5).

- `src/view/art/art.ts`: `CAPSULE_ART` draws each tone as the kit's
  `capsule()` does, its lengths a share of the kit's 80 tall
  (`KIT_CAPSULE`): a good one a pill outlined in the field's color, its
  accent over a darker lip that shows below it and a shine along its top;
  a bad one a hexagon pointed at each end, its danger color over a gold
  lip. Each tone's entry now takes the scale and says the square its
  symbol takes (`CapsuleLook`), so the frame lays the symbol where the
  tone puts it, and `capsuleShape()` sizes and colors a capsule of a tone
  for the frame and the spec alike: half the capsule's height wide, as the kit's, about the
  pill's middle below a good one's shine and the middle of a bad one's
  face. The lip lies 6 of 80 below a good one's body and 8 below a bad
  one's, in whole device pixels and a CSS pixel at least (`widthOf()`), so
  the gold shows at every size. A bad one's body and lip lie a line's
  width in from the outline's slanted edges, the body's from the upper
  ones and the lip's from the lower, as the old notched shape's did.
  Where a brick is too small for its finest detail the shine is left out
  and the symbol takes 0.85 of the face's height, as it took of the
  capsule's inside before, so it still reads.
- `symbols.ts`: the Seeker's symbol is the kit's sight, a ring 0.3 of the
  square, a dot 0.1 in it and four ticks, cut straight, from the ring to
  the square's edge, up, right, down and left. R2's placeholder target is
  gone. The other symbols stay as they are, the Net's bar among them,
  where the kit draws a zigzag.
- `palette.ts` gains `capsuleLips` (a good one's the accent at 30% black,
  a bad one's the warning color, gold) and `capsuleShine` (the accent at
  half white), the kit's mixes.
- `contrast.spec.ts` holds a bad capsule's gold lip to 3:1 against the
  field (5.1 to 9.0); a good one's lip and shine are shading, held to
  nothing, as the comment now says. The gold against the danger color is
  1.0 to 1.5: it tells by its hue and its place under a shape that already
  tells the tone, not by its contrast with the body.
- Specs: `art.spec.ts` holds each capsule's frame as its tone's commands
  then its symbol in the marks' color, each tone's colors in order, a pill
  and a hexagon, the lip a CSS pixel or more below the body at both
  scales, a bad one's outline a line wide along its pointed ends, the
  shine left out small, the symbol's size and middle at both scales, and
  the Seeker's sight; `palette.spec.ts` the new inks.
- Docs: the workspace's `AGENTS.md` (`src/view/colors/`, `src/view/art/`)
  and the `brick-breaker-content` skill (a capsule's symbol and its tone's
  shape).
- In the browser (Classic felt, 1280 × 720 at 2×), the wide, seeker,
  narrow and fast capsules beside the kit's sheet: the same pill, shine,
  hexagon and lip; the gold reads as the kit's does, a dark band under the
  red.

Choices, where the plan was silent:

- **The symbol grows where a brick is too small for its finest detail,**
  to 0.85 of the face's height, as the shine is left out, rather than
  keeping the kit's half of the capsule's height: on a small phone that
  is 5 CSS px, where the old capsule drew 7.
- **The Seeker's ticks reach the square's edge, 0.5 from the middle,**
  where the kit's reach 0.52, so its tag, drawn to the edges of its frame,
  stays inside it.
- **A good one's symbol sits about the pill's middle** (40 of 80) where
  the kit puts it at 39: the face's middle (37) would bring the Seeker's
  top tick onto the shine.
- `capsule_painter.ts` needs no change: the frames are the same size.

The review (a fresh agent), and what I did:

1. _No spec tied the frame's symbol to the square its tone gives; the
   frame could have drawn it anywhere._ Fixed: each capsule's spec expects
   the frame's commands to be its tone's, then `SYMBOLS[id]` in that
   square, in the marks' color.
2. _The spec sized the capsule as the frame does, by hand, and the good
   tone asked `showsDetail()` twice._ Fixed: `capsuleShape()` is exported
   and used by both, and `symbolSquare()` takes whether the capsule shows
   its finest detail.
3. _`capsuleDrop()` handed `widthOf()` the capsule's height as a unit;
   `kitCapsule()` was a third name for `kitLength()`._ Fixed: the drop is
   `widthOf()` of the kit's share of `CAPSULE_HEIGHT` at the scale, and the
   helper is `kitLength()`, as `brick_art.ts` names it.
4. _`AGENTS.md` still named `inset()` and `middleSquare()`, which the art
   no longer uses, and not `pointAt()`._ Fixed.
5. _`CAPSULE_ART`'s comment put the symbol in the face's middle;
   `CapsuleLook`'s left out the shine; the skill said the compiler asks for
   a capsule's shape, which only a new tone needs._ Fixed, all three.
6. _`art.spec.ts`' line check skips straight lines, so the Seeker's ticks
   go unchecked; `toFixed(6)` reads worse than `expect.closeTo()`._ The
   first is left for the next commit, which settles that check for the
   fur; the Seeker's ticks take `symbolLineStyle()`, the style's width at
   least. The second is left: `expect.closeTo()` is typed `any`, which the
   lint rejects in an object matched with `toEqual()`.

Checks, after the answers: Brick Breaker's lint, typecheck and tests (64
files, 2,571); the root's lint under the lock.

### 2026-11-14: the fur by the streak, and a seeking ball's sight

`feat(brick-breaker): lift a ball's fur with the streak and mark a seeking
ball with a sight` (commit 3 of L3).

- `src/view/art/fuzzball_art.ts`: `STREAK_FUR`, a normal ball's fur at
  each of the streak's multipliers, as the kit's `ball()` combs it with
  `combedStrands()`: flat at ×1 (the fuzzball's own), half way at ×2, on
  end at ×3, and on end with sparks about it at ×4; `streakStep()` turns
  a streak into its step, through the rules' `multiplier()`.
- `art.ts`: `ballFrame(kind, streak)` names a normal ball's frame at the
  streak (`ball-normal`, then `ball-normal-x2` to `-x4`); a fire or blast
  ball keeps its own fur at any streak, as the kit's does. The ×4 frame's
  sparks are `sparkCommands()`, a unit of the fuzzball's grid wide, a CSS
  pixel at least, drawn over the body and again beneath it in the outline,
  the outline's width wider either side, as Brick Fuzz Pop outlines its
  own. `FRAMES.sight` is a seeking ball's sight: a ring 1.7 of a ball's
  radius from its middle, clear of fur on end and its sparks and their
  outline at every field scale, and a tick out from it to 2.4 each way, in a good capsule's color, over an
  outline, so it shows over a brick of any tint. The faced frames, which
  How to play pictures, stay flat.
- `ball_painter.ts`: each ball takes its kind's frame at the field's
  streak, and a pool of sights, made once and laid under the balls, shows
  one under each ball in flight that seeks (`Ball.seeks`, or every ball
  while a Seeker is in play), none under a ball held on the paddle.
- `palette.ts` gains `streakSparks`, the warning color, as the kit's.
- **Outside my files, added only:** `src/view/field/frame.ts`'s
  `FieldView` gains `seeking` (`Field.seeking`) as its last member, so the
  ball painter can read it; the frame's spec already holds the field to
  the view.
- `art.spec.ts`' line check is settled: it now holds straight lines too,
  every line a CSS pixel wide or more but a ball's fur, which tapers to
  half a device pixel at a unit of 10, and a new check holds the outline
  beneath each strand of that fur a CSS pixel or more either side, so the
  thinnest still shows; another holds everything a ball draws at ×4 inside
  the sight's ring, at every field scale. The ball's specs hold the fur reaching further at ×2 and on
  end at ×3 and ×4, a frame for each multiplier and none between them,
  fire and blast balls the same at any streak, the sparks only at ×4, over
  the body and outlined beneath it, and the sight's ring, ticks and
  outline; `fuzzball_art.spec.ts` holds `STREAK_FUR` to the kit's and to
  the rules' tiers, and `streakStep()` at each tier's edges; the contrast
  spec holds the sparks and the sight to 3:1 against the field (the
  warning color and the accent, which the fire ball and the good capsules
  already met); the scene's spec holds the frame at a streak, the sight
  under a seeking ball and not another, under every ball in flight while a
  Seeker is in play but not one held, hidden with a lost ball, and laid
  under the balls.
- Docs: the workspace's `AGENTS.md` (`src/view/colors/`, `src/view/art/`,
  `src/scene/`) and the `brick-breaker-content` skill (only a normal
  ball's fur lifts).
- In the browser (Classic felt, 1280 × 720 at 2×), four balls held still
  at each step, one seeking: the fur lifts and stands as the kit's sheet
  draws it at play size, the sparks show as gold flecks about the ball at
  ×4, and the sight rings the ball clear of its sparks.

Choices, where the plan was silent:

- **A seeking ball wears a sight,** the Seeker's symbol drawn round it in
  the good capsules' color, under it: the kit marks a seeker only by the
  dotted way it takes, which the game doesn't draw, and the Seeker's own
  symbol says what lent it.
- **No sight under a ball held on the paddle,** though it may seek once
  launched: the rules turn only a ball in flight.
- **The sight stands still,** neither turning nor pulsing, so it asks
  nothing of the player's preference for motion.
- The kit also redraws the fire ball (red under a crown of flame) and the
  blast ball (red, sparking); neither is in L3's list, so both keep their
  look.

The review (a fresh agent), and what I did:

1. _A ball lost on a streak fades in its flat faced frame, so fur on end
   snaps flat as it is lost._ Left: the fade is the lost-ball flourish,
   which `bricks_scene.ts` hands `facedBallFrame()` and which F1 is
   reworking with the effects; a faced frame for each step (three more)
   and the ball painter's last streak would do it. A follow-up for F1 or
   the integrator.
2. _The sight's ring was said to be clear of the sparks, but no spec held
   it, and at a unit of 13 the sparks' outline cut 0.25 px into it._ Fixed:
   the ring is 1.7 of a ball's radius (the ticks 2.4), and a spec at every
   field scale holds everything the ×4 frame draws inside the ring's inner
   edge; with 1.6 it fails at 13, as the review worked out.
3. _The fur's outline spec held the outline's whole width, not a CSS pixel
   either side._ Fixed: it pairs each strand with the outline beneath it,
   by their points, and holds half the difference to a CSS pixel.
4. _The atlas's spec handed `ballFrame()` the array's index as a streak._
   Fixed: it asks for every kind at every step.
5. _The outlining as one with the sparks copies Brick Fuzz Pop's
   `outlinedWith()`; the sparks' style and `sparks: sparking` read badly,
   and the normal ball's frames want a function._ The names and the
   function are fixed (`normalBallFrames()`, `sparkStyle`). The shared
   helper is left: lifting it into `@fz/phaser/fuzzball` would change Brick
   Fuzz Pop's art, which this package doesn't touch; a follow-up.
6. _One scene spec acted twice, and its held half didn't show the ball
   was drawn._ Fixed: two specs, the held one holding the ball shown and
   its sight hidden.
7. _`AGENTS.md`'s edits rewrapped whole paragraphs, in a file other
   streams add to, and left a long line._ Fixed: the words are inserted
   with the lines round them kept as they were.

Checks, after the answers: Brick Breaker's lint, typecheck and tests (64
files, 2,613); the root's lint under the lock.

### 2026-11-14: the rim, the gutter and the ring of a brick growing back

`feat(brick-breaker): rim the field, wash the gutter under the paddle and
ring a brick as it grows back` (commit 4 of L3).

- `field_painter.ts` draws the field's edge as the kit's `fieldScene()`
  does: a rim on the left, the top and the right, 0.3 of a unit wide in
  whole device pixels, never narrower than the layout's wall nor further
  past it than half the gap the panels keep from it (`rimWidth()`, in a new
  file of the view's, `src/view/field/rim.ts`), round at its outer corners (1.6 of its width), over a
  darker lip that shows at the foot of each side (0.35 of its width); then
  the field; then the gutter, from 0.45 of a unit under the paddle's foot
  to the field's, washed with the danger color, with a chevron pointing
  down it every two units across, the first one unit in; then the net. It
  draws again when the paddle's top moves too, as a taller field moves it.
  Each part is a function of its own (`drawRim()`, `drawGutter()`).
- `brick_art.ts` draws the place a broken regrowing brick has left, as the
  kit's `regrowing()` does: a track round the cell's middle, the ring
  filled along it from the top, clockwise, as its time comes, and a sprout
  in it, left out where a brick is too small for its finest detail. The
  ring fills in `REGROW_RING_STEPS` (24) steps, each a frame of the
  regrowing brick's (`regrowingFrame()`), and `regrowShare()` says how far
  a broken brick has come from the field's step, its `regrowsAt` and its
  kind's `regrows` trait, 1 while a ball keeps it from growing back.
  `cellFrame()` picks what a cell shows: its brick's frame, a broken
  regrowing brick's ring, or nothing.
- `brick_painter.ts` shows `cellFrame()` in each cell, so a broken
  regrowing brick's ring until it grows back, when its own frame grows
  from nothing as before.
- `palette.ts` gains `fieldInks` (the rim's lip, the wall at 30% black;
  the gutter, the danger color at 10% over the field; the chevrons, at
  55%) and, in `kindInks`, `regrowRing` (the green tint) and `regrowTrack`
  (it at 30% over the field).
- Specs: `brick_art.spec.ts` holds `regrowShare()` at the break, half way,
  at its time and past it, and for a whole or never-regrowing brick;
  `cellFrame()` for a brick that stands, a broken regrowing one half way
  and one broken for good; `regrowingFrame()`'s 25 frames; the ring filled 0, a quarter, a half and
  the whole way round from the top, about the cell's middle, its sprout in
  and out by detail, and its frames among the regrowing brick's.
  `rim.spec.ts` holds the rim at 0.3 of a unit, at the wall's width where
  that is wider, and short of half the panels' gap at 1×, 1.25×, 2× and
  3×. `contrast.spec.ts` holds the ring to 3:1 against the field, every
  ball and capsule (3.9 at the least), the sparks at ×4, a seeking ball's
  sight and a bad capsule's gold lip to 3:1 against the gutter they fall
  through, and the chevrons to 2:1 against it (2.05 to 2.39); the gutter,
  the rim's lip and the ring's track are shading, held to nothing. The
  scene's spec holds the rim's box and its lip, the order of the fills
  (the rim's lip, the rim, the field, the gutter, the net), the gutter's
  rectangle on a field of 30 units and on the tallest, a chevron every two
  units across, each stroked in the chevrons' ink, and the first one's
  points, and a broken regrowing brick's frame half way through its time;
  the palette's, the new inks.
- Docs: the workspace's `AGENTS.md` (`src/view/field/`, `src/view/colors/`,
  `src/view/art/`, `src/scene/`) and the `brick-breaker-content` skill (a
  kind that regrows shows the ring, which `cellFrame()` picks), each an
  insertion.

Choices, where the plan was silent:

- **The chevrons are 55% of the danger color, not the kit's 30%,** which
  is 1.36 to 1.46 against the gutter; at 55% they keep 2:1, faint as the
  gutter is.
- **The rim is wider than the layout's wall** (2 CSS px), at the kit's 0.3
  of a unit, where the unit allows: it paints into the canvas's room round
  the field, which the layout leaves. It stops half way across the 12 CSS
  px the panels keep from the wall, so it never reaches under a panel,
  however large the unit (8 CSS px at the most). The board's focus ring and
  its placeholder (stream P's `board.component.scss`, `--wall`) still
  frame the field 2 CSS px wide; P can widen them to `rimWidth()`'s, as a
  follow-up.
- **The ring fills in 24 frames,** as the kit's arc has 24 pieces: one
  every 0.42 s of the 10 s, steady enough on a ring that small.
- **The sprout is left out under 15 CSS px a unit,** where its leaves are a
  device pixel or two; the ring alone says the brick grows back.

The browser check, before this commit, on the dev server at port 9104 in
headless Chrome, each part held still on a launched field: at 1280 × 720
at 2×, in Classic felt and in Midnight blue, a catching paddle's hooks
and a laser's cannons, a good and a bad capsule of each kind falling, the
Seeker's sight in each, balls at ×2, ×3 and ×4, one seeking under its
sight, a regrowing brick's ring part way round with its sprout, and the
rim and the gutter with its chevrons; at 844 × 390 at 3× (12 CSS px a
unit), the same in both palettes, the hooks twice as far apart, the
capsules' symbols larger and their shine gone, and the ring without its
sprout. Each matched the kit's sheets (`paddle-and-capsules.svg`,
`bricks.svg`, `field.svg`) as drawn at play size. `/tmp/l3-game.png` is
the 1280 × 720 view in Classic felt.

The review (a fresh general-purpose agent, on the commit before these
answers), each finding and its answer:

1. The rim runs under a side panel past about 49 CSS px a unit. Fixed:
   `rimWidth()` stops at the wall plus half the panels' gap, in device
   pixels (`Math.floor`, so it never reaches the panel's edge), specced at
   four pixel ratios; the "stays clear of the panels" above is corrected.
2. `rimWidth()` sits in the scene, where the board can't call it. Fixed:
   moved to `src/view/field/rim.ts`, specced in `pure`; a file of its own
   rather than in `field_metrics.ts`, so this stream only adds to
   `src/view/field/`.
3. The specs pass with the fills out of order. Fixed: a spec holds the
   fills' colors in turn, the net's included.
4. No spec draws the gutter on a taller field. Fixed: one does, under the
   tallest field's paddle. The `paddleTop` key is kept: it costs one
   comparison and keeps the gutter under the paddle should the two ever
   move apart from the metrics.
5. The painter picks the cell's frame. Fixed: `cellFrame()` in
   `brick_art.ts`, specced in Node, a brick broken for good included; the
   painter only calls it.
6. `REGROW_STEPS` reads as the field's steps. Fixed: `REGROW_RING_STEPS`,
   and the spec's `REGROW_STEPS_OF_FIELD` is `GROWING_BACK`.
7. The gutter's contrast leaves out the sparks and the gold lip. Fixed: the
   sparks, the sight and the gold lip are held to 3:1 against it too; all
   pass in the four palettes.
8. Nits: the regrow share's title says "at step %i"; the chevron count is
   `FIELD_WIDTH / 2`; `strokedPaths()` keeps each path's `lineStyle` color,
   and the chevrons are held to one color; `@fz/core/math` comes first in
   `brick_art.ts`, and `brick_painter.ts` no longer imports the rules'
   bricks. All fixed.

Checks, at this commit: the workspace's `lint`, `typecheck` and
`test --maxWorkers=6` (65 files, 2,684 tests) pass, and so does the root's
`yarn lint`, under the shared lock.

Coverage, at this commit (the last of L3 to touch `src/view`): the pure
and dom projects (62 files, 2,486 tests) pass the view's and the rules'
floors (100% of statements, functions and lines, 95% of branches);
`art.ts`' own branches are at 90%, the two `??` fallbacks for a streak's
frame name, which no streak reaches, and `brick_painter.ts`' at 82%, all
in code this package didn't touch (a move's `??` start, `move()`'s
guard and `dropIn()`'s delay).

## L6. Friends' art

Friends' four kinds drawn for real on the slab, replacing K1's
placeholders, as `art/bricks.svg` section C draws them, and the friends'
balls in their inks.

### 2026-11-14: the plate, the cage, the key and the gate

`feat(brick-breaker): draw friends' kinds, a plate with teeth, a cage over
the friend it frees next, a key and a gate` (commit 1 of L6).

- `brick_art.ts` draws each kind in `BRICK_SLAB`, every number the kit's
  (`plated()`, `cage()`, `key()`, `gate()` in `art/kit.mjs`):
  - **The plated brick** (`u`, `U`), in a tough brick's deeper tint, as the
    kit's: a pip for each hit left, higher and smaller than a tough
    brick's, a crack for a hit taken (a `U` hit once), and a plate of steel
    along its foot, a little wider than the slab, with its shine, two
    rivets and nine teeth pointing down (`plateTeeth()`, `rivets()`).
    Frames: 3 looks (one hit, two, two with one taken) × 8 tints. The
    tough brick and it share the code that names and draws a brick that
    wears (`wornArt()`, `wornFrame()`, `wornFrames()`), and the cracks
    (`crackOf()`, `cracksOf()`).
  - **The cage**, in the steel: its inside cut out in the marks' color, the
    friend in it (`cagedFriend()`), six bars of steel over it, the first
    right of the middle broken into two bent ends once it is hit
    (`cageBars()`), and a crack in its frame. Frames: whole and hit × the
    eight friends' inks.
  - **The key**, in the warning color, its key cut out in the marks'
    color: a ring for its bow, its shaft and two teeth.
  - **The gate**, in the steel, with a gold end each side in the key's
    color, round outside and square inside, and a keyhole in the steel's
    dark line. An open gate is broken, so its cell shows nothing, as the
    rules keep it (C15); nothing else is drawn of an opened gate.
  - Under 30 CSS px wide a brick leaves out the plate's shine, rivets and
    crack, the cage's crack, and the caged friend's fur.
- **A cage shows the friend it frees next.** The rules dress each friend
  in the next ink as it is freed (`friendsFreed % FRIEND_INKS`, C14), not
  in one a cage holds, so every standing cage shows that friend
  (`nextFriend()`), and they all turn to the next once one is freed. So
  `BrickArt.frameOf()` takes the friends the field has freed, `brickFrame()`
  takes it too (0, the first, for How to play's pictures), and
  `cellFrame()` takes the field beside the brick (`CellField`: its steps
  and its friends freed) where it took the steps.
- `palette.ts`: `bricks.cage` and `bricks.gate` (the steel) and
  `bricks.key` (the warning color), `kindInks.plate` (the steel) and
  `kindInks.plateShine` (40% white, the kit's), and `friendInks`
  (`FUZZBALL_INKS` of the mode).
- `@fz/phaser/bricks`' `cagedFriend()` takes the fur to draw, the
  fuzzball's own unless given, so a cage drawn small leaves it out. Brick
  Fuzz Pop's calls are unchanged.
- Specs: `brick_art.spec.ts` holds the plate's pips, cracks, plate (its
  place on whole pixels), shine, rivets, cut and nine teeth, and what is
  left out small; the cage's friend in the next ink, the first again after
  the last, and in the ink the rules dress the friend it frees in (a field
  that has freed ten, broken by `hitBrick()`), its inside, six bars over
  the friend and mirrored, the bent bar and the crack once hit, and the
  fur and crack left out small; the key's bow, shaft and teeth; the gate's
  ends, covers and keyhole, mirrored; and each kind's `brickColor()`.
  `palette.spec.ts` holds the new inks. `contrast.spec.ts` holds every
  friend's ink as a ball (against the field, its outline, the marks it
  wears as eyes and the gutter), the cage, key and gate among the bricks,
  steel's dark line against the plate and the gate (their rivets and
  keyhole), and the plate and the cage's bars against the marks' color
  they stand in. The scene's spec holds a cage's frame at the friends
  freed, and the gates shown shut and hidden as the last key opens them.
  The lib's spec holds `cagedFriend()` with no fur.
- Docs: the workspace's `AGENTS.md` (`src/view/colors/`, `src/view/art/`),
  the content skill (the kinds in colors of their own, a look that reads
  the field) and the testing skill (the friends' inks in the contrast
  spec).

Choices, where the plan was silent or the kit fell short:

- **The brick is cut away round its plate in the marks' color,** from a
  seam of a CSS pixel or more above the plate (3 kit units) down to its
  foot, round at the foot's corners, and the teeth stand in that cut in
  the steel, where the kit draws the plate straight on the brick and its
  teeth in the steel at 34% black. The steel keeps no contrast with a
  brick's tint (1.0:1 to 1.4:1 against the tough tints in the four
  palettes), and the dark teeth none with the field (1.3:1 in the dark
  palettes) or the lip (1.5:1 to 2.6:1); against the marks' color the
  plate and its teeth keep 3.3:1 to 5.1:1. This is what makes a plate read
  as a plate against every tint at every size, as K2's note asked: in
  Trellis a plated brick and the plain one beside it in its row's tint now
  differ by the plate.
- **The cage's inside is the marks' color,** not the kit's field 18%
  toward the steel: at 18% the bars keep 2.76:1 against it in Soft pastel
  and a friend's ink 2.92:1; in the marks' color 3.3:1 and 3.5:1 at the
  least.
- **Every standing cage shows the same friend,** the next freed, as said
  above; a cage that holds a friend of its own would free one in another
  ink, which C14 settles.
- **The friend's eyes are the marks' color,** as a ball's are, not the
  kit's ink with glints.
- **The plate's rivets and the gate's keyhole are steel's dark line**
  (60% black), as steel's frame and rivets are since L2, not the kit's 34%
  and 40%.
- **Nine teeth at every size,** as the kit; they are a CSS pixel tall on a
  phone, where the plate's band carries it.
- **The gate's gold is the warning color, the key's,** so in a light
  palette it is the key's orange-brown, as the kit's light sheet has it.

Measured: the atlas at a unit of 54 at 3 to a CSS pixel stays inside the
4096 px side the art spec holds (it passes).

What I added outside stream L's files: `src/view/field/frame.ts`'s
`FieldView` gains `friendsFreed` as its last member, which `Field` has
since K1; `src/scene/painters/brick_painter.ts` (F2's for now) hands
`cellFrame()` the field rather than its steps, one line. K1's
`placeholderArt()` in `brick_art.ts` goes with the last kind that used
it; K3, drawing its three kinds' placeholders at the same time, needs it
back (it is in git at 0504165a).

Checks: the workspace's lint, typecheck and tests (72 files, 3250 specs),
`@fz/phaser`'s lint, typecheck and tests (59 files, 906 specs), and the
root's lint, typecheck and tests, all pass.

The review (a fresh agent), each comment and its answer:

1. _The new specs count parts but never say what is drawn over what, so a
   reorder that hides the plate's teeth, the gate's square inner ends or
   the caged friend would pass._ Fixed: specs hold the teeth over the cut,
   the plate over the teeth and its shine and rivets over it; the gate's
   steel over its gold ends and its keyhole over its steel; and the friend
   over the cage's inside, with the bars over the friend as before.
2. _`nextFriend()` repeats the rules' `friendsFreed % FRIEND_INKS`._ Left,
   for K (or Z1): `freeFriend()` in `src/rules/bricks/bricks.ts` is K's, so
   L doesn't change it. A `nextFriendInk()` in the rules that both call
   would keep the choice in one place; until then the art spec breaks a
   cage on a field that has freed ten and holds `nextFriend()` to the ink
   the rules dress the friend in.
3. _`BrickArt.frameOf()` takes a bare count of friends freed, though the
   skill says a look reads the field from `CellField`; and
   `brickFrame()`'s default shows the first friend silently._ Fixed in
   part: `frameOf()` takes the `CellField`, and `brickFrame()` takes one,
   or `PICTURED_FIELD` (its first step, no friend freed) where none is
   given. The default stays: How to play and many specs, some of them
   other streams' in flight, picture a brick on its own, and the painter
   goes through `cellFrame()`, which always hands the field on.
4. _The spec that ties the cage to the rules checks no frame, and hits
   the cage in a loop whose counter is never read._ Fixed: it breaks the
   cage in one call (`"breaks"`) and is named for what it checks ("names
   the friend the rules free next, the ink they dress it in"); a new
   `cellFrame` spec holds a standing cage's frame to the next friend's ink.
5. _The scene's gate spec holds two cases in one._ Fixed: "shows each
   gate shut while a key is left" and "hides every gate as the last key
   opens them", on one setup (`withGates()`).
6. _`cagedFriend()`'s doc comment opens with two sentences._ Fixed: the
   fur is a paragraph of its own.

The browser, on port 9104 at 1280 × 720 at 2× in Midnight blue: Hello's
two cages, each a coral friend behind its bars; Mushroom's underside of
plates, each a band of steel with teeth under its orange; Drawbridge's
row of gates, steel between gold ends with a keyhole each, its three keys,
and the gates gone at once as the third key broke (three balls put in
play under the keys); Trellis's plates against their rows' tints, plainly
apart from the plain bricks beside them. At 844 × 390 at 3× in Classic
felt: Nest's three cages, their friends without fur, and Mushroom's and
Drawbridge's plates, gates and keys, the teeth a CSS pixel tall.

### 2026-11-14: the friends' balls in their inks

`feat(brick-breaker): draw each friend in its ink, its tail and its streak's
ring too` (commit 2 of L6; commit 1 is 5bcfe766).

- `art.ts` draws a friend's frames in each friend's ink, as the player's
  normal ball's (`normalBallArt()`), at each step of the streak (L3's fur, ×4's sparks) and with its
  eyes (`ball-friend-<ink>`, `-x2` to `-x4`, `-faced`, 40 frames).
  `ballFrame()` and `facedBallFrame()` take a ball's ink (`Ball.ink`), the
  player's own (`OWN_INK`) unless given, and `ballColor()` names the color
  a ball is drawn in, which its tail and its streak's ring take: a
  friend's ink while the balls are normal, else its kind's. The atlas at a
  unit of 54, 3 to a CSS pixel, is 1130 × 1301 px, 252 frames.
- F's painters, each the smallest change: `BallPainter` names each ball's
  frame by its ink inside its loop, where it named one frame for them all
  before it (its sight is untouched, so a seeking friend shows its sight),
  and says the ink of a ball it showed that the field has since lost
  (`lostInk()`), which `bricks_scene.ts` hands `facedBallFrame()` for the
  lost ball's fade (one line); `TailPainter` tints each tail by its ball's
  color; `StreakPainter` tints the ring, and writes the count, in the
  color of the ball it follows.
- Specs: the art spec holds each friend's frames in its ink over its
  outline, its fur lifted as the player's ball's at each multiplier, a
  name apart for each, a fire or blast friend in its kind's look, a faced
  friend's eyes, `ballColor()`, the atlas holding every friend's frame, and
  every friend's fur a CSS pixel wide among the rest (`FUR_COLORS`). The
  scene's spec holds a friend drawn in its ink at the streak, a seeking
  friend's sight, a lost friend fading in its ink (by the place it was lost, among the balls shown), a friend's tail in its
  ink, and the ring and count in a friend's ink about a friend.
- Docs: the workspace's `AGENTS.md` (`src/view/art/` and `src/scene/`) and
  the content skill's ball kind (a friend's ink only while the balls are
  normal).

Choices:

- **A friend wears its ink only while the balls are normal,** as the kit
  draws it: a fire or blast friend is a fire or blast ball, as the rules
  make it, and wears that kind's look, tail and ring; the kind is what
  plays differently.
- **The tail and the ring take the friend's ink** (F1's note left it to
  L6): in the browser a friend's tail in its ink reads as that ball's, and
  a ring in the player's ball's color about a friend reads as the wrong
  ball's. The count is written in the ring's color, as F1 has it, so it is
  written again when a step follows a ball of another color than the last
  (a few `Text`s, once per step at most).
- **A lost friend fades in its ink,** as the player's ball fades in its
  kind: the painter finds the ball by the place the field lost it at
  (`FieldEvent.x` is the ball's `x`) among the balls it showed, so no
  field event changes.

The review (a fresh agent), each comment and its answer:

1. _The lost-friend spec doesn't pin how `lostInk()` finds the ball: it
   passes without the place or the sight of it._ Fixed: a spec loses the
   player's ball and a friend at once, at two places, and fades each in
   its own ink; another loses a friend where a record never shown says it
   was lost before, in another ink. Each fails with its check taken out.
2. _`lostInk()` guesses the ball by its place and the painter's images;
   it fails where a cage frees a friend into the lost ball's record in the
   same step, and it adds a method to F's painter._ Left, with its limit
   known: such a friend fades in the player's color, once, rarely. The
   exact fix is the lost ball's ink on the event, as the event keeps the
   streak because the scene plays it after the field moves on; but a field
   added to `FieldEvent` changes the events that `events.spec.ts` and
   `effects.spec.ts` (others' specs) build and expect whole, and
   `loseBall()`'s call in `field.ts`, more than adding. A follow-up for
   the integrator or K: `FieldEvent.ink`, set by `loseBall()`, and
   `facedBallFrame(kind, event.ink)` in place of `lostInk()`.
3. _The art draws a normal ball's frames twice, the player's and the
   friends'._ Fixed: `normalBallArt()` draws a normal ball's frames in a
   color by their names (`NormalBallFrames`), the player's
   (`OWN_BALL_FRAMES`) and each friend's, and `facedArt()` puts the eyes
   on any ball's body.
4. _`OWN_INK` is handled two ways._ Fixed: `ballFrame()` and
   `facedBallFrame()` look a ball's names up one way (`normalFramesOf()`,
   a friend's or the player's own), and `ballColor()` the same way.
5. _The seeking friend's spec can't fail from this change._ Kept, as the
   guard the package asks for: a seeking friend keeps its sight.
6. _Two doc comments in `ball_painter.ts` are left unwrapped._ Fixed:
   rewrapped, the two paragraphs this change touched.

The browser (port 9104): Nest at 1280 × 720 at 2× in Midnight blue, three
friends, coral, orange and yellow, in flight with the player's ball at ×3,
each with its fur on end and its tail in its ink, the yellow one seeking
under its sight, and the standing cage holding the orange friend it frees
next (`/tmp/l6-friends.png`); at 844 × 390 at 3× in Soft pastel, friends
in green, blue and teal at ×2, each tail in its ink.

## L8. The fur's outline, lifted

Added by the integrator, for the user's ask to reuse library code between
the games; it isn't in the implementation plan's §6. Brick Fuzz Pop's
`outlinedWith()` outlined a fuzzball as one with its sparks or flames, and
Brick Breaker's `streakBallCommands()` repeated it for a ball's sparks at
×4 (L3's review comment 5), which L6's friends drew through too. Started
from the integration tip 6503c59c.

### How the two games' looks were held still

As in L1 and L2: a spec of the moment's own in each game, never committed,
hashed every frame `atlasFrames()` draws, in each of the four palettes, at
every unit from 1 to 140 device pixels and each of six pixel ratios (1,
1.25, 1.5, 2, 2.625, 3), one SHA-256 of each atlas's frames' JSON, so a
number moved by a rounding shows: Brick Fuzz Pop's 235,200 frames (70 an
atlas, about 60 s) and Brick Breaker's 846,720 (252 an atlas, about 4
min). They were taken before the change, after it, and after the
review's answers; both specs are deleted.

### 2026-11-14: `fuzzballWearing()` and `wornSparks()`

`refactor(phaser): lift the fuzzball outlined as one with what it wears into
the fuzzball entry` (the one commit of L8).

- `@fz/phaser/fuzzball` gains `fuzzballWearing()`: the fuzzball's body and
  fur, as `fuzzballCommands()` draws them, outlined as one with what it
  wears, a `Worn` (the outlines of its parts, the parts beneath its body
  and fur, and those over them, each optional): its outline, then the
  parts' outlines, then what lies beneath, then its body and fur, then
  what lies over them, so no outline covers any of it. It draws the
  outline itself, where the games sliced it off `fuzzballCommands()`'s
  commands by the length of the body's. `fuzzballCommands()` is now
  `fuzzballWearing()` wearing nothing. Beside `sparkCommands()`,
  `wornSparks()` gives the sparks as a fuzzball wears them: over its body
  in their style, and beneath it in the outline's color, the outline's
  width wider either side. Specs: the order, nothing worn drawing as
  `fuzzballCommands()` does, the parts' outlines first where the fuzzball
  has no outline, no outline after the body with the sparks worn, and
  `wornSparks()`' two lists.
- Brick Fuzz Pop's `fuzzball_art.ts` draws through them: the player's
  fuzzball at each charge wears `wornSparks()` at a full one, the hot shot
  its flames as a `Worn`, and a friend is `fuzzballCommands()` in its ink.
  Its `FuzzballLook`, `Worn`, `NOTHING_WORN`, `outlinedWith()` and
  `outlineAlong()` are gone.
- Brick Breaker's `art.ts`: `normalBallArt()` draws each step of the
  streak with `fuzzballWearing()`, wearing `wornSparks()` where the step
  has sparks; `streakBallCommands()` is gone.
- Docs: the library's `AGENTS.md`, the `phaser-core` skill, and both
  games' `AGENTS.md`, which named `sparkCommands()` for the sparks.

Choices:

- **A function of its own beside `fuzzballCommands()`,** as the ask was,
  rather than a third argument to it: most callers (Asteroid Breaker's
  pilot, the bricks' caged friend, Brick Breaker's fire and blast balls)
  wear nothing, and `fuzzballCommands()` stays as they call it.
- **Every part of a `Worn` is optional,** so `{}` wears nothing, where
  Brick Fuzz Pop kept a `NOTHING_WORN`.
- **`wornSparks()` too,** though the ask named one function: both games
  built the sparks' wear alike, the sparks in the outline's color, its
  width wider either side, beneath, and the sparks over, which the third
  point of the ask lets this package lift, as it is tiny and in the same
  entry. `sparkCommands()` stays exported, the sparks in one style.
- **Brick Fuzz Pop's flames' outline is written where it is drawn,**
  `2 * outline.width` wide, now that `outlineAlong()`'s only other caller,
  the sparks, is in the library; it was `0 + 2 * outline.width`, the same
  number.
- **A friend keeps `furOf(0)`,** `combedStrands(0)`, which differs from
  the fuzzball's own strands by a rounding, so its frames hash as before.

Follow-ups, the third point of the ask (repeated, not lifted here):

- **A slab cut below a line across it.** Brick Breaker's `plateCut()`
  (`brick_art.ts`) cuts its body away below the plate's top, square at the
  top and round at the foot's corners, as a `rect()` and a `roundRect()`;
  Brick Fuzz Pop's plated tile (`kinds/plated.ts`) builds its tile's
  rounded outline (`outlineOf()`) and cuts it at the plate's inner edge
  (`cutAt()`) for the plate's gap, turned to each face. Both are the slab's
  body below a line, the mirror of `@fz/phaser/bricks`' `topCap()`; a
  polygon from the library would serve both, Brick Fuzz Pop turning its
  points. It moves Brick Fuzz Pop's numbers, so it wants its own hashes.
- **A crack cut out of a brick.** Brick Breaker's `crackOf()` and Brick
  Fuzz Pop's tough `cracksCommands()` and hit cage's crack are each
  `polygon(bandAlong(points, width, edge), { color: mark })`: a
  composition of two library pieces, each game's points its own, so
  likely too thin to be worth a name.

The review (a fresh agent) found no bug, and checked that no number and no
draw order moves in either game. Its comments, and the answers:

1. _The log said the hashes were taken after the review's answers before
   there was a review._ Fixed: this section, and the hashes taken again
   once the answers were in.
2. _"Draws as `fuzzballCommands()` does, wearing nothing" compared the
   function with itself, as `fuzzballCommands()` is `fuzzballWearing()`
   wearing nothing._ Fixed: deleted; `fuzzballCommands()`' own specs pin
   that path.
3. _The spec of the sparks outlined as one held only that no outline came
   after the body, which passes with the sparks' outline dropped._ Fixed:
   it holds the first commands, as many as the fuzzball's own outline and
   the sparks' together, all in the outline's color, and none after them;
   with `wornSparks()`' outlines taken out, it fails.

Checks, after the answers: `@fz/phaser` lint, typecheck, tests (921 in
60 files) and coverage (the fuzzball entry whole); Brick Fuzz Pop's lint,
typecheck and tests (6,489 in 147 files); Brick Breaker's lint, typecheck
and tests (3,493 in 75 files); the root's lint, typecheck and tests under the
lock; both atlases' hashes unchanged (235,200 and 846,720 frames, none
differing), after the change and after the answers.

## L7. Machines' art

Machines' three kinds drawn for real, replacing K3's placeholders, as
`art/bricks.svg` sections B, C and E and `art/mechanics.svg` draw them
(`bumper()`, `portal()` and `slider()` in `art/kit.mjs`), through lift 2's
marks; and the slide K3 left: whatever is drawn for a brick follows it as
it slides. Started from the integration tip b76415ac, with K3's three
kinds and their placeholders.

### 2026-11-14: the bumper and the portal

`feat(brick-breaker): draw the bumper and the portal, each pair of portals
in its ink and with a badge of its own` (commit 1 of L7).

- `brick_art.ts` draws both round, on no slab, as K3's placeholders stood
  and as the kit draws them:
  - **The bumper** through `@fz/phaser/bricks`' `bumperMark()`, in a square
    1.08 of the brick's height about its middle (`BUMPER_SQUARE`), so its
    disc is the kit's, 40 of its units round, with the ring cut out of it 26
    round and its cap 11.3, where the kit's is 11.5; its ticks kick out 35°
    from across (`BUMPER_TICKS`), as L1 left for this package. Its disc and
    ticks are in the accent (`bricks.bumper`), its ring in the marks' color.
    One frame, `bumper`.
  - **The portal** through `portalMark()`, in a square 1.11 of the brick's
    height (`PORTAL_SQUARE`), so its ring is the kit's, 40 round and 11
    wide: its middle in the marks' color, its three arms and its ring in its
    pair's inks, and a badge on its ring, up and to the right, on a disc in
    the marks' color: a dot for the first pair (`@`) and a hollow diamond for
    the second (`%`) (`PORTAL_BADGES`). A frame for each pair,
    `portal-dot` and `portal-diamond`, named by `Brick.pair`.
  - `BrickLook` gains `pair` and `heading`, which `Brick` has since K3, so a
    look can say a portal's pair and, in the next commit, a slider's
    heading. `art.ts`' How to play pictures each kind through `pictured()`,
    a whole brick of its kind but for what its look changes, as the record
    would otherwise spell seven fields for each of fourteen kinds.
  - `oneLookArt()` holds what `untintedArt()` held, a kind in a color of its
    own in one look; `untintedArt()` puts its marks on the slab, and the
    bumper is `oneLookArt()` on none. K3's `roundPlaceholderArt()` goes with
    its last user.
- `palette.ts`: `bricks.bumper`, the accent, as the kit's; and `portals`,
  each pair's inks by `Brick.pair` (`PortalPairInks`): its ring the violet
  tint, then the teal (`PORTAL_TINTS`), and its arms and badge the ring 34%
  of the way to the text (`PORTAL_GLOW`), the kit's mix and Brick Fuzz
  Pop's. A portal's shards would take its ring, though it never breaks, and
  the bench's picture of the next level colors one so.
- `@fz/style/testing` gains `deltaE()`, how far apart two colors lie in
  CIELAB, by CIE76, beside `contrast()`: the tints share one luminance, so
  violet and teal are 1.0:1 apart by contrast in every palette, and only a
  measure of hue can hold them apart. `@fz/phaser/color`'s `inks.spec.ts`
  held its own copy of the same math, for the fuzzballs' inks, and takes the
  library's now, so it is written and tested once.
- Specs: the art spec holds the bumper's disc, 40 round on no slab about the
  middle, its ring 26 round, the shadow, disc, ring and cap in that order,
  the shadow lower and the cap lighter and inside the ring, and the four
  ticks at 35°, -35°, 145° and -145°, past the disc; each pair's ring and
  middle, its 42 arms' lines under its ring and inside the middle, and the
  badges, a dot on a disc for the first and a diamond with a hole on a disc
  for the second, still a diamond reaching past a dot at a phone's unit; and
  `brickColor()` of each, a portal of a pair no level lays throwing. The
  palette spec holds the bumper's accent and each pair's inks in both
  modes. The contrast spec holds the bumper among the bricks, each pair's
  ring among what a ball crosses (3:1 against the field, the outline and
  the marks against it), each pair's arms and badge to 3:1 against the
  marks' color they sit in, and the two pairs' rings, and their arms and
  badges, 27 or more apart by `deltaE()`, as far as any two fuzzballs' inks
  keep (the rings lie 87.6 to 90.7 apart, the glyphs 60.3 to 64.7). The
  style library's spec holds `deltaE()`: 100 from black to white, the same
  either way, nothing from a color to itself, and violet and teal of one
  luminance 91 apart.
- Docs: the workspace's `AGENTS.md` (`src/view/colors/`, the contrast spec,
  `src/view/art/`), the content skill (a round kind's marks, two looks told
  apart by ink and by shape, a look read from the `BrickLook`), the testing
  skill (the pairs apart), the style library's `AGENTS.md` and the
  `angular-testing` skill (`deltaE()`).

Choices, where the plan was silent or the kit fell short:

- **Nothing of a bumper or a portal is left out under 30 CSS px wide.** At
  a phone's unit, 11 and 12 CSS px, drawn and looked at for every palette,
  the bumper's ticks, ring and cap and the portal's arms each stay a CSS
  pixel or more and read whole, and a portal's badge must show at every
  size, since it tells the pairs apart.
- **The portal's middle and its badge's disc are the marks' color,** the
  field's, where the kit fills the middle with the page's: Brick Breaker's
  palette has no page, and a portal reads as a hole in the field.
- **The badge's diamond is hollow,** as `portalMark()` draws it, where the
  kit's is solid, so it differs from the dot in shape at a phone's unit too
  (L1 chose it for Brick Fuzz Pop, and it serves here as well).
- **Drawn at the kit's size, inside the rules' disc:** the bumper's disc is
  0.4 of a unit round and the portal's ring 0.46 to its outer edge, where a
  ball meets either at 0.5; the bumper's ticks reach 0.54. A ball turns a
  CSS pixel or two before it touches the disc, at a window's unit.
- **The pairs are held apart by `deltaE()`, at the fuzzballs' 27,** rather
  than by contrast, which every tint shares, or by deepening one pair's ink,
  which would leave the kit's look; the badge is what a player who can't
  tell the inks apart reads.
- **In Soft pastel the accent is violet,** so a bumper and the first pair
  of portals share a hue there; they differ by shape, a disc and ticks
  against a ring with arms and a badge.

Added outside stream L's files: `@fz/style/testing`'s `deltaE()` and its
spec, a sentence of the style library's `AGENTS.md`;
`frontend/lib/phaser/src/color/inks.spec.ts` takes it in place of its own
`labOf()` and `deltaE()`; a line of the `angular-testing` skill.

Checks: the workspace's lint, typecheck and tests (77 files, 3,766
specs); `@fz/style`'s lint, typecheck and tests (308) and `@fz/phaser`'s
lint, typecheck and tests (921 in 60 files); and the root's lint, typecheck
and tests (172 files, 6,874 specs) under the lock. After the review's
answers: the workspace's again (3,768 specs), both libraries' tests, and the
root's lint and typecheck under the lock.

In the browser, on port 9104 at 1280 × 720 at 2× in Midnight blue: Pinball's
three bumpers, each a cyan disc with its ring and cap and four ticks, the
Ready card and the right panel picturing one; Wormhole's two portals,
violet rings with arms and a dot. The second pair, which no level yet lays,
was looked at drawn as SVG (`svgOf()`) beside the first and the bumper in
all four palettes, at units of 20 and 12 CSS px at 2× and 11 at 3×: the dot
and the diamond tell apart at every one.

The review (a fresh agent), each comment and its answer:

1. _The badge specs computed the badge's place at the kit's 40, where
   `portalMark()` puts it at 40.03, and passed inside their hundredth of a
   pixel by a thousandth._ Fixed: they find the badge's disc in the frame,
   the second circle in the marks' color, and what lies about its middle;
   a spec of its own holds where it sits, -45° and 40 of the kit's units
   from the middle, rounded.
2. _`looksOf()` gave no look for a kind the shared legend doesn't name, so
   the specs over every look would pass it untested._ Fixed: `placingsOf()`
   gives such a kind no pair and no heading (`NOWHERE`).
3. _The two squares' comments left out where `bumperMark()` and
   `portalMark()` differ from the kit beyond the disc and the ring._ Fixed:
   each names the rest, the bumper's shadow and ticks, the portal's dot and
   diamond.
4. _Two docs said `deltaE()` measures two colors of one luminance by hue._
   Fixed: the style library's `AGENTS.md` and the `angular-testing` skill
   say it measures any two in CIELAB, telling apart two of one luminance
   that `contrast()` can't.
5. _The log's checks left out `@fz/phaser`'s tests._ Fixed above.
6. _`deltaE(a, b)` named its colors as CIELAB names its axes, and
   `portalInks()` didn't say it throws._ Fixed: `deltaE(one, other)`, and
   the doc says it throws for a pair no level lays.

These answers correct the change rather than reshape it, so no second
review.
