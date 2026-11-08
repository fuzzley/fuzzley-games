import {
  MAX_BUDGETED_DEVICE_PIXELS,
  MAX_PIXEL_RATIO,
  UNBUDGETED_PIXEL_RATIO,
  canvasPixelRatio,
  pixelRatioFor,
} from "./pixel_ratio";

describe("canvasPixelRatio", () => {
  it.each([
    ["a display's own ratio", 2, 2],
    ["a fractional one as it is", 2.625, 2.625],
    ["no more than the most", 4, MAX_PIXEL_RATIO],
    ["no less than 1, for a page zoomed out", 0.5, 1],
    ["1 for a host that gives none", 0, 1],
  ])("renders at %s", (_, devicePixelRatio, ratio) => {
    expect(canvasPixelRatio(devicePixelRatio)).toBe(ratio);
  });
});

describe("pixelRatioFor", () => {
  it.each([
    ["a display of 1 at its own ratio", 1, 1280, 720, 1],
    ["any canvas at 2 at 2", 2, 2560, 1440, UNBUDGETED_PIXEL_RATIO],
    ["a phone at its own ratio of 3", 3, 390, 844, 3],
    ["a phone's fractional ratio above 2 as it is", 2.625, 412, 915, 2.625],
    ["a phone no higher than the most", 4, 390, 844, MAX_PIXEL_RATIO],
    // The host makes the canvas a CSS pixel across, whose 1,125,000 down
    // hold 4.5 million device pixels at 2.
    [
      "a canvas collapsed across as one a pixel wide, held to the budget",
      3,
      0,
      1_125_000,
      2,
    ],
    ["a large window at 3 at 2, never below", 3, 2560, 1440, 2],
  ])("renders %s", (_, devicePixelRatio, cssWidth, cssHeight, ratio) => {
    expect(pixelRatioFor(devicePixelRatio, cssWidth, cssHeight)).toBe(ratio);
  });

  it("holds a canvas above 2x to the budget of device pixels", () => {
    expect(pixelRatioFor(3, 1280, 720)).toBeCloseTo(
      Math.sqrt(MAX_BUDGETED_DEVICE_PIXELS / (1280 * 720)),
    );
  });

  it("counts the canvas in whole CSS pixels, as the host sizes it", () => {
    expect(pixelRatioFor(3, 1280.9, 720.9)).toBe(pixelRatioFor(3, 1280, 720));
  });
});
