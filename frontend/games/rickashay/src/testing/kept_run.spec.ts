import { levelAt } from "@fz/brick-wall/rules/progress";
import { LEVELS, parseLevel } from "../rules/levels/levels";
import { playRound } from "../rules/round/round";
import { levelStart } from "../rules/run/run";
import { restoreGame } from "../rules/run/saved_game";
import { FLIGHT_RULES } from "../rules/tuning";
import { MARKS, certificateOf } from "./every_level";
import { type KeptRun, keptRun } from "./kept_run";

/** First bounce, level 1, on a field 11 deep, a shot let fly straight up: the layout check's run (`LAYOUT_RUN`), but for its score. */
const KEPT: KeptRun = { level: 1, depth: 11, shots: [328] };

describe("keptRun", () => {
  it("keeps a run begun at a level on a depth, a round played for each shot, which a page takes up paused", () => {
    const takenUp = restoreGame(keptRun(LEVELS, MARKS, KEPT), LEVELS, 2, MARKS);

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

  it("keeps the hot shot a jump earned the next shot", () => {
    // First bounce's first round, at aim 209 on a field 11 deep, jumps the wall.
    const kept = keptRun(LEVELS, MARKS, { ...KEPT, shots: [209] });

    expect(restoreGame(kept, LEVELS, 2, MARKS)?.start.hot).toBe(true);
  });

  it("keeps the points its rounds scored on the rules' own numbers", () => {
    const level = parseLevel(levelAt(LEVELS, 1).data);
    const { outcome } = playRound(
      levelStart(level, 11),
      { aim: 328 },
      FLIGHT_RULES,
    );

    expect(keptRun(LEVELS, MARKS, KEPT).score).toBe(outcome.points);
  });

  it("raises its score to the one asked for, which a page takes up", () => {
    const kept = keptRun(LEVELS, MARKS, { ...KEPT, score: 12_345 });

    expect(restoreGame(kept, LEVELS, 2, MARKS)?.run.score).toBe(12_345);
  });

  it("keeps a score as given that is what its rounds scored", () => {
    const scored = keptRun(LEVELS, MARKS, KEPT).score;

    expect(keptRun(LEVELS, MARKS, { ...KEPT, score: scored }).score).toBe(
      scored,
    );
  });

  it("throws for a score under what its rounds scored", () => {
    const scored = keptRun(LEVELS, MARKS, KEPT).score;

    expect(() =>
      keptRun(LEVELS, MARKS, { ...KEPT, score: scored - 1 }),
    ).toThrow(
      `A score of ${String(scored - 1)} is under the ${String(scored)} the rounds scored.`,
    );
  });

  it("throws for no shots, which leave nothing to keep", () => {
    expect(() => keptRun(LEVELS, MARKS, { ...KEPT, shots: [] })).toThrow(
      "A run with no round played keeps nothing.",
    );
  });

  it("throws for shots that clear the level", () => {
    // First bounce's certificate on a field 11 deep, which clears it.
    const line = certificateOf(levelAt(LEVELS, 1), 11) ?? [];

    expect(() => keptRun(LEVELS, MARKS, { ...KEPT, shots: line })).toThrow(
      `Round ${String(line.length)} of level 1 ends it: cleared.`,
    );
  });

  it("throws for a shot that isn't one of the 657 aims", () => {
    expect(() => keptRun(LEVELS, MARKS, { ...KEPT, shots: [657] })).toThrow(
      RangeError,
    );
  });
});
