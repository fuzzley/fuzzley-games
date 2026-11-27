import { itemAt } from "@fz/core/records";
import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import {
  firstWaveOf,
  pieceAt,
  timelineOfParts,
} from "../../../testing/played_parts";
import { afterWave } from "../board_after";
import { FEEL } from "../feel";
import { shuffled } from "./shuffle";

/** When the shuffle starts. */
const AT_MS = 100;

/** The move played by hand that leaves no move, and is shuffled after. */
const FIXTURE = MOVE_FIXTURES.shuffle;

/** The board its wave leaves, which it shuffles: piece 12 from square 2 to 8 among the rest. */
const GRID = afterWave(
  firstWaveOf(FIXTURE).grid,
  itemAt(FIXTURE.record.waves, 0),
);

describe("shuffled", () => {
  const timeline = timelineOfParts(
    GRID,
    shuffled(FIXTURE.record.shuffle, AT_MS, GRID, FEEL),
  );

  it("shrinks each fuzzball before it moves", () => {
    expect(
      pieceAt(timeline, 12, AT_MS + FEEL.shuffleShrinkMs).scaleX,
    ).toBeCloseTo(FEEL.shuffleShrink);
  });

  it("slides each to its new square, and springs it back to its size", () => {
    expect(
      pieceAt(
        timeline,
        12,
        AT_MS + FEEL.shuffleGrowAfterMs + FEEL.shuffleGrowMs,
      ),
    ).toMatchObject({ x: 2, y: 2, scaleX: 1, scaleY: 1 });
  });

  it("holds the board until it is done", () => {
    expect(timeline.restMs).toBe(AT_MS + FEEL.shuffleMs);
  });
});
