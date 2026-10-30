import { LEVELS } from "../rules/levels";
import { restoreGame } from "../rules/saved_game";
import { COLUMNS } from "../rules/tuning";
import { type KeptRun, keptRun } from "./kept_run";

/** A run on Rocket, level 9: a plain brick of its flames broken, and a tough one of its fin hit once. */
const KEPT: KeptRun = {
  level: 9,
  speed: "normal",
  seed: 9,
  playedMs: 20_000,
  broken: [[12, 4]],
  worn: [[10, 1]],
};

/** Returns the kept brick at a place, as storage keeps it. */
function keptBrickAt(row: number, column: number): unknown {
  return keptRun(LEVELS, KEPT).field?.bricks[row * COLUMNS + column];
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

  it("breaks the bricks it names broken", () => {
    expect(keptBrickAt(12, 4)).toMatchObject({ hits: 0, broken: true });
  });

  it("hits once the bricks it names worn", () => {
    expect(keptBrickAt(10, 1)).toMatchObject({ hits: 1, broken: false });
  });

  it("keeps the points the bricks scored: 50 for each hit, before a streak", () => {
    expect(keptRun(LEVELS, KEPT).score).toBe(100);
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
});
