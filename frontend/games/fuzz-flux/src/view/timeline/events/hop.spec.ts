import { boardFrom } from "../../../testing/board_picture";
import { pieceAt, timelineOfParts } from "../../../testing/played_parts";
import { gridOf } from "../../../testing/shown_board";
import { FEEL } from "../feel";
import { RAISED } from "../looks";
import { standingOn } from "../standing";
import type { Timeline } from "../timeline";
import { hopOff, struckOff } from "./hop";

/** A board of a red fuzzball and the frizzball, numbered 1 and 2. */
const GRID = gridOf(boardFrom(["rf"]));

/** When the hops start. */
const AT_MS = 100;

/** Returns the timeline of the red fuzzball hopping off, a number of waves into its move. */
function hopOfRed(before = 0): Timeline {
  return timelineOfParts(
    GRID,
    hopOff(standingOn(GRID, 0), "red", AT_MS, before, FEEL),
  );
}

describe("hopOff", () => {
  it("swells the fuzzball, its fur on end, its eyes happy, raised over the board", () => {
    expect(pieceAt(hopOfRed(), 1, AT_MS + FEEL.hopMs)).toMatchObject({
      scaleX: FEEL.hopScale,
      scaleY: FEEL.hopScale,
      lift: 1,
      face: "happy",
      raise: RAISED.moving,
    });
  });

  it("fades it from part of the way through, and takes it off once faded", () => {
    const timeline = hopOfRed();
    const fadesMs = AT_MS + FEEL.hopMs * FEEL.hopFadeFrom;

    expect([
      pieceAt(timeline, 1, fadesMs).fade,
      timeline.pieces[0]?.untilMs,
    ]).toEqual([0, fadesMs + FEEL.hopMs * FEEL.hopFadeLength]);
  });

  it("leaves its kind's tufts and a thin ring of its kind", () => {
    expect(hopOfRed().effects).toEqual([
      {
        what: "fluff",
        atMs: AT_MS,
        at: { x: 0, y: 0 },
        tuft: "tuft-red",
        count: FEEL.bunchTufts,
        power: FEEL.tuftPower,
      },
      {
        what: "ring",
        atMs: AT_MS,
        ms: FEEL.hopRingMs,
        at: { x: 0, y: 0 },
        radius: FEEL.hopRingSquares,
        ink: "red",
      },
    ]);
  });

  it("leaves more tufts, flying harder, a wave into its move, to the most a wave adds", () => {
    expect([hopOfRed(2).effects[0], hopOfRed(20).effects[0]]).toMatchObject([
      {
        count: FEEL.bunchTufts + 2,
        power: FEEL.tuftPower + 2 * FEEL.tuftPowerPerWave,
      },
      {
        count: FEEL.bunchTufts + FEEL.mostWaveTufts,
        power: FEEL.tuftPower + 20 * FEEL.tuftPowerPerWave,
      },
    ]);
  });

  it("leaves no tufts of the frizzball, but a ring in its ink", () => {
    const timeline = timelineOfParts(
      GRID,
      hopOff(standingOn(GRID, 1), null, AT_MS, 0, FEEL),
    );

    expect(timeline.effects).toEqual([
      expect.objectContaining({ what: "ring", ink: "frizzball" }),
    ]);
  });
});

describe("struckOff", () => {
  const timeline = timelineOfParts(
    GRID,
    struckOff(standingOn(GRID, 0), "red", AT_MS, 0, FEEL),
  );

  it("has the fuzzball look wide-eyed, raised, a moment before it is struck", () => {
    expect(pieceAt(timeline, 1, AT_MS - FEEL.struckLookMs)).toMatchObject({
      face: "eep",
      raise: RAISED.moving,
    });
  });

  it("hops it off as it is struck", () => {
    expect(pieceAt(timeline, 1, AT_MS).face).toBe("happy");
  });
});
