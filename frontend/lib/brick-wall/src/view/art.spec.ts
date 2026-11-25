import { type Area, circle, polygon, rect } from "@fz/phaser/shapes";
import { cellArea, cellFrame, detailed, dotFrame, shardFrame } from "./art";

describe("cellArea", () => {
  it.each([
    [62, 62],
    [62.4, 62],
    [45.5, 46],
  ])(
    "makes a cell a unit square at %f device pixels a unit, in whole pixels: %i",
    (unit, side) => {
      expect(cellArea({ unit, pixelRatio: 2 })).toEqual({
        x: 0,
        y: 0,
        width: side,
        height: side,
      });
    },
  );

  it("keeps a cell a pixel square at a scale under a pixel a unit", () => {
    expect(cellArea({ unit: 0.3, pixelRatio: 1 })).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });
});

describe("cellFrame", () => {
  it("names a frame the size of a cell, drawn in that cell", () => {
    const fill = (cell: Area) => [rect(cell, { color: 0x123456 })];

    expect(cellFrame("slab", { unit: 31.6, pixelRatio: 1 }, fill)).toEqual({
      name: "slab",
      width: 32,
      height: 32,
      commands: [
        rect({ x: 0, y: 0, width: 32, height: 32 }, { color: 0x123456 }),
      ],
    });
  });
});

describe("detailed", () => {
  it.each([
    [60, 2, true],
    [58, 2, false],
    [30, 1, true],
    [29, 1, false],
    [90, 3, true],
    [87, 3, false],
  ])(
    "draws the finest detail at %i device pixels a unit, %i to a CSS pixel, from 30 CSS pixels a unit: %s",
    (unit, pixelRatio, shown) => {
      expect(detailed({ unit, pixelRatio })).toBe(shown);
    },
  );
});

describe("dotFrame", () => {
  it("names a frame as wide as its dot, which fills it", () => {
    expect(dotFrame("dot", 6, 0x123456)).toEqual({
      name: "dot",
      width: 6,
      height: 6,
      commands: [circle({ x: 3, y: 3 }, 3, { color: 0x123456 })],
    });
  });
});

describe("shardFrame", () => {
  it("names a frame a shard wide, a sliver of a triangle in white across it", () => {
    const scale = { unit: 40, pixelRatio: 2 };
    // SHARD, 0.3 of a unit 40 device pixels wide.
    const side = 12;

    expect(shardFrame("bit", scale)).toEqual({
      name: "bit",
      width: side,
      height: side,
      commands: [
        polygon(
          [
            { x: 0, y: side },
            { x: side, y: 0.6 * side },
            { x: 0.35 * side, y: 0 },
          ],
          { color: 0xffffff },
        ),
      ],
    });
  });
});
