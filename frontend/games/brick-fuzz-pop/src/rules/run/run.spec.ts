import { parOf } from "@fz/brick-wall/rules/par";
import {
  createRun,
  landRound,
  startLevel,
  takeRound,
} from "@fz/brick-wall/rules/run";
import { levelAt } from "@fz/core/levels";
import { FLIGHT_FIXTURES } from "../../testing/flight_fixtures";
import { LEVELS, levelStart, parseLevel } from "../levels/levels";
import type { RoundOutcome } from "../round/round";
import { STAR_POINTS } from "../tuning";
import { RUN_RULES, type Run, levelOf, openingOf } from "./run";
import { PARS } from "./stars";

/** A round that leaves its level on, as the plain round made by hand does. */
const ON = FLIGHT_FIXTURES.plain.round.outcome;

/** A round that jumps the wall, as the zap made by hand does. */
const JUMPED = FLIGHT_FIXTURES.zap.round.outcome;

/** A round that clears its level. */
const CLEARED = FLIGHT_FIXTURES.cleared.round.outcome;

/** Returns a new run at a level, on a field 11 deep. */
function runAt(level = 2): Run {
  return createRun({ id: 1, level, depth: 11 }, LEVELS, RUN_RULES);
}

/** Returns a run at a level with its level under way and rounds played, each released and landed. */
function underWay(level = 2, ...rounds: RoundOutcome[]): Run {
  return rounds.reduce(
    (played, round) =>
      landRound(takeRound(played, round, RUN_RULES), RUN_RULES),
    startLevel(runAt(level)),
  );
}

/** Returns so many rounds that leave their level on. */
function roundsOf(count: number): RoundOutcome[] {
  return Array.from({ length: count }, () => ON);
}

/** Returns what clearing the level in play adds to a run's score. */
function clearing(run: Run): number {
  const after = landRound(takeRound(run, CLEARED, RUN_RULES), RUN_RULES);
  return after.score - run.score;
}

describe("RUN_RULES", () => {
  it("starts a run with its par on the depth from the levels' pars, no jump counted", () => {
    const run = createRun({ id: 7, level: 3, depth: 14 }, LEVELS, RUN_RULES);

    expect({ par: run.par, tally: run.tally }).toEqual({
      par: parOf("pips", 14, PARS),
      tally: { jumps: 0 },
    });
  });

  it("counts the rounds that jump the wall", () => {
    const run = underWay(2, ON, JUMPED, ON, JUMPED);

    expect(run.tally).toEqual({ jumps: 2 });
  });

  it("clears a level within its par with three stars and their points", () => {
    const run = underWay(2, ON);

    const after = landRound(takeRound(run, CLEARED, RUN_RULES), RUN_RULES);

    expect({ stars: after.stars, score: after.score - run.score }).toEqual({
      stars: 3,
      score: CLEARED.points + 3 * STAR_POINTS,
    });
  });

  it("clears a level in just its par of rounds with three stars' points", () => {
    const run = underWay(2, ...roundsOf(runAt().par - 1));

    expect(clearing(run)).toBe(CLEARED.points + 3 * STAR_POINTS);
  });

  it("clears a level a round past its par with two stars' points", () => {
    const run = underWay(2, ...roundsOf(runAt().par));

    expect(clearing(run)).toBe(CLEARED.points + 2 * STAR_POINTS);
  });

  it("clears a level further past its par with one star's points", () => {
    const run = underWay(2, ...roundsOf(runAt().par + 3));

    expect(clearing(run)).toBe(CLEARED.points + STAR_POINTS);
  });
});

describe("levelOf", () => {
  it("parses the level in play", () => {
    expect(levelOf(runAt(5), LEVELS)).toEqual(
      parseLevel(levelAt(LEVELS, 5).data),
    );
  });
});

describe("openingOf", () => {
  it("lays the level in play out on the depth it began on", () => {
    const run = createRun({ id: 1, level: 5, depth: 17 }, LEVELS, RUN_RULES);
    const level = levelOf(run, LEVELS);

    expect(openingOf(run, level)).toEqual(levelStart(level, 17));
  });
});
