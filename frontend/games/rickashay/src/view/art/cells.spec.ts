import { type Area, rect } from "@fz/phaser/shapes";
import { cellFrame, cellOf } from "./cells";

describe("cellOf", () => {
  it.each([
    [62, 62],
    [62.4, 62],
    [45.5, 46],
  ])(
    "makes a cell a unit square at %f device pixels a unit, in whole pixels: %i",
    (unit, side) => {
      expect(cellOf({ unit, pixelRatio: 2 })).toEqual({
        x: 0,
        y: 0,
        width: side,
        height: side,
      });
    },
  );

  it("keeps a cell a pixel square at a scale under a pixel a unit", () => {
    expect(cellOf({ unit: 0.3, pixelRatio: 1 })).toEqual({
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

    expect(cellFrame("steel", { unit: 31.6, pixelRatio: 1 }, fill)).toEqual({
      name: "steel",
      width: 32,
      height: 32,
      commands: [
        rect({ x: 0, y: 0, width: 32, height: 32 }, { color: 0x123456 }),
      ],
    });
  });
});
