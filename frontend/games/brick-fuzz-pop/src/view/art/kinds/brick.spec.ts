import { mixColors } from "@fz/phaser/color";
import { extentOf } from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_FRAMES,
  ART_PALETTE,
  billionths,
  inBillionths,
} from "../../../testing/art_frames";
import type { KindLook } from "../art";
import { PLAIN_ART, tileBody, tileCommands, tileFrame } from "./brick";

const CELL = { x: 0, y: 0, width: 50, height: 50 };

const INK = 0x3366cc;

describe("tileFrame", () => {
  it("names the plain tile's frame in a tint", () => {
    expect(tileFrame(3)).toBe("tile-3");
  });

  it.each([-1, 8])("refuses tint %i, which no tile has", (tint) => {
    expect(() => tileFrame(tint)).toThrow(RangeError);
  });
});

describe("tileBody", () => {
  it.each([
    [50, 2],
    [62, 2],
    [10, 1],
    [3, 1],
  ])(
    "lies a whole number of pixels in from a cell %i pixels square on each side, a twenty-fifth of it: %i",
    (side, gap) => {
      expect(tileBody({ x: 0, y: 0, width: side, height: side })).toEqual({
        x: gap,
        y: gap,
        width: side - 2 * gap,
        height: side - 2 * gap,
      });
    },
  );

  it.each([1, 2])(
    "fills a cell %i pixels square, too small for a gap",
    (side) => {
      expect(tileBody({ x: 0, y: 0, width: side, height: side })).toEqual({
        x: 0,
        y: 0,
        width: side,
        height: side,
      });
    },
  );
});

describe("tileCommands", () => {
  const [lip, body, strip] = tileCommands(CELL, INK);

  it("lays a lip darkened toward black under the body, reaching its bottom, a whole number of pixels tall", () => {
    expect(lip).toMatchObject({
      kind: "roundRect",
      color: mixColors(0x000000, INK, 0.22),
      y: 2 + 4,
      height: 46 - 4,
    });
  });

  it("draws the body in the ink, short of the cell's bottom by the lip, its corners rounded", () => {
    expect(body).toEqual({
      kind: "roundRect",
      x: 2,
      y: 2,
      width: 46,
      height: 46 - 4,
      radius: 50 * 0.14,
      color: INK,
    });
  });

  it("lays a strip lightened toward white along the body's top, round its corners, a whole number of pixels deep", () => {
    expect({
      kind: strip?.kind,
      color: strip?.color,
      extent: strip && inBillionths(extentOf(strip)),
    }).toEqual({
      kind: "polygon",
      color: mixColors(0xffffff, INK, 0.22),
      extent: { x: 2, y: 2, width: 46, height: 7 + 3 },
    });
  });

  it("lays the strip as deep at its right end as at its left", () => {
    const points = strip?.kind === "polygon" ? strip.points : [];
    const deepest = (side: (x: number) => boolean) =>
      billionths(
        Math.max(...points.filter(({ x }) => side(x)).map(({ y }) => y)),
      );

    expect(deepest((x) => x > 25)).toBe(deepest((x) => x < 25));
  });
});

describe("tileCommands at 31 CSS pixels a unit", () => {
  const [lip, body, strip] = tileCommands(
    { x: 0, y: 0, width: 62, height: 62 },
    INK,
  );

  it("ends the body, and starts the lip, on a whole pixel", () => {
    expect([
      body?.kind === "roundRect" && body.y + body.height,
      lip?.kind === "roundRect" && lip.y,
    ]).toEqual([56, 6]);
  });

  it("lays the strip 3 pixels deep", () => {
    expect(strip && inBillionths(extentOf(strip)).height).toBe(
      billionths(62 * 0.14 + 3),
    );
  });
});

describe("PLAIN_ART", () => {
  const brick: KindLook = { tint: 5, hits: 1, full: 1, plates: 0 };

  it("shows a brick as the plain tile in its tint", () => {
    expect(PLAIN_ART.layersOf(brick)).toEqual(["tile-5"]);
  });

  it("gives a brick's shards its tint's ink", () => {
    expect(PLAIN_ART.colorOf(brick, ART_PALETTE)).toBe(ART_PALETTE.tints[5]);
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    "brings the tile in tint %i, its body in that tint's ink",
    (tint) => {
      const frame = frameNamed(ART_FRAMES, tileFrame(tint));

      expect(
        drawnIn(frame, "roundRect", ART_PALETTE.tints[tint]!),
      ).toHaveLength(1);
    },
  );
});
