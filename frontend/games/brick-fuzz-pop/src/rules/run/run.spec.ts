import type { RunStage } from "@fz/core/run";
import { FLIGHT_FIXTURES } from "../../testing/flight_fixtures";
import { levelStart } from "../levels/level";
import { LEVELS, levelEntryOf, parseLevel } from "../levels/levels";
import type { RoundOutcome } from "../round/round";
import { STAR_POINTS } from "../tuning";
import {
  type Run,
  afterLanding,
  createRun,
  isInProgress,
  landRound,
  levelOf,
  levelsCleared,
  nextLevel,
  takeDepth,
  openingOf,
  pause,
  resume,
  startLevel,
  takeRound,
} from "./run";
import { type Pars, parOf } from "./stars";

/** A round that leaves its level on, as the plain round made by hand does. */
const ON = FLIGHT_FIXTURES.plain.round.outcome;

/** A round that jumps the wall, as the zap made by hand does. */
const JUMPED = FLIGHT_FIXTURES.zap.round.outcome;

/** A round that clears its level. */
const CLEARED = FLIGHT_FIXTURES.cleared.round.outcome;

/** A round that loses its level. */
const LOST = FLIGHT_FIXTURES.lost.round.outcome;

/** Pars that differ by depth, as the levels' certificates may set them. */
const PARS_BY_DEPTH: Pars = { pips: { "11": 9, "14": 4, "16": 5 } };

/** Returns a new run at a level, on a field 11 deep. */
function runAt(level = 2): Run {
  return createRun({ id: 1, level, depth: 11 }, LEVELS);
}

/** Returns a run with rounds played on its level, each released and landed. */
function playedOn(run: Run, ...rounds: RoundOutcome[]): Run {
  return rounds.reduce(
    (played, round) => landRound(takeRound(played, round)),
    run,
  );
}

/** Returns a run at a level with its level under way and rounds played, each released and landed. */
function underWay(level = 2, ...rounds: RoundOutcome[]): Run {
  return playedOn(startLevel(runAt(level)), ...rounds);
}

/** Returns so many rounds that leave their level on. */
function roundsOf(count: number): RoundOutcome[] {
  return Array.from({ length: count }, () => ON);
}

/** Returns a run with its level at its stage, a run in each stage by the moves that bring it there. */
function runAtStage(outcome: RunStage): Run {
  switch (outcome) {
    case "ready":
      return runAt();
    case "playing":
      return underWay(2, ON);
    case "paused":
      return pause(underWay(2, ON));
    case "cleared":
      return underWay(2, ON, CLEARED);
    case "over":
      return underWay(2, ON, LOST);
    case "won":
      return underWay(LEVELS.length, CLEARED);
  }
}

describe("createRun", () => {
  it("starts a run at its level, waiting for the first move, with its par on the depth", () => {
    const run = createRun({ id: 7, level: 3, depth: 14 }, LEVELS);

    expect(run).toEqual({
      id: 7,
      lastLevel: LEVELS.length,
      firstLevel: 3,
      level: 3,
      depth: 14,
      par: parOf("pips", 14),
      rounds: 0,
      jumps: 0,
      banked: 0,
      stars: 0,
      score: 0,
      ending: null,
      outcome: "ready",
    });
  });

  it("reads par from the pars it is given", () => {
    const run = createRun(
      { id: 7, level: 3, depth: 14 },
      LEVELS,
      PARS_BY_DEPTH,
    );

    expect(run.par).toBe(4);
  });

  it("throws for a level the game doesn't have", () => {
    expect(() =>
      createRun({ id: 1, level: LEVELS.length + 1, depth: 11 }, LEVELS),
    ).toThrow(RangeError);
  });
});

describe("isInProgress", () => {
  it.each<[RunStage, boolean]>([
    ["ready", false],
    ["playing", true],
    ["paused", true],
    ["cleared", true],
    ["over", false],
    ["won", false],
  ])("says a run %s is in progress: %s", (outcome, inProgress) => {
    expect(isInProgress(runAtStage(outcome))).toBe(inProgress);
  });

  it.each<[string, Run]>([
    ["under way", startLevel(runAt())],
    ["paused", pause(startLevel(runAt()))],
  ])(
    "says a run %s on its first level with no round played isn't in progress",
    (_, run) => {
      expect(isInProgress(run)).toBe(false);
    },
  );

  it("says a run waiting at a level after one it cleared is in progress", () => {
    const run = nextLevel(runAtStage("cleared"), 11, LEVELS);

    expect(isInProgress(run)).toBe(true);
  });
});

describe("levelsCleared", () => {
  it.each<[RunStage, number]>([
    ["ready", 0],
    ["playing", 0],
    ["cleared", 1],
    ["over", 0],
  ])("counts a run %s as clearing %i", (outcome, cleared) => {
    expect(levelsCleared(runAtStage(outcome))).toBe(cleared);
  });

  it("counts the levels cleared since the first, the last cleared among them", () => {
    const run = underWay(LEVELS.length - 1, CLEARED);
    const next = startLevel(nextLevel(run, 11, LEVELS));
    const won = landRound(takeRound(next, CLEARED));

    expect([levelsCleared(run), levelsCleared(won)]).toEqual([1, 2]);
  });
});

describe("levelOf", () => {
  it("parses the level in play", () => {
    expect(levelOf(runAt(5), LEVELS)).toEqual(
      parseLevel(levelEntryOf(LEVELS, 5).data),
    );
  });
});

describe("openingOf", () => {
  it("lays the level in play out on the depth it began on", () => {
    const run = createRun({ id: 1, level: 5, depth: 17 }, LEVELS);
    const level = levelOf(run, LEVELS);

    expect(openingOf(run, level)).toEqual(levelStart(level, 17));
  });
});

describe("startLevel", () => {
  it("puts a level waiting for its first move under way", () => {
    expect(startLevel(runAt()).outcome).toBe("playing");
  });

  it.each<RunStage>(["playing", "paused", "cleared", "over", "won"])(
    "leaves a run %s as it is",
    (outcome) => {
      const run = runAtStage(outcome);

      expect(startLevel(run)).toBe(run);
    },
  );
});

describe("takeRound", () => {
  it("counts a round, its points and no jump", () => {
    const run = startLevel(runAt());

    const after = takeRound(run, ON);

    expect(after).toEqual({
      ...run,
      rounds: 1,
      jumps: 0,
      score: ON.points,
    });
  });

  it("counts a jump", () => {
    const run = underWay(2, ON);

    const after = takeRound(run, JUMPED);

    expect({ rounds: after.rounds, jumps: after.jumps }).toEqual({
      rounds: 2,
      jumps: 1,
    });
  });

  it("adds a round's points to the score", () => {
    const run = underWay(2, ON, JUMPED);

    expect(run.score).toBe(ON.points + JUMPED.points);
  });

  it.each([
    ["clears", CLEARED, "cleared"],
    ["loses", LOST, "lost"],
  ] as const)(
    "holds a round that %s its level under way until it lands, its points counted",
    (_, round, ending) => {
      const run = underWay(2, ON);

      const after = takeRound(run, round);

      expect(after).toMatchObject({
        rounds: 2,
        score: ON.points + round.points,
        ending,
        outcome: "playing",
      });
    },
  );

  it("takes no round while one that ends its level flies", () => {
    const run = takeRound(underWay(2, ON), CLEARED);

    expect(takeRound(run, ON)).toBe(run);
  });

  it.each<RunStage>(["ready", "paused", "cleared", "over", "won"])(
    "leaves a run %s as it is",
    (outcome) => {
      const run = runAtStage(outcome);

      expect(takeRound(run, ON)).toBe(run);
    },
  );
});

describe("landRound", () => {
  it("ends the run on a level lost, its points kept", () => {
    const run = takeRound(underWay(2, ON), LOST);

    const after = landRound(run);

    expect(after).toEqual({ ...run, ending: null, outcome: "over" });
  });

  it("clears a level within its par with three stars and their points", () => {
    const run = takeRound(underWay(2, ON), CLEARED);

    const after = landRound(run);

    expect(after).toEqual({
      ...run,
      stars: 3,
      score: ON.points + CLEARED.points + 3 * STAR_POINTS,
      ending: null,
      outcome: "cleared",
    });
  });

  it("clears a level in just its par of rounds with three stars' points", () => {
    const run = underWay(2, ...roundsOf(runAt().par - 1));

    const after = landRound(takeRound(run, CLEARED));

    expect(after.score - run.score).toBe(CLEARED.points + 3 * STAR_POINTS);
  });

  it("clears a level past its par with fewer stars' points", () => {
    const run = underWay(2, ...roundsOf(runAt().par + 3));

    const after = landRound(takeRound(run, CLEARED));

    expect(after.score - run.score).toBe(CLEARED.points + STAR_POINTS);
  });

  it("counts the stars of every level the run clears", () => {
    const second = startLevel(nextLevel(underWay(2, CLEARED), 11, LEVELS));

    const after = playedOn(second, ...roundsOf(second.par + 3), CLEARED);

    expect(after.stars).toBe(3 + 1);
  });

  it("wins the run on clearing the last level", () => {
    const run = takeRound(underWay(LEVELS.length), CLEARED);

    expect(landRound(run).outcome).toBe("won");
  });

  it("leaves a run whose round ends nothing as it is", () => {
    const run = takeRound(underWay(2, ON), ON);

    expect(landRound(run)).toBe(run);
  });

  it("lands no round while the run is paused", () => {
    const run = pause(takeRound(underWay(2, ON), CLEARED));

    expect(landRound(run)).toBe(run);
  });
});

describe("afterLanding", () => {
  it("lands a paused run's round in flight, as the saved game keeps it", () => {
    const run = pause(takeRound(underWay(2, ON), CLEARED));

    expect(afterLanding(run)).toMatchObject({
      ending: null,
      outcome: "cleared",
    });
  });

  it("leaves a run with no round ending its level as it is", () => {
    const run = runAtStage("paused");

    expect(afterLanding(run)).toBe(run);
  });
});

describe("nextLevel", () => {
  it("goes on to the level after the one cleared, its points banked, with its par on the depth", () => {
    const run = runAtStage("cleared");

    const next = nextLevel(run, 16, LEVELS);

    expect(next).toEqual({
      ...run,
      level: 3,
      depth: 16,
      par: parOf("pips", 16),
      rounds: 0,
      jumps: 0,
      banked: run.score,
      outcome: "ready",
    });
  });

  it("reads the next level's par from the pars it is given", () => {
    const next = nextLevel(runAtStage("cleared"), 16, LEVELS, PARS_BY_DEPTH);

    expect(next.par).toBe(5);
  });

  it.each<RunStage>(["ready", "playing", "paused", "over", "won"])(
    "leaves a run %s as it is",
    (outcome) => {
      const run = runAtStage(outcome);

      expect(nextLevel(run, 11, LEVELS)).toBe(run);
    },
  );
});

describe("takeDepth", () => {
  it("begins a level with no round played again on the depth, its par with it", () => {
    const run = createRun(
      { id: 1, level: 3, depth: 11 },
      LEVELS,
      PARS_BY_DEPTH,
    );

    expect(takeDepth(run, 16, LEVELS, PARS_BY_DEPTH)).toEqual({
      ...run,
      depth: 16,
      par: 5,
    });
  });

  it("throws for a level with no par on the depth", () => {
    const run = createRun({ id: 1, level: 3, depth: 11 }, LEVELS);

    expect(() => takeDepth(run, 16, LEVELS, { pips: { "11": 9 } })).toThrow(
      'Level "pips" has no par on a field 16 deep.',
    );
  });

  it("leaves a level with a round played on the depth it began on, and its par", () => {
    const run = underWay(2, ON);

    expect(takeDepth(run, 16, LEVELS)).toBe(run);
  });

  it("leaves a run on the depth it has as it is", () => {
    const run = runAt();

    expect(takeDepth(run, 11, LEVELS)).toBe(run);
  });
});

describe("pause", () => {
  it("pauses a level under way", () => {
    expect(pause(underWay()).outcome).toBe("paused");
  });

  it("pauses the flight of a round that ends its level, which goes on to land", () => {
    const run = takeRound(underWay(2, ON), LOST);

    const paused = pause(run);

    expect([paused.outcome, landRound(resume(paused)).outcome]).toEqual([
      "paused",
      "over",
    ]);
  });

  it.each<RunStage>(["ready", "paused", "cleared", "over", "won"])(
    "leaves a run %s as it is",
    (outcome) => {
      const run = runAtStage(outcome);

      expect(pause(run)).toBe(run);
    },
  );
});

describe("resume", () => {
  it("puts a paused level with rounds played under way again", () => {
    expect(resume(runAtStage("paused")).outcome).toBe("playing");
  });

  it("has a paused level with no round played wait for its first move again", () => {
    expect(resume(pause(underWay())).outcome).toBe("ready");
  });

  it.each<RunStage>(["ready", "playing", "cleared", "over", "won"])(
    "leaves a run %s as it is",
    (outcome) => {
      const run = runAtStage(outcome);

      expect(resume(run)).toBe(run);
    },
  );
});
