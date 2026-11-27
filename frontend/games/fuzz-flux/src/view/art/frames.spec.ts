import {
  type ArtFrame,
  type DrawCommand,
  atlasSize,
  extentOf,
} from "@fz/phaser/shapes";
import { BRICK_LAYERS } from "../../rules/catalog/elements";
import {
  ART_PALETTE,
  ART_SCALE,
  SMALLEST_SCALE,
} from "../../testing/art_frames";
import { FRAMES, FRAME_NAMES } from "./frame_names";
import { atlasFrames, bakedScale } from "./frames";

/** The side of a page of the atlas's budget. */
const PAGE = 2048;

/** How many pages the atlas's budget gives it. */
const PAGES = 2;

/** The atlas at its largest, baked for a board of the largest squares, at a pixel ratio of 3. */
const LARGEST = bakedScale({ unit: 10_000, pixelRatio: 3 });

/** How far a drawing may stray past its frame and still pass, for a rounding. */
const SLACK = 1e-9;

/** Returns whether a shape lies within its frame, give or take a rounding. */
function drawsWithin(command: DrawCommand, frame: ArtFrame): boolean {
  const { x, y, width, height } = extentOf(command);
  return (
    x >= -SLACK &&
    y >= -SLACK &&
    x + width <= frame.width + SLACK &&
    y + height <= frame.height + SLACK
  );
}

/** Returns the names of the frames that break a rule. */
function breaking(
  frames: readonly ArtFrame[],
  keeps: (frame: ArtFrame) => boolean,
): readonly string[] {
  return frames.filter((frame) => !keeps(frame)).map(({ name }) => name);
}

describe("atlasFrames", () => {
  it("draws every frame FRAME_NAMES lists, each once, and no other", () => {
    const names = atlasFrames(ART_PALETTE, ART_SCALE).map(({ name }) => name);

    expect({
      once: new Set(names).size === names.length,
      names: new Set(names),
    }).toEqual({
      once: true,
      names: new Set(FRAME_NAMES),
    });
  });

  it("leaves the frames an element's own package draws empty until it does", () => {
    const empty = atlasFrames(ART_PALETTE, ART_SCALE)
      .filter(({ commands }) => commands.length === 0)
      .map(({ name }) => name);

    expect(empty).toEqual([
      FRAMES.sleepyhead,
      ...BRICK_LAYERS.map((layers) => FRAMES.brick(layers)),
      ...BRICK_LAYERS.map((layers) => FRAMES.cushion(layers)),
      ...BRICK_LAYERS.map((layers) => FRAMES.cushionTuft(layers)),
      FRAMES.button,
      FRAMES.cage,
      FRAMES.cageBar,
      FRAMES.gustLine,
    ]);
  });

  it(`fits the atlas at its largest, at a pixel ratio of 3, in the room of ${String(PAGES)} pages of ${String(PAGE)} × ${String(PAGE)}`, () => {
    const { width, height } = atlasSize(atlasFrames(ART_PALETTE, LARGEST));

    expect(width * height).toBeLessThanOrEqual(PAGES * PAGE * PAGE);
  });

  it.each([SMALLEST_SCALE, ART_SCALE, LARGEST])(
    "draws each frame within itself, at a square of $unit device pixels, $pixelRatio to a CSS pixel",
    (scale) => {
      expect(
        breaking(atlasFrames(ART_PALETTE, scale), (frame) =>
          frame.commands.every((command) => drawsWithin(command, frame)),
        ),
      ).toEqual([]);
    },
  );
});

describe("bakedScale", () => {
  it.each([
    [
      { unit: 80, pixelRatio: 2 },
      { unit: 80, pixelRatio: 2 },
    ],
    [
      { unit: 288, pixelRatio: 3 },
      { unit: 288, pixelRatio: 3 },
    ],
    [
      { unit: 420, pixelRatio: 3 },
      { unit: 288, pixelRatio: 3 },
    ],
    [
      { unit: 600, pixelRatio: 1 },
      { unit: 288, pixelRatio: 1 },
    ],
  ])(
    "bakes the atlas for a square of %o at %o, 96 CSS pixels at a pixel ratio of 3 at most",
    (square, baked) => {
      expect(bakedScale(square)).toEqual(baked);
    },
  );
});
