import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  atlasSize,
  extentOf,
} from "@fz/phaser/shapes";
import {
  ART_FRAMES,
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
} from "../../testing/art_frames";
import { atlasFrames } from "./atlas_frames";
import { CHARGES, FRAMES, FRAME_NAMES, INKS } from "./frames";
import { fuzzballFrames } from "./fuzzball_art";
import { cracksFrame } from "./kinds/tough";
import { cellOf } from "./symbols";

/** The largest atlas every device takes, a side. */
const ATLAS_SIDE = 2048;

/** How far a drawing may stray past its cell and still pass, for a rounding. */
const SLACK = 1e-9;

/**
 * The scales the field is drawn at: the layout check's least unit, 24 CSS
 * pixels, at each pixel ratio; either side of the detail rule, 29 and 31;
 * and the most the atlas is baked at, 128 device pixels, at the least pixel
 * ratio and the most.
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

    it("draws every frame within its cell", () => {
      expect(
        breaking(frames, (frame) =>
          frame.commands.every((command) => drawsWithin(command, frame)),
        ),
      ).toEqual([]);
    });

    it("sizes every brick's frame as a cell, in whole pixels", () => {
      const { width, height } = cellOf(scale);

      expect(
        breaking(
          frames.filter(({ name }) => !fuzzballs.has(name)),
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

    it("draws every line a CSS pixel wide or more", () => {
      expect(
        breaking(frames, (frame) =>
          frame.commands.every((command) => {
            const width = lineOf(command);
            return width === null || width >= scale.pixelRatio;
          }),
        ),
      ).toEqual([]);
    });

    it("fits the atlas in 2048 × 2048", () => {
      const { width, height } = atlasSize(frames);

      expect(Math.max(width, height)).toBeLessThanOrEqual(ATLAS_SIDE);
    });
  },
);

describe("atlasFrames", () => {
  const frames = ART_FRAMES;

  it("names every frame once, each a frame's name", () => {
    const names = frames.map((frame) => frame.name);
    const known = new Set<string>(FRAME_NAMES);

    expect({
      once: new Set(names).size === names.length,
      unnamed: names.filter((name) => !known.has(name)),
    }).toEqual({ once: true, unnamed: [] });
  });

  it("holds the bricks' frames, 8 tiles, 5 pips, 5 cracks, the steel and 2 zappers, then the fuzzballs'", () => {
    expect(frames.map((frame) => frame.name)).toEqual([
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((ink) => `tile-${String(ink)}`),
      ...[2, 3, 4, 5, 6].map((pips) => `pips-${String(pips)}`),
      ...[1, 2, 3, 4, 5].map((cracks) => `cracks-${String(cracks)}`),
      "steel",
      "zapper-row",
      "zapper-column",
      ...CHARGES.map((charge) => `fuzzball-${String(charge)}`),
      "hot-shot",
      ...INKS.map((ink) => `friend-${String(ink)}`),
      "fuzzball-eyes",
    ]);
  });

  it("leaves out only the cracks and the steel's rivets at 29 CSS pixels a unit, where 31 shows them", () => {
    const small = atlasFrames(ART_PALETTE, { unit: 58, pixelRatio: 2 });

    const fewer = frames
      .filter(
        (frame, i) => frame.commands.length > (small[i]?.commands.length ?? 0),
      )
      .map((frame) => frame.name);

    expect(fewer).toEqual([
      ...[1, 2, 3, 4, 5].map((cracks) => cracksFrame(cracks)),
      FRAMES.steel,
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
