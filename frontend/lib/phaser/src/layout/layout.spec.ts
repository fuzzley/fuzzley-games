import { NO_INSETS } from "../insets";
import { type CellField, type Viewport, fitCells } from "./layout";

/** Returns a viewport of a CSS size at a pixel ratio. */
function viewport(
  width: number,
  height: number,
  pixelRatio: number,
  insets = NO_INSETS,
): Viewport {
  return {
    width: Math.round(width * pixelRatio),
    height: Math.round(height * pixelRatio),
    pixelRatio,
    insets,
  };
}

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

  it("keeps clear of the chrome", () => {
    const fit = fitCells(
      viewport(400, 400, 1, { top: 100, right: 0, bottom: 20, left: 30 }),
      TALL,
    );

    expect({
      top: fit.y >= 100,
      left: fit.x >= 30,
      bottom: fit.y + fit.height <= 380,
    }).toEqual({ top: true, left: true, bottom: true });
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

  it("scales the frame by the pixel ratio, to a pixel at least", () => {
    const thick = fitCells(viewport(400, 300, 3), TALL);
    const thin = fitCells(viewport(400, 300, 1), {
      ...TALL,
      frameCss: 0.2,
    });

    expect([thick.frame, thin.frame]).toEqual([6, 1]);
  });

  it("keeps a cell at least a pixel on a canvas too small for the field", () => {
    expect(fitCells(viewport(4, 4, 1), TALL).cell).toBe(1);
  });
});
