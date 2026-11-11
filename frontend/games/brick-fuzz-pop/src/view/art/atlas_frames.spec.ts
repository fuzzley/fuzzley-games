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
  reachPastRoundRect,
} from "../../testing/art_frames";
import { BRICK_ART, type KindArt } from "./art";
import { atlasFrames } from "./atlas_frames";
import {
  CHARGES,
  FRAMES,
  FRAME_NAMES,
  INKS,
  PLATED_HITS,
  PLATINGS,
} from "./frames";
import { fuzzballFrames } from "./fuzzball_art";
import { tileBody, tileRadius } from "./kinds/brick";
import { BUMPER_ART } from "./kinds/bumper";
import { PLATED_ART } from "./kinds/plated";
import { PORTAL_ART } from "./kinds/portal";
import { PRISM_ART } from "./kinds/prism";
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

/**
 * The art of kinds the catalog doesn't have yet, by the id each will take,
 * which the atlas holds once `BRICK_ART` takes it up with its kind: held to
 * the atlas's rules meanwhile, and passed over once it is taken up.
 */
const WAITING_ART: Readonly<Record<string, KindArt>> = {
  bumper: BUMPER_ART,
  prism: PRISM_ART,
  portal: PORTAL_ART,
  plated: PLATED_ART,
};

/** The zappers' frames, on a tile of their own, which reach past the chunky tile's rounded square. */
const ZAPPER_FRAMES: ReadonlySet<string> = new Set(
  (["row", "column", "cross", "x"] as const).map((pattern) =>
    FRAMES.zapper(pattern),
  ),
);

/** The plated bricks' frames, whose plates' steel stands out of the chunky tile's rounded square. */
const PLATED_FRAMES: ReadonlySet<string> = new Set(
  PLATINGS.flatMap((plating) =>
    PLATED_HITS.map((hits) => FRAMES.plated(plating, hits)),
  ),
);

/** Returns whether a command of a frame may reach past the chunky tile's rounded square: a zapper's, or a plated brick's steel. */
function mayReachPast(frame: ArtFrame, command: DrawCommand): boolean {
  return (
    ZAPPER_FRAMES.has(frame.name) ||
    (PLATED_FRAMES.has(frame.name) &&
      command.color === ART_PALETTE.kinds.plated.glyph)
  );
}

/** Returns every frame the atlas holds at a scale, and those of the art waiting for its kinds. */
function everyFrame(scale: ArtScale): readonly ArtFrame[] {
  return [
    ...atlasFrames(ART_PALETTE, scale),
    ...Object.entries(WAITING_ART)
      .filter(([kind]) => !(kind in BRICK_ART))
      .flatMap(([, art]) => art.frames(ART_PALETTE, scale)),
  ];
}

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
  "atlasFrames, and the art waiting for its kinds, at a unit of $unit device pixels, $pixelRatio to a CSS pixel",
  (scale) => {
    const frames = everyFrame(scale);
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

    it("draws every brick's frame within the chunky tile's rounded square, so no mark shows past it, but the zappers' and the plated bricks' steel", () => {
      const cell = cellOf(scale);
      const body = tileBody(cell);
      const radius = tileRadius(cell);

      expect(
        breaking(
          frames.filter(({ name }) => !fuzzballs.has(name)),
          (frame) =>
            frame.commands.every(
              (command) =>
                mayReachPast(frame, command) ||
                reachPastRoundRect(command, body, radius) <= SLACK,
            ),
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

  it("names every frame once, each a frame's name, the art waiting for its kinds among them", () => {
    const names = everyFrame(ART_SCALE).map((frame) => frame.name);
    const known = new Set<string>(FRAME_NAMES);

    expect({
      once: new Set(names).size === names.length,
      unnamed: names.filter((name) => !known.has(name)),
    }).toEqual({ once: true, unnamed: [] });
  });

  it("holds the bricks' frames, 8 tiles, 5 pips, 5 cracks, the steel, 2 zappers, the bomb, 2 zappers more, wool, the cage's 8 insides and 2 looks, the shell's body and 2 pips, and the moss's cap and 2 pips, then the fuzzballs'", () => {
    expect(frames.map((frame) => frame.name)).toEqual([
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((ink) => `tile-${String(ink)}`),
      ...[2, 3, 4, 5, 6].map((pips) => `pips-${String(pips)}`),
      ...[1, 2, 3, 4, 5].map((cracks) => `cracks-${String(cracks)}`),
      "steel",
      "zapper-row",
      "zapper-column",
      "bomb",
      "zapper-cross",
      "zapper-x",
      "wool",
      ...INKS.map((ink) => `caged-${String(ink)}`),
      "cage-whole",
      "cage-hit",
      "shell-body",
      "shell-2",
      "shell-3",
      "moss-cap",
      "moss-2",
      "moss-3",
      ...CHARGES.map((charge) => `fuzzball-${String(charge)}`),
      "hot-shot",
      ...INKS.map((ink) => `friend-${String(ink)}`),
      "fuzzball-eyes",
    ]);
  });

  it("leaves out only the cracks, the steel's rivets, the bomb's dots, the cage's crack, and the plates' rivets and half their teeth, at 29 CSS pixels a unit, where 31 shows them, the art waiting for its kinds among them", () => {
    const small = everyFrame({ unit: 58, pixelRatio: 2 });

    const fewer = everyFrame(ART_SCALE)
      .filter(
        (frame, i) => frame.commands.length > (small[i]?.commands.length ?? 0),
      )
      .map((frame) => frame.name);

    expect(fewer).toEqual([
      ...[1, 2, 3, 4, 5].map((cracks) => cracksFrame(cracks)),
      FRAMES.steel,
      FRAMES.bomb,
      FRAMES.cage("hit"),
      ...PLATINGS.flatMap((plating) =>
        PLATED_HITS.map((hits) => FRAMES.plated(plating, hits)),
      ),
    ]);
  });
});

describe.each(PIXEL_RATIOS)(
  "atlasFrames, and the art waiting for its kinds, at every unit from 1 to 16 device pixels, %f to a CSS pixel",
  (pixelRatio) => {
    const scales = Array.from({ length: 16 }, (_, i) => ({
      unit: i + 1,
      pixelRatio,
    }));

    it("draws nothing at a size below nothing", () => {
      const negative = scales.flatMap((scale) =>
        breaking(everyFrame(scale), (frame) =>
          frame.commands.every((command) =>
            sizesIn(command).every((size) => size >= 0),
          ),
        ).map((name) => `${name} at ${String(scale.unit)}`),
      );

      expect(negative).toEqual([]);
    });

    it("draws every polygon through three points or more, so it has a point for a Graphics to start from and encloses something", () => {
      const thin = scales.flatMap((scale) =>
        breaking(everyFrame(scale), (frame) =>
          frame.commands.every(
            (command) =>
              command.kind !== "polygon" || command.points.length >= 3,
          ),
        ).map((name) => `${name} at ${String(scale.unit)}`),
      );

      expect(thin).toEqual([]);
    });

    it("packs into an atlas", () => {
      const packs = scales.map((scale) => atlasSize(everyFrame(scale)));

      expect(packs.every(({ width, height }) => width > 0 && height > 0)).toBe(
        true,
      );
    });
  },
);
