import { inkAt } from "@fz/brick-wall/view/inks";
import { mixColors } from "@fz/phaser/color";
import type { DrawCommand } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  octagon,
  pointInBillionths,
} from "../../../testing/art_frames";
import { INKS } from "../frames";
import { PLAIN_ART, tileCommands } from "./brick";

const INK = 0x3366cc;

/** A cell of 100 device pixels, the box the art draws a tile in, so the tile's numbers are the art's. */
const ART_BOX = { x: 0, y: 0, width: 100, height: 100 };

/** A cell at 31 CSS pixels a unit, 2 device pixels to one. */
const CELL = { x: 0, y: 0, width: 62, height: 62 };

/** Returns a command's color, and its points to a billionth where it is a polygon. */
function shapeOf(command: DrawCommand | undefined): object {
  return command?.kind === "polygon"
    ? {
        color: command.color,
        points: command.points.map(pointInBillionths),
      }
    : { kind: command?.kind };
}

describe("tileCommands in the art's box of 100 device pixels", () => {
  const [lip, body, strip] = tileCommands(ART_BOX, INK);

  it("draws the body in the ink, 4 in from the cell and short of its foot by the lip, each corner cut 11 along each side, as the art's cut tile does", () => {
    expect(shapeOf(body)).toEqual({
      color: INK,
      points: octagon({ x: 4, y: 4 }, { x: 96, y: 89 }, 11),
    });
  });

  it("lays a lip darkened toward black under it, the body moved 7 down to the gap above the cell's foot", () => {
    expect(shapeOf(lip)).toEqual({
      color: mixColors(0x000000, INK, 0.22),
      points: octagon({ x: 4, y: 11 }, { x: 96, y: 96 }, 11),
    });
  });

  it("lays a strip lightened toward white along its top and down the cuts across its top corners, 5 deep", () => {
    expect(shapeOf(strip)).toEqual({
      color: mixColors(0xffffff, INK, 0.22),
      points: [
        { x: 4, y: 15 },
        { x: 15, y: 4 },
        { x: 85, y: 4 },
        { x: 96, y: 15 },
        { x: 96, y: 20 },
        { x: 85, y: 9 },
        { x: 15, y: 9 },
        { x: 4, y: 20 },
      ],
    });
  });
});

describe("tileCommands at 31 CSS pixels a unit", () => {
  const [lip, body, strip] = tileCommands(CELL, INK);

  it("keeps the body 2 pixels in from the cell and ends it on a whole pixel, each corner cut 0.11 of the cell along each side", () => {
    expect(shapeOf(body)).toEqual({
      color: INK,
      points: octagon({ x: 2, y: 2 }, { x: 60, y: 56 }, 6.82),
    });
  });

  it("lays the lip 4 pixels deep, from a whole pixel to the gap above the cell's foot", () => {
    expect(shapeOf(lip)).toEqual({
      color: mixColors(0x000000, INK, 0.22),
      points: octagon({ x: 2, y: 6 }, { x: 60, y: 60 }, 6.82),
    });
  });

  it("lays the strip 3 pixels deep, its lower edge on a whole pixel", () => {
    expect(shapeOf(strip)).toEqual({
      color: mixColors(0xffffff, INK, 0.22),
      points: [
        { x: 2, y: 8.82 },
        { x: 8.82, y: 2 },
        { x: 53.18, y: 2 },
        { x: 60, y: 8.82 },
        { x: 60, y: 11.82 },
        { x: 53.18, y: 5 },
        { x: 8.82, y: 5 },
        { x: 2, y: 11.82 },
      ],
    });
  });
});

describe("PLAIN_ART", () => {
  const frames = PLAIN_ART.frames(ART_PALETTE, ART_SCALE);

  it("shows a brick as the plain tile in its tint", () => {
    expect(
      PLAIN_ART.layersOf({ tint: 5, hits: 1, full: 1, plates: 0 }),
    ).toEqual(["tile-5"]);
  });

  it("finds a brick's layers without making them", () => {
    const brick = { tint: 2, hits: 1, full: 1, plates: 0 };

    expect(PLAIN_ART.layersOf(brick)).toBe(PLAIN_ART.layersOf(brick));
  });

  it.each([-1, 8])("refuses a brick of tint %i, which no tile has", (tint) => {
    expect(() =>
      PLAIN_ART.layersOf({ tint, hits: 1, full: 1, plates: 0 }),
    ).toThrow(RangeError);
  });

  it("brings the tile in each of the 8 inks, each a cell", () => {
    expect(
      frames.map(({ name, width, height }) => [name, width, height]),
    ).toEqual(INKS.map((ink) => [`tile-${String(ink)}`, 62, 62]));
  });

  it.each(INKS)("draws frame tile-%i as the tile in its ink", (ink) => {
    const frame = frameNamed(frames, `tile-${String(ink)}`);

    expect(frame.commands).toEqual(
      tileCommands(CELL, inkAt(ART_PALETTE.tints, ink)),
    );
  });
});
