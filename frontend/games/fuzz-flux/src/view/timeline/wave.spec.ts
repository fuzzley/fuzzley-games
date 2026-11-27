import { itemAt } from "@fz/core/records";
import type { Wave } from "../../rules/move/record";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import { pieceAt } from "../../testing/played_parts";
import { moveStartOf } from "../../testing/shown_board";
import type { GridShown } from "../run_state";
import { afterSwap, afterWave } from "./board_after";
import { Draft } from "./draft";
import { FEEL } from "./feel";
import { POOLS } from "./limits";
import type { Motion } from "./less_motion";
import { quickeningOf } from "./pace";
import type { Effect, Timeline } from "./timeline";
import { type WavePlayed, playWave } from "./wave";

/** The two waves played by hand, a bunch down the left, then the bunch along the bottom the fall makes. */
const TWO_WAVES = MOVE_FIXTURES.twoWaves;

/** The board the two waves' swap leaves. */
const SWAPPED = afterSwap(moveStartOf(TWO_WAVES).grid, TWO_WAVES.record.swap);

/** The first of the two waves. */
const FIRST = itemAt(TWO_WAVES.record.waves, 0);

/** The second of the two waves. */
const SECOND = itemAt(TWO_WAVES.record.waves, 1);

/** The move played by hand whose one wave puts a sleepyhead to bed on square 10, the fuzzball 13 falling into the square behind it. */
const BEDDED_MOVE = MOVE_FIXTURES.sleepyheadBedded;

/** The board that move's swap leaves. */
const BEDDED_ON = afterSwap(
  moveStartOf(BEDDED_MOVE).grid,
  BEDDED_MOVE.record.swap,
);

/** That move's one wave. */
const BEDDED = itemAt(BEDDED_MOVE.record.waves, 0);

/** Returns a wave played alone from 0 on a board, in a motion, and the timeline it makes. */
function played(
  wave: Wave,
  grid: GridShown,
  motion: Motion = "full",
): WavePlayed & { readonly timeline: Timeline } {
  const draft = new Draft(grid, [], motion);
  const done = playWave(draft, wave, grid, "down", 0, FEEL);
  return { ...done, timeline: draft.finish(done.endMs, null, FEEL, POOLS) };
}

/** Returns a timeline's tufts. */
function fluffOf(timeline: Timeline): readonly Effect[] {
  return timeline.effects.filter(({ what }) => what === "fluff");
}

describe("playWave", () => {
  it("leaves the board as the wave does", () => {
    expect(played(FIRST, SWAPPED).grid).toEqual(afterWave(SWAPPED, FIRST));
  });

  it("huddles a later wave's bunches quicker", () => {
    const { timeline } = played(SECOND, afterWave(SWAPPED, FIRST));

    expect(
      pieceAt(timeline, 10, FEEL.huddleMs * quickeningOf(2, FEEL)).scaleX,
    ).toBe(FEEL.huddleScale);
  });

  it("hops a later wave's bunches off with more tufts, flying harder", () => {
    const { timeline } = played(SECOND, afterWave(SWAPPED, FIRST));

    const tufts = {
      count: FEEL.bunchTufts + 1,
      power: FEEL.tuftPower + FEEL.tuftPowerPerWave,
    };

    expect(fluffOf(timeline)).toMatchObject([tufts, tufts, tufts]);
  });

  it("plays a gust's first fall, wave 0, as a move's first wave", () => {
    const { timeline } = played({ ...FIRST, number: 0 }, SWAPPED);

    const tufts = { count: FEEL.bunchTufts, power: FEEL.tuftPower };

    expect(fluffOf(timeline)).toMatchObject([tufts, tufts, tufts]);
  });

  it("cheers the board at wave 3, a moment after its bunches hop off", () => {
    const { timeline } = played({ ...FIRST, number: 3 }, SWAPPED);

    const cheersMs = FEEL.huddleMs * quickeningOf(3, FEEL) + FEEL.cheerAfterMs;

    expect([
      pieceAt(timeline, 2, cheersMs - 1).face,
      pieceAt(timeline, 2, cheersMs).face,
    ]).toEqual(["rest", "happy"]);
  });

  it("plays its events in its draft's motion, the board cheering at none with Less motion", () => {
    const { timeline } = played({ ...FIRST, number: 3 }, SWAPPED, "less");

    const cheersMs = FEEL.huddleMs * quickeningOf(3, FEEL) + FEEL.cheerAfterMs;

    expect(pieceAt(timeline, 2, cheersMs).face).toBe("rest");
  });

  it("lets a wave with no bunch fall after the wait alone", () => {
    const { timeline } = played({ ...FIRST, bunches: [] }, SWAPPED);

    expect(pieceAt(timeline, 1, FEEL.fallWaitMs).y).toBe(0);
    expect(pieceAt(timeline, 1, FEEL.fallWaitMs + 1).y).toBeGreaterThan(0);
  });

  it("waits a gap for each sleepyhead the wave puts to bed before the next wave goes on", () => {
    const awake = {
      ...BEDDED,
      hits: BEDDED.hits.filter(({ what }) => what !== "bedded"),
    };

    expect(
      played(BEDDED, BEDDED_ON).endMs - played(awake, BEDDED_ON).endMs,
    ).toBe(FEEL.bedGapMs);
  });

  it("shakes the head of a sleepyhead the wave's blast ruffles, the shake dying away", () => {
    const ruffling = MOVE_FIXTURES.sleepyheadRuffled;
    const grid = afterSwap(moveStartOf(ruffling).grid, ruffling.record.swap);
    const { timeline } = played(itemAt(ruffling.record.waves, 0), grid);
    const sleepyhead = timeline.pieces.find(({ id }) => id === 6);

    expect(sleepyhead?.keys.wobble?.map(({ to }) => to)).toEqual([
      FEEL.ruffledWobble,
      0,
    ]);
  });

  it("draws a sleepyhead put to bed over the fuzzball the same fall brings into its square", () => {
    const { endMs, timeline } = played(BEDDED, BEDDED_ON);
    const landedMs =
      endMs - FEEL.bedGapMs - FEEL.waveGapMs * quickeningOf(1, FEEL);
    const [sleepyhead, fuzzball] = [2, 13].map((piece) =>
      pieceAt(timeline, piece, landedMs),
    );

    expect([sleepyhead?.y, fuzzball?.y]).toEqual([3, 3]);
    expect(sleepyhead?.raise).toBeGreaterThan(fuzzball?.raise ?? Infinity);
  });

  it("lets the next wave go on a wave's gap after the last of a stack has landed", () => {
    const { endMs } = played(FIRST, SWAPPED);

    expect(endMs).toBe(
      FEEL.huddleMs +
        3 * FEEL.hopGapMs +
        FEEL.hopMs * FEEL.fallAfterHop +
        FEEL.fallWaitMs +
        3 * FEEL.stackGapMs +
        FEEL.fallBaseMs +
        FEEL.fallPerSquareMs * 3 ** FEEL.fallExponent +
        FEEL.waveGapMs,
    );
  });
});
