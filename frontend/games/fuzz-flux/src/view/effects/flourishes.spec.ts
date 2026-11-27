import { ART_PALETTE } from "../../testing/art_frames";
import { eased } from "../timeline/easing";
import { FEEL } from "../timeline/feel";
import {
  type Streak,
  type StreakRun,
  boltAlpha,
  boltFlipped,
  dustPuffAlpha,
  dustPuffRadius,
  flashAlpha,
  inkOf,
  markAlpha,
  markRise,
  markScale,
  ringAlpha,
  ringLine,
  ringRadius,
  streakAt,
} from "./flourishes";

/** Returns a streak that runs from a place to another. */
function streak(
  from: { x: number; y: number },
  to: { x: number; y: number },
): Streak {
  return { what: "streak", atMs: 0, ms: 100, from, to, ink: "white" };
}

/** Returns where a streak has run a share through its running on a board 4 squares across and 3 down. */
function runOf(
  from: { x: number; y: number },
  to: { x: number; y: number },
  done: number,
): StreakRun {
  return streakAt(
    streak(from, to),
    done,
    { width: 4, height: 3 },
    { x: 0, y: 0, angle: 0, behind: 0, ahead: 0 },
  );
}

describe("a wave's mark", () => {
  it("fades in over its first fifth, and out over the rest", () => {
    expect([0, 0.1, 0.2, 0.6, 1].map(markAlpha)).toEqual([0, 0.5, 1, 0.5, 0]);
  });

  it("pops in a third larger, and springs back to its size", () => {
    expect([markScale(0), markScale(1 / 3), markScale(1)]).toEqual([1.3, 1, 1]);
  });

  it("rises the feel's way from its place over its showing", () => {
    expect([markRise(0, FEEL), markRise(1, FEEL)]).toEqual([
      0,
      FEEL.markRiseSquares,
    ]);
  });
});

describe("an effect's ink", () => {
  it("is a kind's own, the frizzball's, or the effects' white", () => {
    expect(
      (["blue", "frizzball", "white"] as const).map((ink) =>
        inkOf(ink, ART_PALETTE),
      ),
    ).toEqual([
      ART_PALETTE.kinds.blue,
      ART_PALETTE.frizzball.body,
      ART_PALETTE.flare,
    ]);
  });
});

describe("a ring", () => {
  it("spreads from a quarter of a square to as far as it goes, slowing", () => {
    expect([0, 0.5, 1].map((done) => ringRadius(done, 2))).toEqual([
      0.25,
      expect.closeTo(0.25 + 1.75 * eased("out", 0.5), 9),
      2,
    ]);
  });

  it("fades from nearly opaque, ever more slowly", () => {
    expect([0, 0.75, 1].map(ringAlpha)).toEqual([0.9, 0.9 * 0.125, 0]);
  });

  it("thins its line to two fifths as it spreads", () => {
    expect([ringLine(0), ringLine(1)]).toEqual([
      0.09,
      expect.closeTo(0.036, 9),
    ]);
  });
});

describe("a flash", () => {
  it("fades from a little over half opaque to nothing", () => {
    expect([0, 0.5, 1].map(flashAlpha)).toEqual([0.55, 0.275, 0]);
  });
});

describe("a bolt of static", () => {
  it("fades ever faster", () => {
    expect([0, 0.5, 1].map(boltAlpha)).toEqual([1, 0.75, 0]);
  });

  it("flips across its line every 45 ms, as it flickers", () => {
    expect([0, 44, 45, 89, 90].map(boltFlipped)).toEqual([
      false,
      false,
      true,
      true,
      false,
    ]);
  });
});

describe("a puff of dust", () => {
  it("spreads from three tenths of a square to seven tenths, fading from 0.7 to nothing", () => {
    expect([
      [dustPuffRadius(0), dustPuffAlpha(0)],
      [dustPuffRadius(1), dustPuffAlpha(1)],
    ]).toEqual([
      [0.3, 0.7],
      [expect.closeTo(0.7, 9), 0],
    ]);
  });
});

describe("a dasher's streak", () => {
  it("runs its head from where it sets out to where it ends", () => {
    const { x, y, angle } = runOf({ x: 1, y: 1 }, { x: 1, y: -7 }, 0.25);

    expect([x, y, angle]).toEqual([1, -1, -Math.PI / 2]);
  });

  it("shows no further behind its head than where it set out", () => {
    expect(runOf({ x: 1, y: 1 }, { x: 9, y: 1 }, 0.25).behind).toBe(2);
  });

  it("shows ahead of its head as far as a little past the board's edge", () => {
    expect([
      runOf({ x: 1, y: 1 }, { x: 9, y: 1 }, 0.25).ahead,
      runOf({ x: 1, y: 1 }, { x: -7, y: 1 }, 0.125).ahead,
      runOf({ x: 1, y: 1 }, { x: 1, y: 9 }, 0.125).ahead,
    ]).toEqual([
      expect.closeTo(0.8, 9),
      expect.closeTo(0.8, 9),
      expect.closeTo(0.8, 9),
    ]);
  });

  it("shows less than nothing ahead of a head that has run past the edge", () => {
    expect(runOf({ x: 1, y: 1 }, { x: 9, y: 1 }, 0.75).ahead).toBeLessThan(0);
  });
});
