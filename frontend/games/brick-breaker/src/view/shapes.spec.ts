import { lineWidth } from "./shapes";

describe("lineWidth", () => {
  it.each([
    [{ unit: 6, pixelRatio: 1 }, 1],
    [{ unit: 9, pixelRatio: 3 }, 3],
    [{ unit: 42, pixelRatio: 1 }, 3],
    [{ unit: 58, pixelRatio: 1 }, 3],
  ])(
    "draws a line in whole device pixels, a CSS pixel at least, at %o",
    (scale, width) => {
      expect(lineWidth(scale)).toBe(width);
    },
  );
});
