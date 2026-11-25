import { coilLines } from "./coil";

/** A coil of 3 turns, its middle at 50, from 20 down to 60, 10 to either side. */
const LINES = coilLines({ middle: 50, top: 20, foot: 60, half: 10, turns: 3 });

describe("coilLines", () => {
  it("lays its top plate and its foot across its middle, half its width to either side", () => {
    expect([LINES.top, LINES.foot]).toEqual([
      [
        { x: 40, y: 20 },
        { x: 60, y: 20 },
      ],
      [
        { x: 40, y: 60 },
        { x: 60, y: 60 },
      ],
    ]);
  });

  it("zigzags from its top plate's middle, out to its right first and then to either side in turn, its turns evenly spaced, to its foot's middle", () => {
    expect(LINES.zigzag).toEqual([
      { x: 50, y: 20 },
      { x: 60, y: 30 },
      { x: 40, y: 40 },
      { x: 60, y: 50 },
      { x: 50, y: 60 },
    ]);
  });
});
