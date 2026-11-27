import { extentOf } from "@fz/phaser/shapes";
import { ART_PALETTE } from "../../testing/art_frames";
import { FRAMES } from "./frame_names";
import { wellFrame, wellOf } from "./well";

describe("wellOf", () => {
  it("leaves 3 of the design's units of its square round a well, where the page shows between two wells and round a gap", () => {
    expect(extentOf(wellOf(0x123456))).toEqual({
      x: -47,
      y: -47,
      width: 94,
      height: 94,
    });
  });

  it("rounds a well's corners 17 units, in its color", () => {
    expect(wellOf(0x123456)).toMatchObject({
      kind: "roundRect",
      radius: 17,
      color: 0x123456,
    });
  });
});

describe("wellFrame", () => {
  it("draws the square's well in the square's color, in a frame as large as the well in whole pixels", () => {
    const frame = wellFrame(ART_PALETTE, { unit: 50, pixelRatio: 1 });

    expect({
      name: frame.name,
      width: frame.width,
      height: frame.height,
      colors: frame.commands.map(({ color }) => color),
    }).toEqual({
      name: FRAMES.square,
      width: 48,
      height: 48,
      colors: [ART_PALETTE.square],
    });
  });
});
