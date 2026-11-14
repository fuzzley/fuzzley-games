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
