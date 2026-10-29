import {
  type Outcome,
  type Run,
  clearLevel,
  createRun,
  gainLives,
  hasEnded,
  levelSeed,
  loseLife,
  pause,
  resume,
  startLevel,
  tally,
} from "./run";
import {
  CLEAN_POINTS,
  CLEAR_POINTS,
  FIRST_LIFE_POINTS,
  FIRST_LIVES,
  LIFE_POINTS,
  MAX_LIVES,
} from "./tuning";

/** Returns a run of ten levels at Normal, from the first, waiting, changed as given. */
function runWith(changes: Partial<Run> = {}): Run {
  const run = createRun({
    id: 1,
    seed: 42,
    speed: "normal",
    lastLevel: 10,
    level: 1,
  });
  return { ...run, ...changes };
}

/** Returns a run with a level in play, changed as given. */
function playing(changes: Partial<Run> = {}): Run {
  return runWith({ outcome: "playing", ...changes });
}

/** The outcomes of a run with no level under way. */
const NOT_UNDER_WAY: readonly Outcome[] = ["ready", "cleared", "over", "won"];

describe("createRun", () => {
  it("waits at its first level, with its first lives and no points", () => {
    const run = createRun({
      id: 7,
      seed: 3,
      speed: "fast",
      lastLevel: 30,
      level: 4,
    });

    expect(run).toEqual({
      id: 7,
      seed: 3,
      speed: "fast",
      lastLevel: 30,
      firstLevel: 4,
      level: 4,
      banked: 0,
      score: 0,
      lives: FIRST_LIVES,
      nextLifeAt: FIRST_LIFE_POINTS,
      outcome: "ready",
    });
  });
});

describe("startLevel", () => {
  it("starts the first level", () => {
    expect(startLevel(runWith()).outcome).toBe("playing");
  });

  it("starts the level after one cleared", () => {
    const run = startLevel(runWith({ level: 3, outcome: "cleared" }));

    expect({ level: run.level, outcome: run.outcome }).toEqual({
      level: 4,
      outcome: "playing",
    });
  });

  it.each(["playing", "paused", "over", "won"] as const)(
    "leaves a run %s as it is",
    (outcome) => {
      const run = runWith({ outcome });

      expect(startLevel(run)).toBe(run);
    },
  );
});

describe("pause", () => {
  it("pauses a level in play", () => {
    expect(pause(playing()).outcome).toBe("paused");
  });

  it("leaves a run with no level in play as it is", () => {
    const run = runWith();

    expect(pause(run)).toBe(run);
  });
});

describe("resume", () => {
  it("goes on with a paused level", () => {
    expect(resume(runWith({ outcome: "paused" })).outcome).toBe("playing");
  });

  it("leaves a run that isn't paused as it is", () => {
    const run = playing();

    expect(resume(run)).toBe(run);
  });
});

describe("tally", () => {
  it("adds the level's points to those banked", () => {
    const run = tally(playing({ banked: 3000, score: 3200 }), 450);

    expect(run.score).toBe(3450);
  });

  it("tallies a paused level too", () => {
    const run = tally(runWith({ outcome: "paused" }), 450);

    expect(run.score).toBe(450);
  });

  it("brings a life at the first mark", () => {
    const run = tally(playing(), FIRST_LIFE_POINTS);

    expect({ lives: run.lives, next: run.nextLifeAt }).toEqual({
      lives: FIRST_LIVES + 1,
      next: FIRST_LIFE_POINTS + LIFE_POINTS,
    });
  });

  it("brings a life for each mark passed at once", () => {
    const run = tally(playing(), FIRST_LIFE_POINTS + LIFE_POINTS);

    expect(run.lives).toBe(FIRST_LIVES + 2);
  });

  it("spends a mark passed with the most lives a player holds", () => {
    const run = tally(playing({ lives: MAX_LIVES }), FIRST_LIFE_POINTS);

    expect({ lives: run.lives, next: run.nextLifeAt }).toEqual({
      lives: MAX_LIVES,
      next: FIRST_LIFE_POINTS + LIFE_POINTS,
    });
  });
});

describe("gainLives", () => {
  it("adds the lives capsules brought", () => {
    expect(gainLives(playing(), 1).lives).toBe(FIRST_LIVES + 1);
  });

  it("adds no more than the most a player holds", () => {
    expect(gainLives(playing(), 9).lives).toBe(MAX_LIVES);
  });
});

describe("loseLife", () => {
  it("goes on with lives left", () => {
    const run = loseLife(playing({ lives: 2 }));

    expect({ lives: run.lives, outcome: run.outcome }).toEqual({
      lives: 1,
      outcome: "playing",
    });
  });

  it("ends the run with the last", () => {
    expect(loseLife(playing({ lives: 1 })).outcome).toBe("over");
  });
});

describe("clearLevel", () => {
  it.each([
    ["without losing a life", 0, CLEAR_POINTS + CLEAN_POINTS],
    ["having lost one", 1, CLEAR_POINTS],
  ])(
    "banks the level's points, %s, and what clearing adds",
    (_, lost, bonus) => {
      const before = playing({ banked: 2000, score: 2100 });

      const run = clearLevel(before, 600, lost);

      expect({
        score: run.score,
        banked: run.banked,
        outcome: run.outcome,
      }).toEqual({
        score: 2600 + bonus,
        banked: 2600 + bonus,
        outcome: "cleared",
      });
    },
  );

  it("wins the run on the last level", () => {
    const run = clearLevel(playing({ level: 10 }), 0, 0);

    expect(run.outcome).toBe("won");
  });

  it("brings the lives its points pass", () => {
    const before = playing({ banked: FIRST_LIFE_POINTS - 1000 });

    const run = clearLevel(before, 0, 0);

    expect(run.lives).toBe(FIRST_LIVES + 1);
  });

  it("keeps a run over that a blast clears the level of after its last life", () => {
    const over = loseLife(playing({ lives: 1, banked: 2000, score: 2600 }));

    const run = clearLevel(over, 600, 1);

    expect(run).toBe(over);
  });
});

describe.each<[string, (run: Run) => Run]>([
  ["tally", (run) => tally(run, FIRST_LIFE_POINTS)],
  ["gainLives", (run) => gainLives(run, 1)],
  ["loseLife", loseLife],
  ["clearLevel", (run) => clearLevel(run, 600, 0)],
])("%s", (_, move) => {
  it.each(NOT_UNDER_WAY)("leaves a run %s as it is", (outcome) => {
    const run = runWith({ outcome });

    expect(move(run)).toBe(run);
  });
});

describe("hasEnded", () => {
  it.each([
    ["ready", false],
    ["playing", false],
    ["paused", false],
    ["cleared", false],
    ["over", true],
    ["won", true],
  ] as const)("says a run %s has ended: %s", (outcome, ended) => {
    expect(hasEnded(runWith({ outcome }))).toBe(ended);
  });
});

describe("levelSeed", () => {
  it("gives each level a seed of its own", () => {
    const seeds = [1, 2, 3].map((level) => levelSeed(runWith({ level })));

    expect(new Set(seeds).size).toBe(3);
  });

  it("gives a level the same seed in the same run", () => {
    expect(levelSeed(runWith({ level: 5 }))).toBe(
      levelSeed(runWith({ level: 5 })),
    );
  });
});
