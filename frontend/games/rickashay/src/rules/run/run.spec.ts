import { FIRST_X } from "@fz/brick-wall/rules/field";
import { parOf } from "@fz/brick-wall/rules/par";
import { levelAt } from "@fz/brick-wall/rules/progress";
import {
  createRun,
  landRound,
  startLevel,
  takeRound,
} from "@fz/brick-wall/rules/run";
import { thirdsOf } from "@fz/brick-wall/rules/wall";
import { FLIGHT_FIXTURES } from "../../testing/flight_fixtures";
import warmUpMarks from "../../testing/warm_up_marks.json";
import { WARM_UP_LEVELS } from "../../testing/warm_up_levels";
import type { RoundOutcome } from "../flight/events";
import { parseLevel } from "../levels/levels";
import { STAR_POINTS } from "../tuning";
import {
  type Run,
  levelOf,
  levelStart,
  openingOf,
  runRulesOf,
  starsOf,
} from "./run";
import { UNTALLIED } from "./scoring";
import type { Marks } from "./stars";

/** Warm-up's marks, as a fixture of `marks/warm-up.json` holds them. */
const MARKS: Marks = warmUpMarks;

/** The run's rules over Warm-up's levels and marks. */
const RULES = runRulesOf(WARM_UP_LEVELS, MARKS);

/** A round that leaves its level on, a rally of 1, as the plain round made by hand does. */
const ON = FLIGHT_FIXTURES.plain.round.outcome;

/** A round that jumps the wall. */
const JUMPED = FLIGHT_FIXTURES.jumped.round.outcome;

/** A round of a rally of 11, which earns a floor bounce. */
const RALLY = FLIGHT_FIXTURES.rally.round.outcome;

/** A round that clears its level, a rally of 1. */
const CLEARED = FLIGHT_FIXTURES.cleared.round.outcome;

/** Returns a new run at a level, Side door unless another is given, on a field 11 deep, where its rally mark is 10. */
function runAt(level = 2): Run {
  return createRun({ id: 1, level, depth: 11 }, WARM_UP_LEVELS, RULES);
}

/** Returns a run on Side door with its level under way and rounds played, each released and landed. */
function underWay(...rounds: RoundOutcome[]): Run {
  return rounds.reduce(
    (played, round) => landRound(takeRound(played, round, RULES), RULES),
    startLevel(runAt()),
  );
}

/** Returns so many rounds that leave their level on. */
function roundsOf(count: number): RoundOutcome[] {
  return Array.from({ length: count }, () => ON);
}

/** Returns a run with its level cleared by a round, as the round lands. */
function cleared(run: Run): Run {
  return landRound(takeRound(run, CLEARED, RULES), RULES);
}

/** Returns what clearing the level in play adds to a run's score. */
function clearing(run: Run): number {
  return cleared(run).score - run.score;
}

describe("runRulesOf", () => {
  it("starts a run with its par on the depth from the marks, nothing tallied", () => {
    const run = createRun(
      { id: 7, level: 3, depth: 14 },
      WARM_UP_LEVELS,
      RULES,
    );

    expect({ par: run.par, tally: run.tally }).toEqual({
      par: parOf("columns", 14, MARKS.par),
      tally: UNTALLIED,
    });
  });

  it("tallies its rounds' jumps, the floor bounces they earned and their best rally", () => {
    const run = underWay(ON, JUMPED, RALLY, ON);

    expect(run.tally).toEqual({ jumps: 1, earned: 1, bestRally: 11 });
  });

  it("clears a level within its par with a flight at its rally mark with three stars and their points", () => {
    expect(clearing(underWay(RALLY))).toBe(CLEARED.points + 3 * STAR_POINTS);
  });

  it("clears a level within its par short of its rally mark with two stars' points", () => {
    expect(clearing(underWay(ON))).toBe(CLEARED.points + 2 * STAR_POINTS);
  });

  it("clears a level in just its par of rounds with the star for par", () => {
    const run = underWay(...roundsOf(runAt().par - 1));

    expect(clearing(run)).toBe(CLEARED.points + 2 * STAR_POINTS);
  });

  it("clears a level a round past its par, short of its mark, with one star's points", () => {
    const run = underWay(...roundsOf(runAt().par));

    expect(clearing(run)).toBe(CLEARED.points + STAR_POINTS);
  });

  it("clears a level past its par with a flight at its rally mark with two stars' points", () => {
    const run = underWay(RALLY, ...roundsOf(runAt().par));

    expect(clearing(run)).toBe(CLEARED.points + 2 * STAR_POINTS);
  });
});

describe("starsOf", () => {
  it("names the stars a level cleared earned", () => {
    const run = cleared(underWay(RALLY, ...roundsOf(runAt().par)));

    expect(starsOf(run, WARM_UP_LEVELS, MARKS)).toEqual({
      cleared: true,
      par: false,
      mark: true,
    });
  });

  it("names the stars of the last level, clearing which won the run", () => {
    const run = createRun(
      { id: 1, level: 9, depth: 11 },
      WARM_UP_LEVELS,
      RULES,
    );

    const won = cleared(startLevel(run));

    expect({
      outcome: won.outcome,
      stars: starsOf(won, WARM_UP_LEVELS, MARKS),
    }).toEqual({
      outcome: "won",
      stars: { cleared: true, par: true, mark: false },
    });
  });

  it("names none for a level not yet cleared", () => {
    expect(starsOf(underWay(RALLY), WARM_UP_LEVELS, MARKS)).toBeNull();
  });
});

describe("levelOf", () => {
  it("parses the level in play", () => {
    expect(levelOf(runAt(5), WARM_UP_LEVELS)).toEqual(
      parseLevel(levelAt(WARM_UP_LEVELS, 5).data),
    );
  });
});

describe("levelStart", () => {
  it("lays a level out with its wall where a jump would land it, the fuzzball at the floor's middle and a plain shot", () => {
    const level = levelOf(runAt(5), WARM_UP_LEVELS);

    expect(levelStart(level, 17)).toEqual({
      wall: {
        bricks: level.bricks,
        rows: level.rows,
        lowestRow: thirdsOf(17).opensOn,
      },
      depth: 17,
      x: FIRST_X,
      hot: false,
    });
  });
});

describe("openingOf", () => {
  it("lays the level in play out on the depth it began on", () => {
    const run = createRun(
      { id: 1, level: 5, depth: 17 },
      WARM_UP_LEVELS,
      RULES,
    );
    const level = levelOf(run, WARM_UP_LEVELS);

    expect(openingOf(run, level)).toEqual(levelStart(level, 17));
  });
});
