import type { Wind } from "../../rules/board/board";
import { billionths } from "../../testing/art_frames";
import { type GustLine, type GustLineRun, gustLineAt } from "./gust_line";

/** Returns a line of wind blowing a way from the board's first square. */
function lineBlowing(blows: Wind): GustLine {
  return { what: "gust-line", atMs: 0, ms: 520, at: { x: 0, y: 0 }, blows };
}

/** Returns where a line of wind is a share through its crossing, its numbers to a billionth. */
function crossedAt(line: GustLine, done: number): GustLineRun {
  const run = gustLineAt(line, done, {
    x: 0,
    y: 0,
    angle: 0,
    length: 0,
    alpha: 0,
  });
  return {
    x: billionths(run.x),
    y: billionths(run.y),
    angle: billionths(run.angle),
    length: billionths(run.length),
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
      alpha: 0,
    });
  });

  it("runs it on and grows it as it crosses, at its most opaque halfway", () => {
    expect(crossedAt(lineBlowing("right"), 0.5)).toEqual({
      x: 1.68,
      y: 0,
      angle: 0,
      length: 1.44,
      alpha: 0.6,
    });
  });

  it("ends it unseen at its longest, from 1.44 to 3.6 squares on", () => {
    expect(crossedAt(lineBlowing("right"), 1)).toEqual({
      x: 2.52,
      y: 0,
      angle: 0,
      length: 2.16,
      alpha: 0,
    });
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
});
