import type { Wind } from "../../rules/board/board";
import { billionths } from "../../testing/art_frames";
import type { Place } from "../timeline/timeline";
import {
  type GustLine,
  type GustLineRun,
  LONGEST_GUST_LINE,
  gustLineAt,
} from "./gust_line";

/** A board 8 squares by 8. */
const BOARD = { width: 8, height: 8 };

/** Returns a line of wind blowing a way from a square, the board's first unless given. */
function lineBlowing(blows: Wind, at: Place = { x: 0, y: 0 }): GustLine {
  return { what: "gust-line", atMs: 0, ms: 520, at, blows };
}

/** Returns where a line of wind is a share through its crossing on `BOARD`, its numbers to a billionth. */
function crossedAt(line: GustLine, done: number): GustLineRun {
  const run = gustLineAt(line, done, BOARD, {
    x: 0,
    y: 0,
    angle: 0,
    length: 0,
    shown: 0,
    alpha: 0,
  });
  return {
    x: billionths(run.x),
    y: billionths(run.y),
    angle: billionths(run.angle),
    length: billionths(run.length),
    shown: billionths(run.shown),
    alpha: billionths(run.alpha),
  };
}

describe("gustLineAt", () => {
  it("sets a line out unseen, from 0.48 to 1.2 squares on from where it set out", () => {
    expect(crossedAt(lineBlowing("right"), 0)).toEqual({
      x: 0.84,
      y: 0,
      angle: 0,
      length: 0.72,
      shown: 1,
      alpha: 0,
    });
  });

  it("runs it on and grows it as it crosses, at its most opaque halfway", () => {
    expect(crossedAt(lineBlowing("right"), 0.5)).toEqual({
      x: 1.68,
      y: 0,
      angle: 0,
      length: 1.44,
      shown: 1,
      alpha: 0.6,
    });
  });

  it("ends it unseen at its longest, from 1.44 to 3.6 squares on", () => {
    expect(crossedAt(lineBlowing("right"), 1)).toEqual({
      x: 2.52,
      y: 0,
      angle: 0,
      length: 2.16,
      shown: 1,
      alpha: 0,
    });
  });

  it("ends it as long as the longest a line is drawn", () => {
    expect(crossedAt(lineBlowing("right"), 1).length).toBe(
      billionths(LONGEST_GUST_LINE),
    );
  });

  it.each<[Wind, number, number, number]>([
    ["down", 0, 1.68, Math.PI / 2],
    ["up", 0, -1.68, -Math.PI / 2],
    ["left", -1.68, 0, Math.PI],
  ])(
    "points it and runs it on the way the wind blows, %s",
    (blows, x, y, angle) => {
      expect(crossedAt(lineBlowing(blows), 0.5)).toMatchObject({
        x,
        y,
        angle: billionths(angle),
      });
    },
  );

  it.each<[Wind, Place]>([
    ["right", { x: 6, y: 0 }],
    ["down", { x: 0, y: 6 }],
    ["left", { x: 1, y: 0 }],
    ["up", { x: 0, y: 1 }],
  ])(
    "cuts a line blowing %s off where it runs 0.3 squares past the board's edge",
    (blows, at) => {
      // Halfway through, its near end lies 0.96 squares on and its far end
      // 2.4, past the clip 1.8 squares on.
      expect(crossedAt(lineBlowing(blows, at), 0.5).shown).toBe(
        billionths((1.8 - 0.96) / 1.44),
      );
    },
  );

  it("shows none of a line once its near end has run past the clip", () => {
    expect(crossedAt(lineBlowing("right", { x: 7, y: 0 }), 1).shown).toBe(0);
  });
});
