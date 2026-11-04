import { type Crew, createCrew } from "./pilots";
import {
  type Outcome,
  type Run,
  type WaveProgress,
  catchUp,
  createRun,
  hasEnded,
  isInProgress,
  nextShipAfter,
  pause,
  resume,
  startWave,
  waveSeed,
  waveStart,
  wavesCleared,
} from "./run";
import { FIRST_SHIP_POINTS, SHIP_POINTS } from "./tuning";

/** Returns a run at Normal, from the first wave, waiting, changed as given. */
function runWith(changes: Partial<Run> = {}): Run {
  const run = createRun({ id: 1, seed: 42, speed: "normal", wave: 1 });
  return { ...run, ...changes };
}

/** Returns a run with a wave in play, changed as given. */
function playing(changes: Partial<Run> = {}): Run {
  return runWith({ outcome: "playing", ...changes });
}

/** Returns what a wave's field in play hands the run: no points, the run's crew and mark, and no stray home, changed as given. */
function fieldOf(
  run: Run,
  changes: Partial<Omit<WaveProgress, "strays">> & {
    broughtHome?: number;
  } = {},
): WaveProgress {
  const { broughtHome = 0, ...rest } = changes;
  return {
    cleared: false,
    score: 0,
    crew: run.crew,
    nextShipAt: run.nextShipAt,
    strays: { broughtHome },
    ...rest,
  };
}

/** A crew with one ship gained, flown by a new pilot. */
const GAINED: Crew = { flying: [0, 1, 2, 3], home: [], lastGiven: 3 };

/** A crew with no one flying, its last ship lost. */
const NONE_FLYING: Crew = { flying: [], home: [4], lastGiven: 4 };

/** The outcomes of a run with no wave under way. */
const NOT_UNDER_WAY: readonly Outcome[] = ["ready", "cleared", "over"];

describe("createRun", () => {
  it("waits at its first wave, with its first crew and no points", () => {
    const run = createRun({ id: 7, seed: 3, speed: "fast", wave: 4 });

    expect(run).toEqual({
      id: 7,
      seed: 3,
      speed: "fast",
      firstWave: 4,
      wave: 4,
      banked: 0,
      score: 0,
      crew: createCrew(),
      nextShipAt: FIRST_SHIP_POINTS,
      straysBanked: 0,
      strays: 0,
      outcome: "ready",
    });
  });
});

describe("hasEnded", () => {
  it.each([
    ["over", true],
    ["ready", false],
    ["playing", false],
    ["paused", false],
    ["cleared", false],
  ] as const)("says a run %s has ended: %s", (outcome, ended) => {
    expect(hasEnded(runWith({ outcome }))).toBe(ended);
  });
});

describe("isInProgress", () => {
  it.each([
    ["playing", true],
    ["paused", true],
    ["cleared", true],
    ["ready", false],
    ["over", false],
  ] as const)("says a run %s is in progress: %s", (outcome, inProgress) => {
    expect(isInProgress(runWith({ outcome }))).toBe(inProgress);
  });
});

describe("wavesCleared", () => {
  it.each([
    ["counts the waves before the one in play", "playing", 3],
    ["counts the wave just cleared", "cleared", 4],
    ["counts no wave the run ended at", "over", 3],
  ] as const)("%s", (_, outcome, cleared) => {
    const run = runWith({ firstWave: 2, wave: 5, outcome });

    expect(wavesCleared(run)).toBe(cleared);
  });
});

describe("startWave", () => {
  it("starts the first wave", () => {
    const run = startWave(runWith({ wave: 3 }));

    expect([run.wave, run.outcome]).toEqual([3, "playing"]);
  });

  it("starts the wave after one cleared", () => {
    const run = startWave(runWith({ wave: 3, outcome: "cleared" }));

    expect([run.wave, run.outcome]).toEqual([4, "playing"]);
  });

  it.each(["playing", "paused", "over"] as const)(
    "leaves a run %s as it is",
    (outcome) => {
      const run = runWith({ outcome });

      expect(startWave(run)).toBe(run);
    },
  );
});

describe("pause", () => {
  it("pauses a wave in play", () => {
    expect(pause(playing()).outcome).toBe("paused");
  });

  it.each(["ready", "paused", "cleared", "over"] as const)(
    "leaves a run %s as it is",
    (outcome) => {
      const run = runWith({ outcome });

      expect(pause(run)).toBe(run);
    },
  );
});

describe("resume", () => {
  it("goes on with a paused wave", () => {
    expect(resume(runWith({ outcome: "paused" })).outcome).toBe("playing");
  });

  it.each(["ready", "playing", "cleared", "over"] as const)(
    "leaves a run %s as it is",
    (outcome) => {
      const run = runWith({ outcome });

      expect(resume(run)).toBe(run);
    },
  );
});

describe("catchUp", () => {
  it("returns the run as it is while its field has nothing new", () => {
    const before = playing();
    const run = catchUp(
      before,
      fieldOf(before, { score: 120, broughtHome: 1 }),
    );

    expect(catchUp(run, fieldOf(run, { score: 120, broughtHome: 1 }))).toBe(
      run,
    );
  });

  it.each(NOT_UNDER_WAY)("leaves a run %s as it is", (outcome) => {
    const run = runWith({ outcome });

    expect(catchUp(run, fieldOf(run, { score: 450, cleared: true }))).toBe(run);
  });

  it("takes the points of the wave under way, added to those banked", () => {
    const before = playing({ banked: 3000, score: 3200 });

    const run = catchUp(before, fieldOf(before, { score: 450 }));

    expect([run.score, run.banked]).toEqual([3450, 3000]);
  });

  it("takes them from a paused wave too", () => {
    const before = runWith({ outcome: "paused" });

    const run = catchUp(before, fieldOf(before, { score: 450 }));

    expect([run.score, run.outcome]).toEqual([450, "paused"]);
  });

  it("takes the crew and the next ship's mark the field moved on", () => {
    const before = playing();

    const run = catchUp(
      before,
      fieldOf(before, {
        crew: GAINED,
        nextShipAt: FIRST_SHIP_POINTS + SHIP_POINTS,
      }),
    );

    expect([run.crew, run.nextShipAt, run.outcome]).toEqual([
      GAINED,
      FIRST_SHIP_POINTS + SHIP_POINTS,
      "playing",
    ]);
  });

  it.each([
    ["the crew", { crew: GAINED }],
    ["the next ship's mark", { nextShipAt: FIRST_SHIP_POINTS + SHIP_POINTS }],
  ])("counts %s alone as news", (_, changes) => {
    const before = playing();

    expect(catchUp(before, fieldOf(before, changes))).not.toBe(before);
  });

  it("counts the strays brought home in the wave under way on from those banked", () => {
    const before = playing({ straysBanked: 2, strays: 2 });

    const run = catchUp(before, fieldOf(before, { broughtHome: 1 }));

    expect([run.strays, run.straysBanked]).toEqual([3, 2]);
  });

  it("ends the run with no one left flying", () => {
    const before = playing({ banked: 2000, score: 2000 });

    const run = catchUp(
      before,
      fieldOf(before, { score: 300, crew: NONE_FLYING }),
    );

    expect([run.score, run.banked, run.crew, run.outcome]).toEqual([
      2300,
      2000,
      NONE_FLYING,
      "over",
    ]);
  });

  it("banks a cleared wave's points and strays, once", () => {
    const before = playing({
      banked: 2000,
      score: 2100,
      straysBanked: 1,
      strays: 1,
    });

    const run = catchUp(
      before,
      fieldOf(before, { cleared: true, score: 600, broughtHome: 2 }),
    );

    expect([
      run.score,
      run.banked,
      run.strays,
      run.straysBanked,
      run.outcome,
    ]).toEqual([2600, 2600, 3, 3, "cleared"]);
  });

  it("clears a wave whose field has nothing else new", () => {
    const before = playing({ banked: 2000, score: 2000 });

    const run = catchUp(before, fieldOf(before, { cleared: true }));

    expect([run.banked, run.outcome]).toEqual([2000, "cleared"]);
  });

  // A frame's steps can hold a ship lost and a blast clearing the wave after it.
  it("ends the run when its last ship was lost, though a blast then cleared the wave", () => {
    const before = playing({ banked: 2000, score: 2000 });

    const run = catchUp(
      before,
      fieldOf(before, { cleared: true, score: 600, crew: NONE_FLYING }),
    );

    expect([run.score, run.banked, run.outcome]).toEqual([2600, 2000, "over"]);
  });
});

describe("nextShipAfter", () => {
  it.each([
    [0, FIRST_SHIP_POINTS],
    [FIRST_SHIP_POINTS - 1, FIRST_SHIP_POINTS],
    [FIRST_SHIP_POINTS, FIRST_SHIP_POINTS + SHIP_POINTS],
    [FIRST_SHIP_POINTS + SHIP_POINTS + 1, FIRST_SHIP_POINTS + 2 * SHIP_POINTS],
  ])("puts the next ship past a score of %i at %i", (score, mark) => {
    expect(nextShipAfter(score)).toBe(mark);
  });
});

describe("waveSeed", () => {
  it("draws each wave of a run alike every time", () => {
    expect(waveSeed(runWith({ wave: 3 }))).toBe(waveSeed(runWith({ wave: 3 })));
  });

  it("draws no two waves of a run alike", () => {
    const seeds = new Set(
      Array.from({ length: 50 }, (_, wave) =>
        waveSeed(runWith({ wave: wave + 1 })),
      ),
    );

    expect(seeds.size).toBe(50);
  });

  // A plain mix would draw seed 1's second wave as seed 2's first.
  it("draws no wave of a run alike any of another's", () => {
    const seeds = new Set(
      Array.from({ length: 20 }, (_, seed) =>
        Array.from({ length: 20 }, (__, wave) =>
          waveSeed(runWith({ seed: seed + 1, wave: wave + 1 })),
        ),
      ).flat(),
    );

    expect(seeds.size).toBe(400);
  });
});

describe("waveStart", () => {
  it("hands the wave's field its seed, the run's crew, its banked points and the next ship's mark", () => {
    const run = playing({
      wave: 6,
      crew: GAINED,
      banked: 12_000,
      nextShipAt: FIRST_SHIP_POINTS + SHIP_POINTS,
    });

    expect(waveStart(run)).toEqual({
      seed: waveSeed(run),
      crew: GAINED,
      banked: 12_000,
      nextShipAt: FIRST_SHIP_POINTS + SHIP_POINTS,
    });
  });
});
