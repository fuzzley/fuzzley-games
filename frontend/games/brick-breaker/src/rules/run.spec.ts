import {
  type LevelProgress,
  type Outcome,
  type Run,
  catchUp,
  createRun,
  gainedLifeByPoints,
  hasEnded,
  levelSeed,
  levelsCleared,
  nextLifeAfter,
  pause,
  resume,
  startLevel,
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

/** Returns a level's field in play, with no points and no lives gained or lost, changed as given. */
function fieldAt(changes: Partial<LevelProgress> = {}): LevelProgress {
  return {
    state: "playing",
    score: 0,
    livesGained: 0,
    livesLost: 0,
    ...changes,
  };
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
      levelGained: 0,
      levelLost: 0,
      outcome: "ready",
    });
  });
});

describe("startLevel", () => {
  it("starts the first level", () => {
    expect(startLevel(runWith()).outcome).toBe("playing");
  });

  it("starts the level after one cleared, with none of its lives taken", () => {
    const cleared = runWith({
      level: 3,
      levelGained: 1,
      levelLost: 2,
      outcome: "cleared",
    });

    const run = startLevel(cleared);

    expect({
      level: run.level,
      gained: run.levelGained,
      lost: run.levelLost,
      outcome: run.outcome,
    }).toEqual({ level: 4, gained: 0, lost: 0, outcome: "playing" });
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

describe("catchUp", () => {
  it("returns the run as it is while its field has nothing new", () => {
    const run = catchUp(
      playing(),
      fieldAt({ score: 120, livesGained: 1, livesLost: 1 }),
    );

    expect(
      catchUp(run, fieldAt({ score: 120, livesGained: 1, livesLost: 1 })),
    ).toBe(run);
  });
});

describe("catchUp's points", () => {
  it("add the level's to those banked", () => {
    const before = playing({ banked: 3000, score: 3200 });

    const run = catchUp(before, fieldAt({ score: 450 }));

    expect(run.score).toBe(3450);
  });

  it("are taken from a paused level too", () => {
    const run = catchUp(
      runWith({ outcome: "paused" }),
      fieldAt({ score: 450 }),
    );

    expect(run.score).toBe(450);
  });

  it("bring a life at the first mark", () => {
    const run = catchUp(playing(), fieldAt({ score: FIRST_LIFE_POINTS }));

    expect({ lives: run.lives, next: run.nextLifeAt }).toEqual({
      lives: FIRST_LIVES + 1,
      next: FIRST_LIFE_POINTS + LIFE_POINTS,
    });
  });

  it("bring a life for each mark passed at once", () => {
    const field = fieldAt({ score: FIRST_LIFE_POINTS + LIFE_POINTS });

    expect(catchUp(playing(), field).lives).toBe(FIRST_LIVES + 2);
  });

  it("neither take a life nor move the mark back for a run whose next life is past its score", () => {
    const before = playing({ nextLifeAt: FIRST_LIFE_POINTS + LIFE_POINTS });

    const run = catchUp(before, fieldAt({ score: 100 }));

    expect({ lives: run.lives, next: run.nextLifeAt }).toEqual({
      lives: FIRST_LIVES,
      next: FIRST_LIFE_POINTS + LIFE_POINTS,
    });
  });

  it("spend a mark passed with the most lives a player holds", () => {
    const before = playing({ lives: MAX_LIVES });

    const run = catchUp(before, fieldAt({ score: FIRST_LIFE_POINTS }));

    expect({ lives: run.lives, next: run.nextLifeAt }).toEqual({
      lives: MAX_LIVES,
      next: FIRST_LIFE_POINTS + LIFE_POINTS,
    });
  });
});

describe("catchUp's lives", () => {
  it("add those capsules brought since it last caught up", () => {
    const before = playing({ levelGained: 1 });

    const run = catchUp(before, fieldAt({ livesGained: 2 }));

    expect({ lives: run.lives, gained: run.levelGained }).toEqual({
      lives: FIRST_LIVES + 1,
      gained: 2,
    });
  });

  it("add no more than the most a player holds", () => {
    const run = catchUp(playing(), fieldAt({ livesGained: 9 }));

    expect(run.lives).toBe(MAX_LIVES);
  });

  it("take those lost since it last caught up, going on with lives left", () => {
    const before = playing({ lives: 3, levelLost: 1 });

    const run = catchUp(before, fieldAt({ livesLost: 2 }));

    expect({
      lives: run.lives,
      lost: run.levelLost,
      outcome: run.outcome,
    }).toEqual({ lives: 2, lost: 2, outcome: "playing" });
  });

  it("end the run with the last", () => {
    const run = catchUp(playing({ lives: 1 }), fieldAt({ livesLost: 1 }));

    expect({ lives: run.lives, outcome: run.outcome }).toEqual({
      lives: 0,
      outcome: "over",
    });
  });

  it("take no more than the run has", () => {
    const run = catchUp(playing({ lives: 1 }), fieldAt({ livesLost: 2 }));

    expect(run.lives).toBe(0);
  });

  it("are taken once, however often the run catches up", () => {
    const field = fieldAt({ livesGained: 1, livesLost: 1 });
    const once = catchUp(playing(), field);

    const twice = catchUp(once, field);

    expect(twice.lives).toBe(once.lives);
  });
});

describe("gainedLifeByPoints", () => {
  it("says the points passing a mark brought a life", () => {
    const before = playing();

    const after = catchUp(before, fieldAt({ score: FIRST_LIFE_POINTS }));

    expect(gainedLifeByPoints(before, after)).toBe(true);
  });

  it("says no life came of points short of the mark", () => {
    const before = playing();

    const after = catchUp(before, fieldAt({ score: FIRST_LIFE_POINTS - 1 }));

    expect(gainedLifeByPoints(before, after)).toBe(false);
  });

  it("says no life came of a mark passed with every life held", () => {
    const before = playing({ lives: MAX_LIVES });

    const after = catchUp(before, fieldAt({ score: FIRST_LIFE_POINTS }));

    expect(gainedLifeByPoints(before, after)).toBe(false);
  });

  it("leaves out the lives a capsule brought", () => {
    const before = playing();

    const after = catchUp(before, fieldAt({ livesGained: 1 }));

    expect(gainedLifeByPoints(before, after)).toBe(false);
  });
});

describe("catchUp's clearing", () => {
  it.each([
    ["without losing a life", 0, CLEAR_POINTS + CLEAN_POINTS],
    ["having lost one", 1, CLEAR_POINTS],
  ])(
    "banks the level's points, %s, and what clearing adds",
    (_, livesLost, bonus) => {
      const before = playing({ banked: 2000, score: 2100 });
      const field = fieldAt({ state: "cleared", score: 600, livesLost });

      const run = catchUp(before, field);

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
    const run = catchUp(playing({ level: 10 }), fieldAt({ state: "cleared" }));

    expect(run.outcome).toBe("won");
  });

  it("brings the lives its points pass", () => {
    const before = playing({ banked: FIRST_LIFE_POINTS - 1000 });

    const run = catchUp(before, fieldAt({ state: "cleared" }));

    expect(run.lives).toBe(FIRST_LIVES + 1);
  });
});

// A frame's steps can hold a level's points, a life caught, a life lost and
// its clearing at once, which the field's counts keep no order of.
describe("catchUp's order", () => {
  it("ends the run when the last life was lost, though a blast then cleared the level", () => {
    const before = playing({ lives: 1, banked: 2000, score: 2000 });
    const field = fieldAt({ state: "cleared", score: 600, livesLost: 1 });

    const run = catchUp(before, field);

    expect({
      score: run.score,
      banked: run.banked,
      outcome: run.outcome,
    }).toEqual({ score: 2600, banked: 2000, outcome: "over" });
  });

  it("keeps a life lost before the level cleared", () => {
    const field = fieldAt({ state: "cleared", livesLost: 1 });

    const run = catchUp(playing({ lives: 2 }), field);

    expect({ lives: run.lives, outcome: run.outcome }).toEqual({
      lives: 1,
      outcome: "cleared",
    });
  });

  it("counts a life a capsule brought before the last is lost", () => {
    const field = fieldAt({ livesGained: 1, livesLost: 1 });

    const run = catchUp(playing({ lives: 1 }), field);

    expect({ lives: run.lives, outcome: run.outcome }).toEqual({
      lives: 1,
      outcome: "playing",
    });
  });

  it("spends a life a capsule brought at the most a player holds, before one is lost", () => {
    const field = fieldAt({ livesGained: 1, livesLost: 1 });

    const run = catchUp(playing({ lives: MAX_LIVES }), field);

    expect(run.lives).toBe(MAX_LIVES - 1);
  });

  it("counts a life the points brought before the last is lost", () => {
    const field = fieldAt({ score: FIRST_LIFE_POINTS, livesLost: 1 });

    const run = catchUp(playing({ lives: 1 }), field);

    expect({ lives: run.lives, outcome: run.outcome }).toEqual({
      lives: 1,
      outcome: "playing",
    });
  });

  it.each(NOT_UNDER_WAY)("leaves a run %s as it is", (outcome) => {
    const run = runWith({ outcome });

    expect(catchUp(run, fieldAt({ state: "cleared", livesLost: 1 }))).toBe(run);
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

describe("levelsCleared", () => {
  it("counts none while the first level is in play", () => {
    expect(levelsCleared(playing({ firstLevel: 3, level: 3 }))).toBe(0);
  });

  it("counts the levels before the one a run was lost on", () => {
    expect(
      levelsCleared(runWith({ firstLevel: 3, level: 7, outcome: "over" })),
    ).toBe(4);
  });

  it("counts a level just cleared", () => {
    expect(
      levelsCleared(runWith({ firstLevel: 3, level: 7, outcome: "cleared" })),
    ).toBe(5);
  });

  it("counts the last level of a run won", () => {
    expect(
      levelsCleared(runWith({ firstLevel: 1, level: 10, outcome: "won" })),
    ).toBe(10);
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

describe("nextLifeAfter", () => {
  it.each([
    [0, FIRST_LIFE_POINTS],
    [FIRST_LIFE_POINTS - 1, FIRST_LIFE_POINTS],
    [FIRST_LIFE_POINTS, FIRST_LIFE_POINTS + LIFE_POINTS],
    [FIRST_LIFE_POINTS + LIFE_POINTS, FIRST_LIFE_POINTS + 2 * LIFE_POINTS],
  ])("puts the next life after %i points at %i", (score, next) => {
    expect(nextLifeAfter(score)).toBe(next);
  });

  it("agrees with the run's own count, however far its points climb", () => {
    const field = fieldAt({ score: 3 * LIFE_POINTS + 1234 });

    const run = catchUp(playing(), field);

    expect(nextLifeAfter(run.score)).toBe(run.nextLifeAt);
  });
});
