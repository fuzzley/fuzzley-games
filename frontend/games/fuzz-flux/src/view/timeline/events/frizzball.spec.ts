import { itemAt } from "@fz/core/records";
import type { Blast } from "../../../rules/move/record";
import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import {
  HOPS_MS,
  blastTimeline,
  firstWaveOf,
  pieceAt,
  timelineOfParts,
} from "../../../testing/played_parts";
import { FEEL } from "../feel";
import { RAISED } from "../looks";
import { reachesOf } from "../reach";
import { frameFor, sampleAt } from "../sample";
import type { Timeline } from "../timeline";
import { frizzballOff } from "./frizzball";

/** When the frizzball, piece 5, goes off on square 1, striking the red fuzzballs on squares 4 and 6. */
const OFF_MS = HOPS_MS + FEEL.blastAfterMs;

/** When it bursts, its static leapt to both and held. */
const BURST_MS = OFF_MS + 2 * FEEL.frizzballStepMs + FEEL.frizzballHoldMs;

/** When the frizzball goes off with a dasher swapped with it, once the pair has wound up. */
const PAIR_MS = HOPS_MS + FEEL.pairMs;

/** Returns a dasher a frizzball's pair gives a fuzzball it strikes, going off on its square. */
function givenOn(piece: number, square: number, step: number): Blast {
  return {
    what: "dasher-down",
    square,
    piece,
    kind: "red",
    setOffBy: 0,
    wait: step,
    strikes: [{ square, step: 0 }],
  };
}

/** Returns the timeline of the frizzball going off with a dasher, giving a dasher to each red fuzzball it strikes that goes off as one. */
function withDasher(given: readonly Blast[]): Timeline {
  const play = firstWaveOf(MOVE_FIXTURES.frizzballGoesOff);
  const pair: Blast = {
    ...itemAt(play.wave.blasts, 0),
    what: "frizzball-and-dasher",
  };
  const wave = {
    ...play.wave,
    blasts: [pair, ...given],
  };
  const reach = itemAt(reachesOf(wave, play.hopsMs, FEEL), 0);
  return timelineOfParts(
    play.grid,
    frizzballOff(pair, reach, { ...play, wave }),
  );
}

describe("frizzballOff", () => {
  const timeline = blastTimeline(MOVE_FIXTURES.frizzballGoesOff, frizzballOff);
  const dimAt = (ms: number): number =>
    sampleAt(timeline, FEEL, ms, frameFor(timeline)).board.dim;

  it("dims the board as it goes off, until it bursts, then brightens it", () => {
    expect([
      dimAt(OFF_MS),
      dimAt(BURST_MS),
      dimAt(BURST_MS + FEEL.frizzballUndimMs),
    ]).toEqual([FEEL.frizzballDim, FEEL.frizzballDim, 0]);
  });

  it("swells the frizzball, its fur on end, over all the rest", () => {
    expect(pieceAt(timeline, 5, OFF_MS + FEEL.frizzballSwellMs)).toMatchObject({
      scaleX: FEEL.frizzballSwellScale,
      lift: 1,
      raise: RAISED.top,
    });
  });

  it("leaps a bolt of static to each fuzzball it strikes in turn", () => {
    expect(timeline.effects.filter(({ what }) => what === "bolt")).toEqual([
      {
        what: "bolt",
        atMs: OFF_MS,
        ms: FEEL.boltMs,
        from: { x: 1, y: 0 },
        to: { x: 1, y: 1 },
      },
      {
        what: "bolt",
        atMs: OFF_MS + FEEL.frizzballStepMs,
        ms: FEEL.boltMs,
        from: { x: 1, y: 0 },
        to: { x: 0, y: 2 },
      },
    ]);
  });

  it("stands each fuzzball's fur on end, wide-eyed, as the static reaches it", () => {
    const reachesMs = OFF_MS + FEEL.frizzballStepMs;

    expect([
      pieceAt(timeline, 7, reachesMs - 1).face,
      pieceAt(timeline, 7, reachesMs + FEEL.frizzedLiftMs),
    ]).toMatchObject(["rest", { face: "eep", lift: 1 }]);
  });

  it("bursts the frizzball into its kind's tufts, a ring and a flash, and shakes the board", () => {
    const goneMs = BURST_MS + FEEL.frizzballBurstMs;

    expect([
      pieceAt(timeline, 5, goneMs),
      timeline.pieces.find(({ id }) => id === 5)?.untilMs,
      timeline.effects.filter(({ atMs }) => atMs === BURST_MS),
    ]).toMatchObject([
      { scaleX: FEEL.frizzballBurstScale, fade: 1 },
      goneMs,
      [
        {
          what: "fluff",
          tuft: "tuft-red",
          count: FEEL.frizzballTufts,
          power: FEEL.frizzballTuftPower,
        },
        {
          what: "ring",
          radius: FEEL.frizzballRingSquares,
          ms: FEEL.frizzballRingMs,
          ink: "white",
        },
        { what: "flash", radius: FEEL.frizzballFlashSquares, ms: FEEL.flashMs },
        { what: "shake", px: FEEL.shakeFrizzballPx },
      ],
    ]);
  });

  it("gives nothing to a fuzzball a frizzball alone strikes", () => {
    expect(timeline.pieces.find(({ id }) => id === 2)?.becomes).toEqual([]);
  });

  describe("with a special swapped with it", () => {
    const paired = withDasher([givenOn(2, 4, 1), givenOn(7, 6, 2)]);

    it("gives each fuzzball it strikes the special it goes off as, as the static reaches it", () => {
      expect(paired.pieces.find(({ id }) => id === 7)?.becomes).toMatchObject([
        {
          atMs: PAIR_MS + FEEL.frizzballStepMs,
          piece: { id: 7, special: "dasher-down" },
        },
      ]);
    });

    it("grows the special's fur in", () => {
      expect([
        pieceAt(paired, 2, PAIR_MS).furIn,
        pieceAt(paired, 2, PAIR_MS + FEEL.givenFurMs).furIn,
      ]).toEqual([0, 1]);
    });

    it("gives nothing to a fuzzball it strikes that goes off as no special", () => {
      expect(
        withDasher([givenOn(7, 6, 2)]).pieces.find(({ id }) => id === 2)
          ?.becomes,
      ).toEqual([]);
    });
  });
});
