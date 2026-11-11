import { createRandom } from "@fz/core/random";
import {
  type RandomFlight,
  clearanceProblemsOf,
  randomFlight,
} from "../../../testing/random_flights";
import { SIM_TIMEOUT_MS } from "../../../testing/timing";
import { shotOf } from "../../levels/certificate";
import {
  type Round,
  type RoundStart,
  flightStartOf,
  playRoundBy,
} from "../../round/round";
import { FRIEND_INKS } from "../../tuning";
import type { Wall } from "../../wall/wall";
import type { FlightStart } from "../flight";

/** The seeds of the ten batches, a thousand shots each. */
const SEEDS = Array.from({ length: 10 }, (_, batch) => 20261120 + batch);

/** How many seeded random shots each seed plays. */
const SHOTS = 1000;

// Ten thousand seeded random shots at random walls through playRound()'s
// own path, as plan.md's Q2 asks, in ten batches so each keeps well inside
// a spec's time. Each wall is drawn with its kinds' rules, the catalog's or
// the specs' stand-ins', which playRoundBy() flies a round by as playRound()
// flies it by the catalog's.
describe("playRound, on random walls", { timeout: SIM_TIMEOUT_MS }, () => {
  it("starts each round as its random flight starts, its boon and crew among it", () => {
    const random = createRandom(SEEDS[0] ?? 0);
    const flights = Array.from({ length: SHOTS }, () => randomFlight(random));

    const starts = flights.map(({ start }) =>
      flightStartOf(roundOf(start), shotOf([start.aim, start.charge])),
    );

    expect(starts).toEqual(flights.map(({ start }) => start));
  });

  it.each(SEEDS)(
    "plays every shot without throwing, clear of the bricks, the caps never reached (seed %i)",
    (seed) => {
      const random = createRandom(seed);
      const flights = Array.from({ length: SHOTS }, () => randomFlight(random));

      const problems = flights.flatMap((flight, shot) =>
        problemsOf(flight).map((problem) => `Shot ${String(shot)}: ${problem}`),
      );

      expect(problems).toEqual([]);
    },
  );
});

/** Returns where a round starts that sends its fuzzballs off as a random flight does: its boon from the hot shot or the mates, a friend for each of its friends. */
function roundOf(start: FlightStart): RoundStart {
  return {
    wall: start.wall,
    depth: start.depth,
    x: start.x,
    crew: {
      friends: Array.from(
        { length: start.friends },
        (_, friend) => friend % FRIEND_INKS,
      ),
    },
    boon: start.hot ? "hot" : start.mates > 0 ? "triple" : null,
  };
}

/**
 * Returns what is wrong with a random flight's shot played as a round: that
 * it threw, a fuzzball came nearer a brick than it may, or the caps brought
 * fuzzballs home; none for a round that plays through.
 */
function problemsOf({ start, rules }: RandomFlight): string[] {
  let round: Round;
  try {
    round = playRoundBy(
      roundOf(start),
      shotOf([start.aim, start.charge]),
      "hot",
      rules,
    );
  } catch (error) {
    return [
      `threw ${error instanceof Error ? (error.stack ?? "") : String(error)}`,
    ];
  }
  const { flight } = round;
  return [
    ...clearanceProblemsOf(
      flight,
      standing(start.wall, round),
      start.depth,
      rules.kinds,
    ),
    ...(flight.capped > 0 ? [`${String(flight.capped)} capped`] : []),
  ];
}

/** Returns the bricks of a wall that stood all through a round's flight: every one it didn't break. */
function standing(wall: Wall, { flight }: Round): Wall {
  const broken = new Set(
    flight.events.flatMap((event) =>
      event.kind === "break" ? [event.cell] : [],
    ),
  );
  return {
    ...wall,
    bricks: wall.bricks.map((brick, cell) => (broken.has(cell) ? null : brick)),
  };
}
