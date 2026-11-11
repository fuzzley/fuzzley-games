# The Brick Fuzz Pop sketch

Throwaway code written to test the design in [the plan](../plan.md) before
any of the game exists: the flight, the bricks, the wall's step and its
jump, the two boons, a solver and a careless player. It is not the game's
code and isn't meant to become it. Nothing lints or type-checks it, it has
no specs, and it is written to be short. It is kept so the plan's numbers
can be made again.

It proves nothing about the game, whose rules aren't written. It says the
design can be built, and that the draft levels in [`../levels/`](../levels/)
can be cleared under rules like the plan's.

## Running it

With Node 26, from this folder; nothing to install.
[`results.md`](results.md) is what both printed for the plan.

- `node report.mjs` prints the tables in the plan's "The drafts": each
  level's bricks and hits, the fewest and the most rounds the solver took
  over field depths 11 to 22, and how the careless player did on each. It
  plays the levels side by side, a process each, and takes about four
  minutes on twenty-four cores.
- `node flights.mjs` prints the figures in the plan's "The sketch": how far
  fuzzballs flew, what they broke with a boon and without, how often the
  wall jumped and which charges were chosen. About a minute.

Both give the same numbers every run, but the times they print.

## What is in it

- `sim.mjs`: a wall from a level's picture (`makeState()`), and a round
  played on it (`shoot()`): the flight by casting to the next thing met,
  the strike and charge, zaps, friends, prisms, bumpers and portals, the
  hot shot and the triple shot, then the wall's step or its jump
  (`jumpOf()`, `startOf()`).
- `solve.mjs`: `solve()`, a beam search for a line of shots that clears a
  level, and `casual()`, the careless player, which looks at sixteen shots
  drawn from a seed each round and plays the best.
- `levels.mjs`: the drafts, read from `../levels/`.
- `report.mjs` and `flights.mjs`: the two reports.

## Where it differs from the plan

- **Aims are a degree apart,** 165 of them, made with `Math.cos()` and
  `Math.sin()`. The plan's are a quarter of a degree apart and written out
  as numbers, so every browser flies them alike.
- **A zap lands at once,** not half a unit of flight after the break that
  set it off.
- **A corner turns a fuzzball where both faces beside it are open.** The
  plan also asks that nothing stand across the corner, as Brick Breaker's
  `exposureOf()` does.
- **A fuzzball out of a portal can't go back into that one until it has
  turned off something.** The plan keeps it out of every portal until then.
- **Nothing caps the friends or the fuzzballs in flight.** The plan allows
  six friends and sixteen fuzzballs.
- **A field keeps its depth for the whole level.** The plan lets the depth
  follow the room between rounds.
- **The solver is a greedy search,** with a beam of four where that fails.
  The plan's `certify:levels` widens further.
