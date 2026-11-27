import type { Point } from "@fz/phaser/shapes";
import type { BoardMetrics } from "../board/metrics";
import type { Way } from "../board/spaces";
import { FEEL } from "../timeline/feel";
import { PressReader } from "./gesture";

/** A board of squares 50 device pixels wide, on which a press swipes once it runs 20. */
const METRICS: BoardMetrics = {
  square: 50,
  x: 0,
  y: 0,
  width: 400,
  height: 450,
  css: { x: 0, y: 0, width: 400, height: 450 },
  panels: null,
};

/** Where every press starts. */
const FROM: Point = { x: 100, y: 100 };

/** Returns a reader with a press under way from {@link FROM}. */
function pressing(): PressReader {
  const reader = new PressReader();
  reader.start(FROM, METRICS, FEEL);
  return reader;
}

describe("PressReader", () => {
  describe("move", () => {
    it.each<[Way, Point]>([
      ["right", { x: 120, y: 100 }],
      ["left", { x: 80, y: 100 }],
      ["down", { x: 100, y: 120 }],
      ["up", { x: 100, y: 80 }],
    ])("reads a press %s 0.4 of a square long as a swipe", (way, to) => {
      expect(pressing().move(to)).toBe(way);
    });

    it("reads no swipe from a press short of 0.4 of a square", () => {
      expect(pressing().move({ x: 119.9, y: 119.9 })).toBeNull();
    });

    it("reads a swipe along the axis the press runs along most", () => {
      expect(pressing().move({ x: 115, y: 125 })).toBe("down");
    });

    it("reads a press as far along both axes as a swipe up or down", () => {
      expect(pressing().move({ x: 75, y: 75 })).toBe("up");
    });

    it.each<[number, Way | null]>([
      [39, null],
      [40, "right"],
    ])(
      "measures 0.4 of the board's own square: a press of %i on squares of 100 reads %s",
      (x, read) => {
        const reader = new PressReader();
        reader.start({ x: 0, y: 0 }, { ...METRICS, square: 100 }, FEEL);

        expect(reader.move({ x, y: 0 })).toBe(read);
      },
    );

    it.each<[number, Way | null]>([
      [29, null],
      [30, "right"],
    ])(
      "measures the feel's share of a square: a press of %i at 0.6 of 50 reads %s",
      (x, read) => {
        const reader = new PressReader();
        reader.start({ x: 0, y: 0 }, METRICS, { ...FEEL, swipeSquares: 0.6 });

        expect(reader.move({ x, y: 0 })).toBe(read);
      },
    );

    it("reads one swipe a press", () => {
      const reader = pressing();
      reader.move({ x: 120, y: 100 });

      expect(reader.move({ x: 100, y: 160 })).toBeNull();
    });

    it("reads a swipe from the next press", () => {
      const reader = pressing();
      reader.move({ x: 120, y: 100 });
      reader.end({ x: 120, y: 100 });
      reader.start(FROM, METRICS, FEEL);

      expect(reader.move({ x: 100, y: 120 })).toBe("down");
    });

    it("reads nothing between presses", () => {
      expect(new PressReader().move({ x: 200, y: 100 })).toBeNull();
    });
  });

  describe("end", () => {
    it("reads a press that ends short of a swipe as a tap", () => {
      const reader = pressing();
      reader.move({ x: 110, y: 110 });

      expect(reader.end({ x: 105, y: 105 })).toBe("tap");
    });

    it("reads a press that first runs far enough as it ends as a swipe", () => {
      expect(pressing().end({ x: 100, y: 130 })).toBe("down");
    });

    it("reads a press that swiped before it ends as nothing more", () => {
      const reader = pressing();
      reader.move({ x: 120, y: 100 });

      expect(reader.end({ x: 100, y: 100 })).toBeNull();
    });

    it("reads nothing between presses", () => {
      const reader = pressing();
      reader.end(FROM);

      expect(reader.end(FROM)).toBeNull();
    });
  });

  describe("cancel", () => {
    it("forgets the press under way, which then reads as nothing", () => {
      const reader = pressing();
      reader.cancel();

      expect(reader.end(FROM)).toBeNull();
    });
  });
});
