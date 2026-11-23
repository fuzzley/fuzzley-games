import type { RunStage } from "@fz/core/run";
import type { Pars } from "./par";
import {
  type Run,
  type RunRules,
  type TakenRound,
  afterLanding,
  createRun,
  isInProgress,
  isLevelCleared,
  landRound,
  levelsCleared,
  nextLevel,
  pause,
  resume,
  startLevel,
  takeDepth,
  takeRound,
} from "./run";

/** What the spec's game tallies of a level's rounds: how many jumped the wall, and its longest streak. */
interface Tally {
  readonly jumps: number;
  readonly longest: number;
}

/** A round of the spec's game as its run takes it in: whether it jumped, and its streak. */
interface Played extends TakenRound {
  readonly jumped: boolean;
  readonly streak: number;
}

/** Five levels made up for the spec, "a" to "e", numbered 1 to 5. */
const LEVELS = ["a", "b", "c", "d", "e"].map((id) => ({ data: { id } }));

/** Each level's par, which differs by depth, as a game's certificates may set it. */
const PARS: Pars = {
  a: { "11": 4, "16": 5 },
  b: { "11": 3, "14": 4, "16": 6 },
  c: { "11": 2, "16": 7 },
  d: { "11": 3, "16": 3 },
  e: { "11": 2, "16": 2 },
};

/** The streak that earns a star of the spec's game whose stars are three flags. */
const MARK = 10;

/**
 * The rules of a game whose stars are three flags: one for clearing the
 * level, one for clearing it within par, and one for a streak at the mark.
 */
const FLAGS: RunRules<Tally, Played> = {
  pars: PARS,
  untallied: { jumps: 0, longest: 0 },
  tallied: ({ jumps, longest }, { jumped, streak }) => ({
    jumps: jumps + (jumped ? 1 : 0),
    longest: Math.max(longest, streak),
  }),
  starsOf: ({ rounds, par, tally }) =>
    1 + (rounds <= par ? 1 : 0) + (tally.longest >= MARK ? 1 : 0),
  starPoints: 200,
};

/** The rules of a game whose stars are tiers by the rounds past par: 3 within it, 2 a round past, else 1. */
const TIERS: RunRules<Tally, Played> = {
  ...FLAGS,
  starsOf: ({ rounds, par }) => {
    if (rounds <= par) return 3;
    return rounds <= par + 1 ? 2 : 1;
  },
  starPoints: 50,
};

/** A round that leaves its level on, with a short streak. */
const ON: Played = { points: 30, result: "on", jumped: false, streak: 3 };

/** A round that jumps the wall, with a streak at the mark. */
const JUMPED: Played = { points: 140, result: "on", jumped: true, streak: 10 };

/** A round that clears its level. */
const CLEARED: Played = {
  points: 60,
  result: "cleared",
  jumped: false,
  streak: 4,
};

/** A round that loses its level. */
const LOST: Played = { points: 10, result: "lost", jumped: false, streak: 1 };

/** Returns a new run at a level, on a field 11 deep. */
function runAt(level = 2): Run<Tally> {
  return createRun({ id: 1, level, depth: 11 }, LEVELS, FLAGS);
}

/** Returns a run with rounds played on its level, each released and landed. */
function playedOn(
  run: Run<Tally>,
  rules: RunRules<Tally, Played>,
  ...rounds: Played[]
): Run<Tally> {
  return rounds.reduce(
    (played, round) => landRound(takeRound(played, round, rules), rules),
    run,
  );
}

/** Returns a run at a level with its level under way and rounds played, each released and landed. */
function underWay(level = 2, ...rounds: Played[]): Run<Tally> {
  return playedOn(startLevel(runAt(level)), FLAGS, ...rounds);
}

/** Returns so many rounds that leave their level on. */
function roundsOf(count: number): Played[] {
  return Array.from({ length: count }, () => ON);
}

/** Returns a run with its level at its stage, a run in each stage by the moves that bring it there. */
function runAtStage(outcome: RunStage): Run<Tally> {
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
  it("starts a run at its level, waiting for the first move, with its par on the depth and nothing tallied", () => {
    const run = createRun({ id: 7, level: 2, depth: 14 }, LEVELS, FLAGS);

    expect(run).toEqual({
      id: 7,
      lastLevel: 5,
      firstLevel: 2,
      level: 2,
      depth: 14,
      par: 4,
      rounds: 0,
      tally: { jumps: 0, longest: 0 },
      banked: 0,
      stars: 0,
      score: 0,
      ending: null,
      outcome: "ready",
    });
  });

  it("throws for a level the game doesn't have", () => {
    expect(() =>
      createRun({ id: 1, level: 6, depth: 11 }, LEVELS, FLAGS),
    ).toThrow(
      new RangeError("There is no level 6: the levels run from 1 to 5."),
    );
  });

  it("throws for a level with no par on the depth", () => {
    expect(() =>
      createRun({ id: 1, level: 1, depth: 14 }, LEVELS, FLAGS),
    ).toThrow(new RangeError('Level "a" has no par on a field 14 deep.'));
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

  it.each<[string, Run<Tally>]>([
    ["under way", startLevel(runAt())],
    ["paused", pause(startLevel(runAt()))],
  ])(
    "says a run %s on its first level with no round played isn't in progress",
    (_, run) => {
      expect(isInProgress(run)).toBe(false);
    },
  );

  it("says a run waiting at a level after one it cleared is in progress", () => {
    const run = nextLevel(runAtStage("cleared"), 11, LEVELS, FLAGS);

    expect(isInProgress(run)).toBe(true);
  });
});

describe("isLevelCleared", () => {
  it.each<[RunStage, boolean]>([
    ["ready", false],
    ["playing", false],
    ["paused", false],
    ["cleared", true],
    ["over", false],
    ["won", true],
  ])("says a level %s is cleared: %s", (outcome, cleared) => {
    expect(isLevelCleared({ outcome })).toBe(cleared);
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
    const next = startLevel(nextLevel(run, 11, LEVELS, FLAGS));
    const won = playedOn(next, FLAGS, CLEARED);

    expect([levelsCleared(run), levelsCleared(won)]).toEqual([1, 2]);
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
  it("counts a round, scores its points and tallies it", () => {
    const run = startLevel(runAt());

    const after = takeRound(run, ON, FLAGS);

    expect(after).toEqual({
      ...run,
      rounds: 1,
      tally: { jumps: 0, longest: 3 },
      score: ON.points,
    });
  });

  it("tallies each round of the level through the game's rules", () => {
    const run = underWay(2, ON, JUMPED);

    const after = takeRound(run, ON, FLAGS);

    expect({ rounds: after.rounds, tally: after.tally }).toEqual({
      rounds: 3,
      tally: { jumps: 1, longest: 10 },
    });
  });

  it("adds a round's points to the score", () => {
    const run = underWay(2, ON, JUMPED);

    expect(run.score).toBe(ON.points + JUMPED.points);
  });

  it("leaves the round it is handed as it was", () => {
    const round = { ...JUMPED };

    takeRound(startLevel(runAt()), round, FLAGS);

    expect(round).toEqual(JUMPED);
  });

  it.each([
    ["clears", CLEARED, "cleared"],
    ["loses", LOST, "lost"],
  ] as const)(
    "holds a round that %s its level under way until it lands, its points counted",
    (_, round, ending) => {
      const run = underWay(2, ON);

      const after = takeRound(run, round, FLAGS);

      expect(after).toMatchObject({
        rounds: 2,
        score: ON.points + round.points,
        ending,
        outcome: "playing",
      });
    },
  );

  it("takes no round while one that ends its level flies", () => {
    const run = takeRound(underWay(2, ON), CLEARED, FLAGS);

    expect(takeRound(run, ON, FLAGS)).toBe(run);
  });

  it.each<RunStage>(["ready", "paused", "cleared", "over", "won"])(
    "leaves a run %s as it is",
    (outcome) => {
      const run = runAtStage(outcome);

      expect(takeRound(run, ON, FLAGS)).toBe(run);
    },
  );
});

describe("landRound", () => {
  it("ends the run on a level lost, its points kept", () => {
    const run = takeRound(underWay(2, ON), LOST, FLAGS);

    const after = landRound(run, FLAGS);

    expect(after).toEqual({ ...run, ending: null, outcome: "over" });
  });

  it("clears a level with the stars the game's rules give it, and their points", () => {
    const run = takeRound(underWay(2, ON), CLEARED, FLAGS);

    const after = landRound(run, FLAGS);

    expect(after).toEqual({
      ...run,
      stars: 2,
      score: ON.points + CLEARED.points + 2 * 200,
      ending: null,
      outcome: "cleared",
    });
  });

  it("hands the game's rules the level as played, its tally among it", () => {
    const run = underWay(2, ON, JUMPED);

    const after = landRound(takeRound(run, CLEARED, FLAGS), FLAGS);

    expect(after.stars).toBe(3);
  });

  it("gives a level cleared past its par fewer stars, as the game's rules say", () => {
    const run = underWay(2, ...roundsOf(runAt().par));

    const after = landRound(takeRound(run, CLEARED, FLAGS), FLAGS);

    expect(after.score - run.score).toBe(CLEARED.points + 200);
  });

  it("gives a level the stars another game's rules give it, at its own points", () => {
    const run = playedOn(startLevel(runAt()), TIERS, ON, ON, ON);

    const after = landRound(takeRound(run, CLEARED, TIERS), TIERS);

    expect({ stars: after.stars, score: after.score - run.score }).toEqual({
      stars: 2,
      score: CLEARED.points + 2 * 50,
    });
  });

  it("counts the stars of every level the run clears", () => {
    const second = startLevel(
      nextLevel(underWay(2, JUMPED, CLEARED), 11, LEVELS, FLAGS),
    );

    const after = playedOn(second, FLAGS, ...roundsOf(second.par), CLEARED);

    expect(after.stars).toBe(3 + 1);
  });

  it("wins the run on clearing the last level", () => {
    const run = takeRound(underWay(LEVELS.length), CLEARED, FLAGS);

    expect(landRound(run, FLAGS).outcome).toBe("won");
  });

  it("leaves a run whose round ends nothing as it is", () => {
    const run = takeRound(underWay(2, ON), ON, FLAGS);

    expect(landRound(run, FLAGS)).toBe(run);
  });

  it("lands no round while the run is paused", () => {
    const run = pause(takeRound(underWay(2, ON), CLEARED, FLAGS));

    expect(landRound(run, FLAGS)).toBe(run);
  });
});

describe("afterLanding", () => {
  it("lands a paused run's round in flight, as a saved game keeps it", () => {
    const run = pause(takeRound(underWay(2, ON), CLEARED, FLAGS));

    expect(afterLanding(run, FLAGS)).toMatchObject({
      stars: 2,
      ending: null,
      outcome: "cleared",
    });
  });

  it("leaves a run with no round ending its level as it is", () => {
    const run = runAtStage("paused");

    expect(afterLanding(run, FLAGS)).toBe(run);
  });
});

describe("nextLevel", () => {
  it("goes on to the level after the one cleared, its points banked, with its par on the depth and nothing tallied", () => {
    const run = underWay(2, JUMPED, CLEARED);

    const next = nextLevel(run, 16, LEVELS, FLAGS);

    expect(next).toEqual({
      ...run,
      level: 3,
      depth: 16,
      par: 7,
      rounds: 0,
      tally: { jumps: 0, longest: 0 },
      banked: run.score,
      outcome: "ready",
    });
  });

  it.each<RunStage>(["ready", "playing", "paused", "over", "won"])(
    "leaves a run %s as it is",
    (outcome) => {
      const run = runAtStage(outcome);

      expect(nextLevel(run, 11, LEVELS, FLAGS)).toBe(run);
    },
  );
});

describe("takeDepth", () => {
  it("begins a level with no round played again on the depth, its par with it", () => {
    const run = runAt(3);

    expect(takeDepth(run, 16, LEVELS, FLAGS)).toEqual({
      ...run,
      depth: 16,
      par: 7,
    });
  });

  it("throws for a level with no par on the depth", () => {
    const run = runAt(3);

    expect(() => takeDepth(run, 14, LEVELS, FLAGS)).toThrow(
      new RangeError('Level "c" has no par on a field 14 deep.'),
    );
  });

  it("leaves a level with a round played on the depth it began on, and its par", () => {
    const run = underWay(2, ON);

    expect(takeDepth(run, 16, LEVELS, FLAGS)).toBe(run);
  });

  it("leaves a run on the depth it has as it is", () => {
    const run = runAt();

    expect(takeDepth(run, 11, LEVELS, FLAGS)).toBe(run);
  });
});

describe("pause", () => {
  it("pauses a level under way", () => {
    expect(pause(underWay()).outcome).toBe("paused");
  });

  it("pauses the flight of a round that ends its level, which goes on to land", () => {
    const run = takeRound(underWay(2, ON), LOST, FLAGS);

    const paused = pause(run);

    expect([paused.outcome, landRound(resume(paused), FLAGS).outcome]).toEqual([
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
