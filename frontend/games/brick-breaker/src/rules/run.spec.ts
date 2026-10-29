import {
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

/** Returns a run of ten levels at Normal, from the first, changed as given. */
function runWith(changes: Partial<Run> = {}): Run {
  const run = createRun({
    id: 1,
    seed: 42,
    speed: "normal",
    levels: 10,
    level: 1,
  });
  return { ...run, ...changes };
}

describe("createRun", () => {
  it("waits at its first level, with its first lives and no points", () => {
    const run = createRun({
      id: 7,
      seed: 3,
      speed: "fast",
      levels: 30,
      level: 4,
    });

    expect(run).toEqual({
      id: 7,
      seed: 3,
      speed: "fast",
      levels: 30,
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

describe("pause and resume", () => {
  it("pause a level under way", () => {
    expect(pause(runWith({ outcome: "playing" })).outcome).toBe("paused");
  });

  it("go on with a paused level", () => {
    expect(resume(runWith({ outcome: "paused" })).outcome).toBe("playing");
  });

  it("leave a run that isn't under way, or paused, as it is", () => {
    const [ready, playing] = [runWith(), runWith({ outcome: "playing" })];

    expect([pause(ready), resume(playing)]).toEqual([ready, playing]);
  });
});

describe("tally", () => {
  it("adds the level's points to those banked", () => {
    const run = tally(runWith({ banked: 3000, score: 3000 }), 450);

    expect(run.score).toBe(3450);
  });

  it("brings a life at the first mark", () => {
    const run = tally(runWith(), FIRST_LIFE_POINTS);

    expect({ lives: run.lives, next: run.nextLifeAt }).toEqual({
      lives: FIRST_LIVES + 1,
      next: FIRST_LIFE_POINTS + LIFE_POINTS,
    });
  });

  it("brings a life for each mark passed at once", () => {
    const run = tally(runWith(), FIRST_LIFE_POINTS + LIFE_POINTS);

    expect(run.lives).toBe(FIRST_LIVES + 2);
  });

  it("brings no life past the most a player holds", () => {
    const run = tally(runWith({ lives: MAX_LIVES }), FIRST_LIFE_POINTS);

    expect(run.lives).toBe(MAX_LIVES);
  });
});

describe("gainLives", () => {
  it("adds the lives capsules brought, up to the most a player holds", () => {
    expect([
      gainLives(runWith(), 1).lives,
      gainLives(runWith(), 9).lives,
    ]).toEqual([FIRST_LIVES + 1, MAX_LIVES]);
  });
});

describe("loseLife", () => {
  it("goes on with lives left", () => {
    const run = loseLife(runWith({ lives: 2, outcome: "playing" }));

    expect({ lives: run.lives, outcome: run.outcome }).toEqual({
      lives: 1,
      outcome: "playing",
    });
  });

  it("ends the run with the last", () => {
    expect(loseLife(runWith({ lives: 1, outcome: "playing" })).outcome).toBe(
      "over",
    );
  });
});

describe("clearLevel", () => {
  it.each([
    ["without losing a ball", 0, CLEAR_POINTS + CLEAN_POINTS],
    ["having lost one", 1, CLEAR_POINTS],
  ])(
    "banks the level's points, %s, and what clearing adds",
    (_, lost, bonus) => {
      const before = runWith({ banked: 2000, score: 2600, outcome: "playing" });

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
    const run = clearLevel(runWith({ level: 10, outcome: "playing" }), 0, 0);

    expect(run.outcome).toBe("won");
  });

  it("brings the lives its points pass", () => {
    const before = runWith({ banked: FIRST_LIFE_POINTS - 1000 });

    const run = clearLevel(before, 0, 0);

    expect(run.lives).toBe(FIRST_LIVES + 1);
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
