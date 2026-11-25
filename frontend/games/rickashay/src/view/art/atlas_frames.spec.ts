import { bodyOutline } from "@fz/phaser/bricks";
import {
  type Area,
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  atlasSize,
  extentOf,
} from "@fz/phaser/shapes";
import {
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  pastOutline,
} from "../../testing/art_frames";
import { atlasFrames, brickLayers, wallAtlasFrames } from "./atlas_frames";
import { cellOf } from "./cells";
import {
  CRACKS,
  FRAMES,
  FRAME_NAMES,
  FURS,
  HATCH_HOLDS,
  INKS,
  PIPS,
  PORTAL_MARKS,
  RAMP_CORNERS,
} from "./frames";
import { fuzzballFrames } from "./fuzzball_art";
import { CUT_TILE, tileBody } from "./kinds/brick";
import { HATCH_ART } from "./kinds/hatch";

/** The largest atlas every device takes, a side. */
const ATLAS_SIDE = 2048;

/** How far a drawing may stray past its cell and still pass, for a rounding. */
const SLACK = 1e-9;

/** The frames the atlas holds in the specs' palette, at their scale. */
const ART_FRAMES = atlasFrames(ART_PALETTE, ART_SCALE);

/**
 * The scales the field is drawn at: the layout check's least unit, 24 CSS
 * pixels, at each pixel ratio; either side of the detail rule, 29 and 31;
 * and the most the atlas is baked at, 128 device pixels, at the least
 * pixel ratio and the most.
 */
const ART_SCALES: readonly ArtScale[] = [
  ...PIXEL_RATIOS.map((pixelRatio) => ({ unit: 24 * pixelRatio, pixelRatio })),
  { unit: 58, pixelRatio: 2 },
  ART_SCALE,
  { unit: 128, pixelRatio: 1 },
  { unit: 128, pixelRatio: 3 },
];

/** Returns whether a command draws within its frame, give or take a rounding. */
function drawsWithin(command: DrawCommand, frame: ArtFrame): boolean {
  const { x, y, width, height } = extentOf(command);
  return (
    x >= -SLACK &&
    y >= -SLACK &&
    x + width <= frame.width + SLACK &&
    y + height <= frame.height + SLACK
  );
}

/** Returns the corners of an area a command covers. */
function cornersOf(command: DrawCommand): readonly Point[] {
  const { x, y, width, height } = extentOf(command);
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

/** Returns the outline of an area, its corners clockwise from its top left. */
function outlineOf({ x, y, width, height }: Area): readonly Point[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

/**
 * Returns how far a command reaches past a convex outline, at most: a
 * polygon's furthest point, a circle's middle and its radius, a ring's
 * middle and its radius and half its width, a line's furthest end and half
 * its width, and else the furthest corner of what it covers.
 */
function reachPast(command: DrawCommand, outline: readonly Point[]): number {
  const past = (points: readonly Point[], by = 0): number =>
    Math.max(...points.map((point) => pastOutline(point, outline) + by));
  switch (command.kind) {
    case "polygon":
      return past(command.points);
    case "circle":
      return past([command], command.radius);
    case "ring":
      return past([command], command.radius + command.width / 2);
    case "line":
      return past([command.from, command.to], command.width / 2);
    default:
      return past(cornersOf(command));
  }
}

/** Returns how wide a command's line is, or null for one that fills. */
function lineOf(command: DrawCommand): number | null {
  return command.kind === "line" ||
    command.kind === "polyline" ||
    command.kind === "ring"
    ? command.width
    : null;
}

/** Returns the sizes a command draws at: its width, height and radius, those it has. */
function sizesIn(command: DrawCommand): readonly number[] {
  return [
    "width" in command ? command.width : 0,
    "height" in command ? command.height : 0,
    "radius" in command ? command.radius : 0,
  ];
}

/** Returns the names of the frames that break a rule. */
function breaking(
  frames: readonly ArtFrame[],
  rule: (frame: ArtFrame) => boolean,
): readonly string[] {
  return frames.filter((frame) => !rule(frame)).map((frame) => frame.name);
}

describe.each(ART_SCALES)(
  "atlasFrames at a unit of $unit device pixels, $pixelRatio to a CSS pixel",
  (scale) => {
    const frames = atlasFrames(ART_PALETTE, scale);
    const fuzzballs = new Set(
      fuzzballFrames(ART_PALETTE, scale).map(({ name }) => name),
    );
    const hatches = new Set(
      HATCH_ART.frames(ART_PALETTE, scale).map(({ name }) => name),
    );
    const bricks = frames.filter(({ name }) => !fuzzballs.has(name));
    const ramps = new Set<string>(RAMP_CORNERS.map(FRAMES.ramp));
    // A hatch has no tile, and its bar runs the width of its cell, so
    // hatches side by side draw one bar, as the flight meets them: its
    // frames are held to their cell alone.
    const tiled = bricks.filter(({ name }) => !hatches.has(name));

    it("draws every frame within its cell", () => {
      expect(
        breaking(frames, (frame) =>
          frame.commands.every((command) => drawsWithin(command, frame)),
        ),
      ).toEqual([]);
    });

    // A ramp stands on no tile, so its points reach the square corners of
    // the body a tile's corners are cut from.
    it("draws every brick's frame but a hatch's within the cut tile's body, a ramp's within its square body, so no mark shows past it", () => {
      const cut = bodyOutline(cellOf(scale), CUT_TILE);
      const square = outlineOf(tileBody(cellOf(scale)));

      expect(
        breaking(tiled, (frame) =>
          frame.commands.every(
            (command) =>
              reachPast(command, ramps.has(frame.name) ? square : cut) <= SLACK,
          ),
        ),
      ).toEqual([]);
    });

    it("sizes every brick's frame as a cell, in whole pixels", () => {
      const { width, height } = cellOf(scale);

      expect(
        breaking(
          bricks,
          (frame) =>
            frame.width === width &&
            frame.height === height &&
            Number.isInteger(width) &&
            width >= 1,
        ),
      ).toEqual([]);
    });

    it("sizes every fuzzball's frame in whole pixels, even ones, so its middle is a pixel's corner", () => {
      expect(
        breaking(
          frames.filter(({ name }) => fuzzballs.has(name)),
          (frame) =>
            [frame.width, frame.height].every(
              (side) => Number.isInteger(side / 2) && side >= 2,
            ),
        ),
      ).toEqual([]);
    });

    // The fuzzball's yawn is left out: `@fz/phaser/fuzzball` draws its
    // lids a device pixel wide at least, which is under a CSS pixel but at
    // the most the atlas is baked at.
    it("draws every line a CSS pixel wide or more, but the yawn's", () => {
      expect(
        breaking(
          frames.filter(({ name }) => name !== FRAMES.yawn),
          (frame) =>
            frame.commands.every((command) => {
              const width = lineOf(command);
              return width === null || width >= scale.pixelRatio;
            }),
        ),
      ).toEqual([]);
    });

    it(`fits the atlas in ${String(ATLAS_SIDE)} × ${String(ATLAS_SIDE)}`, () => {
      const { width, height } = atlasSize(frames);

      expect(Math.max(width, height)).toBeLessThanOrEqual(ATLAS_SIDE);
    });
  },
);

describe.each(ART_SCALES)(
  "wallAtlasFrames at a unit of $unit device pixels, $pixelRatio to a CSS pixel",
  (scale) => {
    const frames = wallAtlasFrames(ART_PALETTE, scale);
    const art = new Set(
      atlasFrames(ART_PALETTE, scale).map(({ name }) => name),
    );
    // The field's own frames, beside the art's, which its own cases hold.
    const added = frames.filter(({ name }) => !art.has(name));

    it("names every frame once", () => {
      const names = frames.map((frame) => frame.name);

      expect(new Set(names).size).toBe(names.length);
    });

    it("draws each of the field's own frames within itself", () => {
      expect(
        breaking(added, (frame) =>
          frame.commands.every((command) => drawsWithin(command, frame)),
        ),
      ).toEqual([]);
    });

    it("draws each of the field's own frames' lines a CSS pixel wide or more", () => {
      expect(
        breaking(added, (frame) =>
          frame.commands.every((command) => {
            const width = lineOf(command);
            return width === null || width >= scale.pixelRatio;
          }),
        ),
      ).toEqual([]);
    });

    it(`fits the atlas in ${String(ATLAS_SIDE)} × ${String(ATLAS_SIDE)}`, () => {
      const { width, height } = atlasSize(frames);

      expect(Math.max(width, height)).toBeLessThanOrEqual(ATLAS_SIDE);
    });
  },
);

describe("atlasFrames", () => {
  it("names every frame once, each a frame's name", () => {
    const names = ART_FRAMES.map((frame) => frame.name);
    const known = new Set<string>(FRAME_NAMES);

    expect({
      once: new Set(names).size === names.length,
      unnamed: names.filter((name) => !known.has(name)),
    }).toEqual({ once: true, unnamed: [] });
  });

  it("holds the bricks' frames in the catalog's order, 8 tiles, 5 pips, 5 cracks, the steel, 4 ramps, a hatch's 3 bars and its open one, the spring brick's coil, 8 gems and 2 portals, then the fuzzball's", () => {
    expect(ART_FRAMES.map((frame) => frame.name)).toEqual([
      ...INKS.map(FRAMES.tile),
      ...PIPS.map(FRAMES.pips),
      ...CRACKS.map(FRAMES.cracks),
      FRAMES.steel,
      ...RAMP_CORNERS.map(FRAMES.ramp),
      ...HATCH_HOLDS.map(FRAMES.hatch),
      FRAMES.hatchOpen,
      FRAMES.spring,
      ...INKS.map(FRAMES.gem),
      ...PORTAL_MARKS.map(FRAMES.portal),
      ...FURS.map(FRAMES.fuzzball),
      FRAMES.hotShot,
      FRAMES.eyes,
      FRAMES.yawn,
    ]);
  });

  it("leaves out only the cracks and the steel's and the ramps' rivets at 29 CSS pixels a unit, where 31 shows them", () => {
    const small = atlasFrames(ART_PALETTE, { unit: 58, pixelRatio: 2 });

    const fewer = ART_FRAMES.filter(
      (frame, i) => frame.commands.length > (small[i]?.commands.length ?? 0),
    ).map((frame) => frame.name);

    expect(fewer).toEqual([
      ...CRACKS.map(FRAMES.cracks),
      FRAMES.steel,
      ...RAMP_CORNERS.map(FRAMES.ramp),
    ]);
  });
});

describe.each(PIXEL_RATIOS)(
  "atlasFrames at every unit from 1 to 16 device pixels, %f to a CSS pixel",
  (pixelRatio) => {
    const scales = Array.from({ length: 16 }, (_, i) => ({
      unit: i + 1,
      pixelRatio,
    }));

    it("draws nothing at a size below nothing", () => {
      const negative = scales.flatMap((scale) =>
        breaking(atlasFrames(ART_PALETTE, scale), (frame) =>
          frame.commands.every((command) =>
            sizesIn(command).every((size) => size >= 0),
          ),
        ).map((name) => `${name} at ${String(scale.unit)}`),
      );

      expect(negative).toEqual([]);
    });

    it("draws every polygon through three points or more, so it has a point for a Graphics to start from and encloses something", () => {
      const thin = scales.flatMap((scale) =>
        breaking(atlasFrames(ART_PALETTE, scale), (frame) =>
          frame.commands.every(
            (command) =>
              command.kind !== "polygon" || command.points.length >= 3,
          ),
        ).map((name) => `${name} at ${String(scale.unit)}`),
      );

      expect(thin).toEqual([]);
    });

    it("packs into an atlas", () => {
      const packs = scales.map((scale) =>
        atlasSize(atlasFrames(ART_PALETTE, scale)),
      );

      expect(packs.every(({ width, height }) => width > 0 && height > 0)).toBe(
        true,
      );
    });
  },
);

describe("brickLayers", () => {
  it("shows a brick its kind's art draws in that art's frames, a plain brick's tile in its tint", () => {
    expect(
      brickLayers({ kind: "brick", tint: 3, hits: 1, full: 1, plates: 0 }),
    ).toEqual([FRAMES.tile(3)]);
  });

  it("shows a tough brick's tile, its pips for the hits left and its cracks for those taken", () => {
    expect(
      brickLayers({ kind: "tough", tint: 0, hits: 2, full: 3, plates: 0 }),
    ).toEqual([FRAMES.tile(0), FRAMES.pips(2), FRAMES.cracks(1)]);
  });

  it("shows nothing for a brick whose kind's art isn't drawn yet", () => {
    expect(
      brickLayers({ kind: "lock", tint: 1, hits: 1, full: 1, plates: 0 }),
    ).toEqual([]);
  });
});
