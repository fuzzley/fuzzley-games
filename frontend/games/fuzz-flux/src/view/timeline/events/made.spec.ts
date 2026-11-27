import { boardFrom } from "../../../testing/board_picture";
import { pieceAt, timelineOfParts } from "../../../testing/played_parts";
import { gridOf } from "../../../testing/shown_board";
import { frameFor, sampleAt } from "../sample";
import { FEEL } from "../feel";
import { RAISED } from "../looks";
import { standingOn } from "../standing";
import type { Timeline } from "../timeline";
import { type Made, madeOf } from "./made";

/** A board of a blue fuzzball beside a red one, numbered 1 and 2. */
const GRID = gridOf(boardFrom(["br"]));

/** When the special shows. */
const AT_MS = 100;

/** Returns the timeline of a special made on the blue fuzzball's square. */
function madeOn(made: Partial<Made> = {}): Timeline {
  return timelineOfParts(
    GRID,
    madeOf(
      {
        making: { what: "puffer", square: 0, piece: 1 },
        kind: "blue",
        at: { x: 0, y: 0 },
        stays: true,
        onlookers: [standingOn(GRID, 1)],
        ...made,
      },
      AT_MS,
      FEEL,
    ),
  );
}

/** A frizzball made on the blue fuzzball's square. */
const FRIZZBALL: Partial<Made> = {
  making: { what: "frizzball", square: 0, piece: 1 },
};

describe("madeOf", () => {
  it("makes the fuzzball that stays the special, swollen, its fur on end, its second fur not yet in", () => {
    const timeline = madeOn();

    expect([
      timeline.pieces[0]?.becomes,
      pieceAt(timeline, 1, AT_MS),
    ]).toMatchObject([
      [{ atMs: AT_MS, piece: { id: 1, kind: "blue", special: "puffer" } }],
      {
        scaleX: FEEL.madeScale,
        lift: 1,
        furIn: 0,
        face: "eep",
        raise: RAISED.made,
      },
    ]);
  });

  it("settles it on a spring, its fur laid down and its second fur grown in", () => {
    expect(
      pieceAt(madeOn(), 1, AT_MS + Math.max(FEEL.madeMs, FEEL.madeFurMs)),
    ).toMatchObject({ scaleX: 1, scaleY: 1, lift: 0, furIn: 1 });
  });

  it("swings past its size on the way down", () => {
    expect(pieceAt(madeOn(), 1, AT_MS + FEEL.madeMs / 3).scaleX).toBeLessThan(
      1,
    );
  });

  it("glows it white", () => {
    expect(pieceAt(madeOn(), 1, AT_MS).glow).toBe(1);
  });

  it("lowers it to the board, its eyes at rest, once it has stood a while", () => {
    expect(pieceAt(madeOn(), 1, AT_MS + FEEL.madeStareMs)).toMatchObject({
      raise: 0,
      face: "rest",
    });
  });

  it("shows a new piece where the fuzzball on its square went off", () => {
    const timeline = madeOn({
      making: { what: "puffer", square: 0, piece: 9 },
      stays: false,
    });

    expect(timeline.pieces.at(-1)).toMatchObject({
      id: 9,
      fromMs: AT_MS,
      drawn: { special: "puffer" },
      face: "eep",
    });
  });

  it("spreads a white ring, then one in its kind's, sends tufts flying and shakes the board", () => {
    expect(madeOn().effects).toEqual([
      expect.objectContaining({
        what: "ring",
        atMs: AT_MS,
        radius: FEEL.madeWhiteRingSquares,
        ink: "white",
      }),
      expect.objectContaining({
        what: "fluff",
        count: FEEL.madeTufts,
        power: FEEL.madeTuftPower,
      }),
      { what: "shake", atMs: AT_MS, px: FEEL.shakeMadePx },
      expect.objectContaining({
        what: "ring",
        atMs: AT_MS + FEEL.madeInkRingAfterMs,
        radius: FEEL.madeInkRingSquares,
        ink: "blue",
      }),
    ]);
  });

  it("dims the board for a frizzball made, and brightens it again", () => {
    const timeline = madeOn(FRIZZBALL);
    const dimAt = (ms: number): number =>
      sampleAt(timeline, FEEL, ms, frameFor(timeline)).board.dim;

    expect([
      dimAt(AT_MS),
      dimAt(AT_MS + FEEL.frizzballMadeDimWaitMs + FEEL.frizzballMadeDimMs),
    ]).toEqual([FEEL.frizzballMadeDim, 0]);
  });

  it("has everyone on the board look at a frizzball made, wide-eyed, for a while", () => {
    const timeline = madeOn(FRIZZBALL);

    expect([
      pieceAt(timeline, 2, AT_MS),
      pieceAt(timeline, 2, AT_MS + FEEL.frizzballMadeStareMs),
    ]).toMatchObject([
      { lookX: -FEEL.frizzballMadeLook, lookY: 0, face: "eep" },
      { lookX: 0, face: "rest" },
    ]);
  });

  it("shakes the board harder for a frizzball made", () => {
    expect(madeOn(FRIZZBALL).effects).toContainEqual({
      what: "shake",
      atMs: AT_MS,
      px: FEEL.shakeFrizzballMadePx,
    });
  });
});
