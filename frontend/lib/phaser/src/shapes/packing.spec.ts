import { ATLAS_GUTTER, type FrameSize, atlasSize } from "./packing";

/** Returns a frame of a size. */
function frame(name: string, width: number, height = width): FrameSize {
  return { name, width, height };
}

describe("atlasSize", () => {
  it("packs four squares two to a row, a gutter between", () => {
    const squares = ["a", "b", "c", "d"].map((name) => frame(name, 10));

    const size = atlasSize(squares);

    // Each square is 12 with its gutter, and the last of a row needs none.
    expect(size).toEqual({ width: 22, height: 22 });
  });

  it("is as wide as its widest frame, the others in rows below it", () => {
    const frames = [frame("wall", 30, 8), frame("a", 10), frame("b", 14, 6)];

    const size = atlasSize(frames);

    // The wall fills the first row; a and b share the next, 10 tall.
    expect(size).toEqual({ width: 30, height: 8 + ATLAS_GUTTER + 10 });
  });

  it("gives an atlas of no frames a pixel", () => {
    expect(atlasSize([])).toEqual({ width: 1, height: 1 });
  });

  it("refuses two frames of one name", () => {
    expect(() => atlasSize([frame("ball", 6), frame("ball", 8)])).toThrow(
      'Two atlas frames are named "ball".',
    );
  });

  it("refuses a frame named as Phaser names a texture's whole", () => {
    expect(() => atlasSize([frame("__BASE", 6)])).toThrow(
      'An atlas frame can\'t be named "__BASE".',
    );
  });

  it.each([
    [6.5, 6],
    [6, 0],
  ])("refuses a frame of %f × %f, not whole pixels", (width, height) => {
    expect(() => atlasSize([frame("ball", width, height)])).toThrow(
      "not whole pixels above 0",
    );
  });

  it("refuses frames too large for any device", () => {
    expect(() => atlasSize([frame("wall", 5000, 10)])).toThrow(
      "larger than 4096 a side",
    );
  });
});
