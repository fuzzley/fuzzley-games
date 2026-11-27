import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import { HOPS_MS, blastTimeline, pieceAt } from "../../../testing/played_parts";
import { FEEL } from "../feel";
import { RAISED } from "../looks";
import { frameFor, sampleAt } from "../sample";
import { frizzballOff } from "./frizzball";

/** When the frizzball, piece 5, goes off on square 1, striking the red fuzzballs on squares 4 and 6. */
const OFF_MS = HOPS_MS + FEEL.blastAfterMs;

/** When it bursts, its static leapt to both and held. */
const BURST_MS = OFF_MS + 2 * FEEL.frizzballStepMs + FEEL.frizzballHoldMs;

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
});
