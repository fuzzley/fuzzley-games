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
