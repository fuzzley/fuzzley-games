import { MAX_PIXEL_RATIO, canvasPixelRatio } from "./pixel_ratio";

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
