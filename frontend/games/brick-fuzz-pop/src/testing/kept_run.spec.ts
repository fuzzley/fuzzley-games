import { shotOf } from "../rules/levels/certificate";
import { levelStart } from "../rules/levels/level";
import { LEVELS, levelEntryOf, parseLevel } from "../rules/levels/levels";
import { playRound } from "../rules/round/round";
import { restoreGame } from "../rules/run/saved_game";
import { certificateOf } from "./every_level";
import { type KeptRun, keptRun } from "./kept_run";

/** Hello, wall, level 1, on a field 11 deep, a shot let fly straight up, uncharged. */
const KEPT: KeptRun = { level: 1, depth: 11, shots: [[328, 0]] };

describe("keptRun", () => {
  it("keeps a run begun at a level on a depth, a round played for each shot, which a page takes up paused", () => {
    const takenUp = restoreGame(keptRun(LEVELS, KEPT), LEVELS, 2);

    expect({
      level: takenUp?.run.level,
      firstLevel: takenUp?.run.firstLevel,
      depth: takenUp?.run.depth,
      rounds: takenUp?.run.rounds,
      outcome: takenUp?.run.outcome,
      startDepth: takenUp?.start.depth,
      // A row down from row 5, where a level 11 rows deep opens.
      lowestRow: takenUp?.start.wall.lowestRow,
    }).toEqual({
      level: 1,
      firstLevel: 1,
      depth: 11,
      rounds: 1,
      outcome: "paused",
      startDepth: 11,
      lowestRow: 4,
    });
  });

  it("keeps the boon a jump earned the next shot", () => {
    // Pyramid, level 8, whose second round on a field 11 deep jumps the wall.
    const kept = keptRun(LEVELS, {
      level: 8,
      depth: 11,
      shots: [
        [584, 5],
        [0, 0],
      ],
    });

    expect(restoreGame(kept, LEVELS, 2)?.start.boon).toBe("hot");
  });

  it("keeps the points its rounds scored", () => {
    const level = parseLevel(levelEntryOf(LEVELS, 1).data);
    const { outcome } = playRound(
      levelStart(level, 11),
      shotOf([328, 0]),
      level.boon,
    );

    expect(keptRun(LEVELS, KEPT).score).toBe(outcome.points);
  });

  it("throws for no shots, which leave nothing to keep", () => {
    expect(() => keptRun(LEVELS, { ...KEPT, shots: [] })).toThrow(
      "A run with no round played keeps nothing.",
    );
  });

  it("throws for shots that clear the level", () => {
    // Hello, wall's certificate on a field 11 deep, which clears it.
    const line = certificateOf(levelEntryOf(LEVELS, 1), 11) ?? [];

    expect(() => keptRun(LEVELS, { ...KEPT, shots: line })).toThrow(
      `Round ${String(line.length)} of level 1 ends it: cleared.`,
    );
  });

  it("throws for a shot that isn't an aim and a charge", () => {
    expect(() => keptRun(LEVELS, { ...KEPT, shots: [[657, 0]] })).toThrow(
      RangeError,
    );
  });
});
