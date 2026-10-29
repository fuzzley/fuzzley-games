import {
  describeCaught,
  describeCleared,
  describeEnd,
  describeExtraLife,
  describeFewLeft,
  describeLevel,
  describeLost,
  describePause,
  describeResume,
} from "./describe";
import { LEVELS } from "./levels";
import { type Run, createRun } from "./run";

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
    expect(describeLost(runAt({ lives }))).toBe(words);
  });

  it("says a life is gained, and how many there are", () => {
    expect(describeExtraLife(runAt({ lives: 4 }))).toBe("Extra life. 4 lives.");
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
      "Level 3 cleared! Score 4250.",
    );
  });

  it("says a run is paused, with the score, and how to go on", () => {
    expect(describePause(runAt({ outcome: "paused" }))).toBe(
      "Paused, with a score of 4250. Press Enter to go on.",
    );
  });

  it("says a paused run goes on", () => {
    expect(describeResume()).toBe("Going on.");
  });

  it.each([
    ["over", false, "Game over. Score 4250, at level 3."],
    ["over", true, "Game over. Score 4250, at level 3. A new best!"],
    ["won", false, "Every level cleared! Score 4250, at level 3."],
  ] as const)(
    "says a run %s ends (a new best: %s)",
    (outcome, newBest, words) => {
      expect(describeEnd(runAt({ outcome }), newBest)).toBe(words);
    },
  );
});
