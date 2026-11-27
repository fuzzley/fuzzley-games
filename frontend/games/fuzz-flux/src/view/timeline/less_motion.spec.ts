import { FEEL } from "./feel";
import { MOTIONS, withLessMotion } from "./less_motion";
import type { Effect } from "./timeline";

/** Returns a fluff of some tufts at the board's corner. */
function fluffOf(count: number): Effect {
  return {
    what: "fluff",
    atMs: 0,
    at: { x: 0, y: 0 },
    tuft: "tuft-red",
    count,
    power: 1,
  };
}

describe("MOTIONS", () => {
  it("offers moves in full and with Less motion", () => {
    expect(MOTIONS).toEqual(["full", "less"]);
  });
});

describe("withLessMotion", () => {
  it("keeps no shake and no flash", () => {
    expect(
      withLessMotion(
        [
          { what: "shake", atMs: 0, px: 4 },
          { what: "flash", atMs: 0, ms: 110, at: { x: 0, y: 0 }, radius: 2 },
        ],
        FEEL,
      ),
    ).toEqual([]);
  });

  it("keeps a quarter of each fluff's tufts, rounded", () => {
    expect(withLessMotion([fluffOf(10)], FEEL)).toEqual([fluffOf(3)]);
  });

  it("keeps no fluff a quarter of which rounds to none", () => {
    expect(withLessMotion([fluffOf(1)], FEEL)).toEqual([]);
  });

  it("keeps every other effect as it is", () => {
    const others: readonly Effect[] = [
      {
        what: "ring",
        atMs: 0,
        ms: 200,
        at: { x: 0, y: 0 },
        radius: 1,
        ink: "white",
      },
      {
        what: "streak",
        atMs: 0,
        ms: 200,
        from: { x: 0, y: 0 },
        to: { x: 3, y: 0 },
        ink: "red",
      },
      {
        what: "bolt",
        atMs: 0,
        ms: 90,
        from: { x: 0, y: 0 },
        to: { x: 1, y: 1 },
      },
      {
        what: "gust-line",
        atMs: 0,
        ms: 300,
        at: { x: 0, y: 0 },
        blows: "left",
      },
    ];

    expect(withLessMotion(others, FEEL)).toEqual(others);
  });
});
