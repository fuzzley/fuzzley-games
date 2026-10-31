import {
  describeCaught,
  describeCleared,
  describeEnd,
  describeFewLeft,
  describeLevel,
  describeLives,
  describePause,
  describeResume,
  describeTakenUp,
  endTitle,
  formatCustomPercent,
  formatPoints,
} from "./describe";
import { LEVELS } from "./levels";
import { type Run, createRun } from "./run";
import { MAX_LIVES } from "./tuning";

/** Returns a run at a level, with a score and lives, where it stands as given. */
function runAt(changes: Partial<Run> = {}): Run {
  const run = createRun({
    id: 1,
    seed: 1,
    speed: "normal",
    lastLevel: 10,
    level: 3,
  });
  return { ...run, outcome: "playing", score: 4250, ...changes };
}

describe("describe", () => {
  it("names a level, its number and the bricks it needs as it starts", () => {
    const pyramid = LEVELS[2];
    if (!pyramid) throw new Error("No third level.");

    expect(describeLevel(pyramid, 37)).toBe(
      `Level 3, ${pyramid.data.name}. 37 bricks.`,
    );
  });

  it("names a capsule as it is caught", () => {
    expect(describeCaught("wide")).toBe("Wide paddle.");
  });

  it.each([
    [2, "Ball lost. 2 lives left."],
    [1, "Ball lost. 1 life left."],
  ])("says a ball is lost, with %i lives left", (lives, words) => {
    const before = runAt({ lives: lives + 1 });

    expect(describeLives(before, { ...before, lives, levelLost: 1 })).toBe(
      words,
    );
  });

  it("says a life caught, and how many there are", () => {
    const before = runAt({ lives: 3 });

    expect(describeLives(before, { ...before, lives: 4, levelGained: 1 })).toBe(
      "Extra life. 4 lives.",
    );
  });

  it("says a life earned by points, and how many there are", () => {
    const before = runAt({ lives: 3 });

    expect(describeLives(before, { ...before, lives: 4 })).toBe(
      "Extra life. 4 lives.",
    );
  });

  it("says a life gained and a ball lost in one frame, in turn", () => {
    const before = runAt({ lives: 3 });

    expect(
      describeLives(before, { ...before, levelGained: 1, levelLost: 1 }),
    ).toBe("Extra life. 4 lives. Ball lost. 3 lives left.");
  });

  it("names an extra life caught with the most lives held already", () => {
    const before = runAt({ lives: MAX_LIVES });

    expect(describeLives(before, { ...before, levelGained: 1 })).toBe(
      "Extra life.",
    );
  });

  it("says nothing of lives for a frame that brought only points", () => {
    const before = runAt();

    expect(describeLives(before, { ...before, score: 4300 })).toBeNull();
  });

  it.each([
    [6, 5, "5 bricks left."],
    [9, 4, "4 bricks left."],
    [6, 1, "1 brick left."],
  ])(
    "says the bricks left as a level goes from %i to %i",
    (before, after, words) => {
      expect(describeFewLeft(before, after)).toBe(words);
    },
  );

  it.each([
    [7, 6],
    [5, 4],
    [6, 0],
  ])(
    "says nothing of the bricks left as a level goes from %i to %i",
    (before, after) => {
      expect(describeFewLeft(before, after)).toBeNull();
    },
  );

  it("says a level is cleared, with the score", () => {
    expect(describeCleared(runAt({ outcome: "cleared" }))).toBe(
      "Level 3 cleared! Score 4,250.",
    );
  });

  it("says a run is paused, with the score, and how to go on", () => {
    expect(describePause(runAt({ outcome: "paused" }))).toBe(
      "Paused, with a score of 4,250. Press Enter to go on.",
    );
  });

  it("says a paused run goes on", () => {
    expect(describeResume()).toBe("Going on.");
  });

  it("says where a run taken up after a reload stands, paused", () => {
    const pyramid = LEVELS[2];
    if (!pyramid) throw new Error("No third level.");

    expect(describeTakenUp(runAt({ lives: 1 }), pyramid)).toBe(
      "Your last run is paused on level 3, Pyramid, with a score of 4,250 and 1 life. Press Enter to go on.",
    );
  });

  it.each([
    ["over", false, "Game over. Score 4,250, at level 3."],
    ["over", true, "Game over. Score 4,250, at level 3. A new best!"],
    ["won", false, "Every level cleared! Score 4,250, at level 3."],
  ] as const)(
    "says a run %s ends (a new best: %s)",
    (outcome, newBest, words) => {
      expect(describeEnd(runAt({ outcome }), newBest)).toBe(words);
    },
  );
});

describe("endTitle", () => {
  it.each([
    ["over", "Game over"],
    ["won", "Every level cleared!"],
  ] as const)("calls a run %s %j", (outcome, title) => {
    expect(endTitle({ outcome })).toBe(title);
  });
});

describe("formatPoints", () => {
  it.each([
    [0, "0"],
    [950, "950"],
    [4250, "4,250"],
    [1234567, "1,234,567"],
  ])("writes %i points as %j", (points, written) => {
    expect(formatPoints(points)).toBe(written);
  });
});

describe("formatCustomPercent", () => {
  it("writes Custom's ball speed against Normal's", () => {
    expect(formatCustomPercent(150)).toBe("150% of Normal");
  });
});
