import { viewport } from "../testing/pure";
import {
  type CellField,
  cssRectOf,
  fitCells,
  framePixels,
  roomInside,
} from "./layout";

/** A field as tall as Brick Breaker's: 26 across, 30 down, a 2 px frame. */
const TALL: CellField = { across: 26, down: 30, frameCss: 2 };

describe("fitCells", () => {
  it.each([
    [400, 300, 1],
    [390, 600, 3],
    [517, 517, 2.625],
    [1000, 701, 1.25],
  ])(
    "makes each cell whole device pixels, on whole pixels (%i × %i at %f)",
    (width, height, ratio) => {
      const fit = fitCells(viewport(width, height, ratio), TALL);

      expect(
        [fit.cell, fit.x, fit.y, fit.frame].every((n) => Number.isInteger(n)),
      ).toBe(true);
    },
  );

  it("fits the largest field the room holds, with its frame, when the height binds", () => {
    const fit = fitCells(viewport(400, 300, 1), TALL);

    // 300 less two frames of 2 leaves 296: 30 cells of 9.
    expect({ cell: fit.cell, width: fit.width, height: fit.height }).toEqual({
      cell: 9,
      width: 234,
      height: 270,
    });
  });

  it("fits the largest field the room holds when the width binds", () => {
    const fit = fitCells(viewport(200, 600, 1), TALL);

    // 200 less two frames of 2 leaves 196: 26 cells of 7.
    expect(fit.cell).toBe(7);
  });

  it("centers the field", () => {
    const fit = fitCells(viewport(400, 300, 1), TALL);

    expect([fit.x, fit.y]).toEqual([83, 15]);
  });

  it("keeps the field and its frame clear of the chrome", () => {
    const fit = fitCells(
      viewport(400, 400, 1, { top: 100, right: 40, bottom: 20, left: 30 }),
      TALL,
    );

    // The room inside the chrome runs from 30 to 360 across and 100 to 380
    // down: cells of 9, a field of 234 by 270 centered in it.
    expect({
      top: fit.y - fit.frame,
      right: fit.x + fit.width + fit.frame,
      bottom: fit.y + fit.height + fit.frame,
      left: fit.x - fit.frame,
    }).toEqual({ top: 103, right: 314, bottom: 377, left: 76 });
  });

  it("gives the field in CSS pixels", () => {
    const fit = fitCells(viewport(400, 300, 2), TALL);

    expect(fit.css).toEqual({
      x: fit.x / 2,
      y: fit.y / 2,
      width: fit.width / 2,
      height: fit.height / 2,
    });
  });

  it("scales the frame by the pixel ratio", () => {
    const fit = fitCells(viewport(400, 300, 3), TALL);

    expect(fit.frame).toBe(6);
  });

  it("keeps the frame a pixel at least", () => {
    const fit = fitCells(viewport(400, 300, 1), { ...TALL, frameCss: 0.2 });

    expect(fit.frame).toBe(1);
  });

  it("keeps a cell at least a pixel on a canvas too small for the field", () => {
    expect(fitCells(viewport(4, 4, 1), TALL).cell).toBe(1);
  });
});

describe("roomInside", () => {
  it("is the whole canvas, in device pixels, with no chrome over it", () => {
    expect(roomInside(viewport(400, 300, 2))).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
  });

  it("leaves out the chrome over each edge, in device pixels", () => {
    const insets = { top: 100, right: 40, bottom: 20, left: 30 };

    const room = roomInside(viewport(400, 400, 2, insets));

    expect(room).toEqual({ x: 60, y: 200, width: 660, height: 560 });
  });

  it("rounds each inset to the nearest device pixel", () => {
    const insets = { top: 10.4, right: 0.2, bottom: 0.4, left: 3.3 };

    const room = roomInside(viewport(100, 100, 1.5, insets));

    // On a canvas of 150 device pixels: 3.3 × 1.5 is 4.95, a left of 5,
    // and 0.2 × 1.5 is 0.3, a right of none, so a room 145 across; 10.4 ×
    // 1.5 is 15.6, a top of 16, and 0.4 × 1.5 is 0.6, a bottom of 1, so one
    // 133 down, where rounding their sum would leave 134.
    expect(room).toEqual({ x: 5, y: 16, width: 145, height: 133 });
  });
});

describe("framePixels", () => {
  it.each([
    [2, 1, 2],
    [2, 1.25, 3],
    [2, 2.625, 5],
    [2, 3, 6],
  ])(
    "makes a frame of %i CSS pixels whole device pixels at %f: %i",
    (css, ratio, pixels) => {
      expect(framePixels(css, ratio)).toBe(pixels);
    },
  );

  it("keeps a thin frame a pixel at least", () => {
    expect(framePixels(0.2, 1)).toBe(1);
  });
});

describe("cssRectOf", () => {
  it("gives a rectangle in device pixels in CSS pixels", () => {
    const rect = { x: 30, y: 60, width: 300, height: 150 };

    expect(cssRectOf(rect, 1.5)).toEqual({
      x: 20,
      y: 40,
      width: 200,
      height: 100,
    });
  });
});
