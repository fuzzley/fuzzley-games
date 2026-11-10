# The Rickashay sketch

Throwaway code written to test [the design](../design.md) before any of the
game exists: the flight with its cut corners, the eleven kinds of brick, the
rally and its floor bounces, the wall's step and its jump, the hot shot, a
solver and three players. It is not the game's code and isn't meant to
become it. Nothing lints or type-checks it, it has no specs, and it is
written to be short. It is kept so the design's numbers can be made again.

It proves nothing about the game, whose rules aren't written. It says the
design can be built, that the draft levels in [`../levels/`](../levels/) can
be cleared under rules like the design's, and how long a flight a player
can expect on them.

It was written from the design alone. No other game's code was read for it.

## Running it

With Node 26, from this folder; nothing to install.
[`results.md`](results.md) is what both printed for the design.

- `node report.mjs` prints the table in the design's "The drafts": each
  level's bricks and hits, the solver's rounds over field depths 11 to 22,
  how the careless player did on each, how long its flights were, how wide
  a run of aims gives a long flight, and how often aims drawn blind clear
  the level. It plays the levels side by side, a process each, and takes
  about 80 seconds on twenty-four cores. `node report.mjs quick` plays four
  depths and twelve games in about 20.
- `node flights.mjs` prints the figures in the design's "The sketch": how
  long flights are, in strikes, units and seconds, what earns and spends a
  floor bounce, where a bored flight gives up, what a hot shot adds, what
  an aim is worth, what a guide of each length lets a player plan, and
  what cut corners change against round ones. It also checks every flight
  it flies for one that passed through a brick or left the field. About
  six minutes.

Both give the same numbers every run, but the times they print.

## What is in it

- `sim.mjs`: a wall from a level's picture (`makeState()`), a flight
  (`fly()`) and a round (`shoot()`). The flight casts to the next face the
  fuzzball's middle meets: the flats a quarter of a unit off each brick's
  sides, the 45° cuts across its corners, a ramp's and a gem's long faces, a
  hatch's bar and a portal's eye. Then the strike, the rally and its
  floor bounces, and the wall's step or its jump (`jumpOf()`, `startOf()`).
  `TUNING` holds the numbers the reports vary.
- `solve.mjs`: `solve()`, a beam search for a line of shots that clears a
  level; `casual()`, the careless player, which looks at sixteen aims drawn
  from a seed each round and plays the best; `blind()`, which plays any aim;
  `guided()`, which sees only a flight's first few turns, as an aim guide of
  that length would show them; and `everyAim()` and `sweetSpot()`, which
  measure how much room a hand has to find a long flight.
- `levels.mjs`: the drafts, read from `../levels/`.
- `report.mjs` and `flights.mjs`: the two reports.

The art and the mocks fly their pictures' flights with `sim.mjs` too
([`../art/make-art.mjs`](../art/make-art.mjs),
[`../mocks/make-mocks.mjs`](../mocks/make-mocks.mjs)), so a path drawn there
is one the sketch flew.

## Where it differs from the design

- **Aims are made with `Math.cos()` and `Math.sin()`.** The design's are
  written out as numbers, so every browser flies them alike.
- **A 45° face stands off by a number written out,** a quarter of a unit
  times the square root of 2. The design writes it out the same way; the
  game should hold it in `tuning.ts` beside the aims.
- **A field keeps its depth for the whole level.** The design lets the
  depth follow the room between rounds, as Brick Fuzz Pop's does.
- **Nothing is scored.** The design's points, its stars and a level's rally
  mark aren't here; `report.mjs` prints what the mark is set from, the
  careless player's best rally in a game, at the middle.
- **Nothing has a speed.** A flight is measured in units flown; the
  flight's quickening and its dash home are the scene's. `flights.mjs`
  reckons a flight's seconds from the design's speeds afterwards, with its
  strikes taken as spread evenly along it.
- **The solver is a greedy search,** with a beam of four over every other
  aim where that fails, then of eight over every aim. The design's
  `certify:levels` may widen further.
- **Round corners are still in it,** behind `TUNING.roundCorners`, so
  `flights.mjs` can set them beside the design's cut ones.
