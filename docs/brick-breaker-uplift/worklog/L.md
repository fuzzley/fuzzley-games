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
