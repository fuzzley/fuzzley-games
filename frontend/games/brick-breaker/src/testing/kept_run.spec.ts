import { cellIndex } from "../rules/grid";
import { LEVELS } from "../rules/levels";
import { restoreGame } from "../rules/saved_game";
import { stepsIn } from "../rules/stepper";
import { type KeptRun, type Place, keptRun } from "./kept_run";

/**
 * A run on Rocket, level 9, with three bricks broken, a plain flame, a tough
 * fin brick and the four-hit nose, and the fin brick below the broken one
 * hit once.
 */
const KEPT: KeptRun = {
  level: 9,
  speed: "normal",
  seed: 9,
  playedMs: 20_000,
  broken: [
    [12, 4],
    [10, 1],
    [0, 6],
  ],
  worn: [[11, 1]],
};

/** Returns the kept brick at a place, as storage keeps it. */
function keptBrickAt([row, column]: Place): unknown {
  return keptRun(LEVELS, KEPT).field?.bricks[cellIndex(column, row)];
}

describe("keptRun", () => {
  it("keeps a run the game takes up", () => {
    const stored: unknown = JSON.parse(JSON.stringify(keptRun(LEVELS, KEPT)));

    const takenUp = restoreGame(stored, LEVELS, 2);

    expect(takenUp?.run).toMatchObject({
      level: 9,
      speed: "normal",
      outcome: "paused",
    });
  });

  it.each<[string, Place]>([
    ["a plain brick", [12, 4]],
    ["a tough brick", [10, 1]],
    ["a brick of four hits", [0, 6]],
  ])("breaks %s it names broken", (_, place) => {
    expect(keptBrickAt(place)).toMatchObject({ hits: 0, broken: true });
  });

  it("hits once the bricks it names worn", () => {
    expect(keptBrickAt([11, 1])).toMatchObject({ hits: 1, broken: false });
  });

  it("keeps the points the bricks scored: 50 for each hit, before a streak", () => {
    expect(keptRun(LEVELS, KEPT).score).toBe(400);
  });

  it("keeps the level played for as long as it names", () => {
    expect(keptRun(LEVELS, KEPT).field?.steps).toBe(stepsIn(20_000));
  });

  it("throws for a level the game doesn't have", () => {
    expect(() => keptRun(LEVELS, { ...KEPT, level: 99 })).toThrow(
      "There is no level 99.",
    );
  });

  it("throws for a place with no brick", () => {
    expect(() => keptRun(LEVELS, { ...KEPT, broken: [[0, 0]] })).toThrow(
      "Level 9 has no brick at row 0, column 0.",
    );
  });

  it("throws for a place outside the grid, rather than reading the next row", () => {
    expect(() => keptRun(LEVELS, { ...KEPT, broken: [[9, 14]] })).toThrow(
      "Level 9 has no brick at row 9, column 14.",
    );
  });
});
