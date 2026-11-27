import { boardFrom } from "../../testing/board_picture";
import type { Making, Swap } from "../move/record";
import { findBunches } from "./find";

/**
 * Returns what the first bunch on a board drawn as a picture leaves, and
 * where, after a fall or the swap given, the picture drawn as the swap
 * left the board.
 */
function madeOn(
  picture: readonly string[],
  swap: Pick<Swap, "from" | "to"> | null = null,
): Omit<Making, "piece"> | null {
  const [bunch] = findBunches(boardFrom(picture), swap);
  return bunch?.makes ?? null;
}

describe("makingOf, through findBunches", () => {
  it("leaves nothing for 3 in a line", () => {
    expect(madeOn(["bbb"])).toBeNull();
  });

  describe("after a fall", () => {
    it.each([
      ["a dasher for 4 across, at the left of its middle two", ["bbbb"], 1],
      ["a dasher for 4 down, at its bottom", ["b", "b", "b", "b"], 3],
    ])("leaves %s, running down", (_, picture, square) => {
      expect(madeOn(picture)).toEqual({ what: "dasher-down", square });
    });

    it("leaves a wisp for a square of 4, at its bottom left", () => {
      expect(madeOn([".bb", ".bb"])).toEqual({ what: "wisp", square: 4 });
    });

    it.each([
      ["an L, at its corner", ["b..", "b..", "bbb"], 6],
      ["a T, where its lines cross", ["bbb", ".b.", ".b."], 1],
      ["a +, where its lines cross", [".b.", "bbb", ".b."], 4],
    ])("leaves a puffer for %s", (_, picture, square) => {
      expect(madeOn(picture)).toEqual({ what: "puffer", square });
    });

    it("leaves a puffer where its first line down, column by column, first crosses one across", () => {
      const picture = ["b.bbb", "b.b..", "bbb.."];

      expect(madeOn(picture)).toEqual({ what: "puffer", square: 10 });
    });

    it.each([
      ["across, at its middle", ["bbbbb"], 2],
      ["down, at its bottom", ["b", "b", "b", "b", "b"], 4],
      ["across, at the left of its middle two", ["bbbbbb"], 2],
    ])(
      "leaves the frizzball for 5 or more in a line %s",
      (_, picture, square) => {
        expect(madeOn(picture)).toEqual({ what: "frizzball", square });
      },
    );
  });

  describe("in the design's order, where a bunch could make two", () => {
    it("leaves the frizzball before a puffer, in its longest line", () => {
      expect(madeOn(["..b..", "bbbbb", "..b.."])).toEqual({
        what: "frizzball",
        square: 7,
      });
    });

    it("leaves the frizzball in its first longest line, across before down", () => {
      const picture = ["..b..", "..b..", "bbbbb", "..b..", "..b.."];

      expect(madeOn(picture)).toEqual({ what: "frizzball", square: 12 });
    });

    it("leaves a puffer before a dasher", () => {
      expect(madeOn(["bbbb", "b...", "b..."])).toEqual({
        what: "puffer",
        square: 0,
      });
    });

    it("leaves a dasher before a wisp", () => {
      expect(madeOn(["bbbb", "bb.."])).toEqual({
        what: "dasher-down",
        square: 1,
      });
    });
  });

  describe("after a swap", () => {
    it("leaves a dasher across where a swap across moved a fuzzball into 4 down", () => {
      const picture = ["b.", "b.", "b.", "b."];

      expect(madeOn(picture, { from: 7, to: 6 })).toEqual({
        what: "dasher-across",
        square: 6,
      });
    });

    it("leaves a dasher down where a swap down moved a fuzzball into 4 across", () => {
      const picture = ["....", "bbbb"];

      expect(madeOn(picture, { from: 2, to: 6 })).toEqual({
        what: "dasher-down",
        square: 6,
      });
    });

    it.each([
      ["a wisp", [".bb", ".bb"], 5, "wisp"],
      ["a puffer", ["..b", "..b", "bbb"], 5, "puffer"],
      ["the frizzball", ["bbbbb", "....."], 7, "frizzball"],
    ] as const)(
      "leaves %s where the swap moved a fuzzball in",
      (_, picture, from, what) => {
        expect(madeOn(picture, { from, to: 2 })).toEqual({ what, square: 2 });
      },
    );

    it("leaves it where the neighbor came in, the square picked up", () => {
      const picture = ["bbbb", "...."];

      expect(madeOn(picture, { from: 3, to: 7 })).toEqual({
        what: "dasher-down",
        square: 3,
      });
    });

    it("leaves it where the fuzzball picked up came in, where both did", () => {
      const picture = ["bbbb", "...."];

      expect(madeOn(picture, { from: 2, to: 3 })).toEqual({
        what: "dasher-across",
        square: 3,
      });
    });

    it.each([
      ["down", { from: 4, to: 8 }],
      ["across", { from: 8, to: 9 }],
    ])(
      "leaves a bunch a swap %s moved nothing into as a fall would",
      (_, swap) => {
        const picture = ["bbbb", "....", "...."];

        expect(madeOn(picture, swap)).toEqual({
          what: "dasher-down",
          square: 1,
        });
      },
    );
  });
});
