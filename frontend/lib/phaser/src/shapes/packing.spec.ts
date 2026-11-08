import { ATLAS_GUTTER, type FrameSize, atlasSize, pack } from "./packing";

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
    const frames = [frame("a", 10), frame("b", 14, 6), frame("wall", 30, 12)];

    const size = atlasSize(frames);

    // As wide as the wall, which no other frame fits beside: its row of 12,
    // a gutter, and the row of 10 that a and b share.
    expect(size).toEqual({ width: 30, height: 12 + ATLAS_GUTTER + 10 });
  });

  it("packs the tallest frames first, so a row of short ones wastes little", () => {
    const frames = [
      frame("short", 10, 4),
      frame("tall", 10, 20),
      frame("short2", 10, 4),
      frame("tall2", 10, 20),
    ];

    const size = atlasSize(frames);

    // Two frames fit across 26: the tall ones share a row and the short ones
    // the next, where in the order given each row would be 20 tall, 42 in all.
    expect(size).toEqual({ width: 22, height: 20 + ATLAS_GUTTER + 4 });
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

describe("pack", () => {
  it("packs the tallest frames first, those of one height in the order given", () => {
    const frames = [
      frame("short", 10, 4),
      frame("first", 10, 8),
      frame("tall", 10, 20),
      frame("second", 10, 8),
    ];

    const { placed } = pack(frames);

    // Two fit across 24, a gutter between them and between the rows.
    expect(placed.map(({ frame, x, y }) => [frame.name, x, y])).toEqual([
      ["tall", 0, 0],
      ["first", 12, 0],
      ["second", 0, 22],
      ["short", 12, 22],
    ]);
  });
});
