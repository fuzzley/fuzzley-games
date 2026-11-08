import { type CanvasSize, canvasSizeFor } from "./canvas_size";
import { MAX_BUDGETED_DEVICE_PIXELS } from "./pixel_ratio";

describe("canvasSizeFor", () => {
  it("takes the device pixels the browser counted at the display's own ratio, pinned at the box's unrounded CSS size", () => {
    expect(
      canvasSizeFor({ width: 390.4, height: 844 }, 3, {
        width: 1171,
        height: 2532,
      }),
    ).toEqual<CanvasSize>({
      width: 1171,
      height: 2532,
      pixelRatio: 3,
      cssWidth: 390.4,
      cssHeight: 844,
    });
  });

  it("takes the box in whole CSS pixels at the ratio where the browser counted none", () => {
    expect(
      canvasSizeFor({ width: 390.4, height: 844.6 }, 3),
    ).toEqual<CanvasSize>({
      width: 1170,
      height: 2532,
      pixelRatio: 3,
      cssWidth: 390,
      cssHeight: 844,
    });
  });

  it("takes the box in whole CSS pixels at the ratio the budget holds a large canvas to", () => {
    const budgeted = Math.sqrt(MAX_BUDGETED_DEVICE_PIXELS / (1280 * 720));

    const { width, pixelRatio, cssWidth } = canvasSizeFor(
      { width: 1280, height: 720 },
      3,
      { width: 3840, height: 2160 },
    );

    expect({ width, pixelRatio, cssWidth }).toEqual({
      width: 1280 * budgeted,
      pixelRatio: budgeted,
      cssWidth: 1280,
    });
  });

  it("takes the box in whole CSS pixels at the most ratio, on a display above it", () => {
    const { width, pixelRatio } = canvasSizeFor(
      { width: 390, height: 844 },
      4,
      {
        width: 1560,
        height: 3376,
      },
    );

    expect({ width, pixelRatio }).toEqual({ width: 1170, pixelRatio: 3 });
  });

  it("ignores a count from before a resize the browser has yet to report", () => {
    const { width } = canvasSizeFor({ width: 500, height: 844 }, 3, {
      width: 1170,
      height: 2532,
    });

    expect(width).toBe(1500);
  });

  it("ignores a count of no pixels, which would make no canvas", () => {
    expect(
      canvasSizeFor({ width: 0, height: 0 }, 1, { width: 0, height: 0 }),
    ).toEqual<CanvasSize>({
      width: 1,
      height: 1,
      pixelRatio: 1,
      cssWidth: 1,
      cssHeight: 1,
    });
  });

  it("makes a collapsed box a CSS pixel each way", () => {
    expect(canvasSizeFor({ width: 0, height: 0.5 }, 2)).toEqual<CanvasSize>({
      width: 2,
      height: 2,
      pixelRatio: 2,
      cssWidth: 1,
      cssHeight: 1,
    });
  });
});
