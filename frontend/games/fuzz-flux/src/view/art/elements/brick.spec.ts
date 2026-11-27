import { itemAt } from "@fz/core/records";
import { type DrawCommand, extentOf } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  BRICK_LAYERS,
  type BrickLayers,
} from "../../../rules/catalog/elements";
import {
  ART_PALETTE,
  ART_SCALE,
  billionths,
} from "../../../testing/art_frames";
import { fluffFrames } from "../fluff";
import { FRAMES } from "../frame_names";
import { wellFrame } from "../well";
import { brickFrames } from "./brick";

/** A brick's frames in the specs' palette, at their scale, a design's unit a device pixel. */
const BRICK = brickFrames(ART_PALETTE, ART_SCALE);

/** The square's well, which a pile stands in. */
const WELL = extentOf(itemAt(wellFrame(ART_PALETTE, ART_SCALE).commands, 0));

/** How many shapes draw a cushion. */
const CUSHION_SHAPES = 9;

/** Returns the shapes of a pile of some layers. */
function pileOf(layers: BrickLayers): readonly DrawCommand[] {
  return frameNamed(BRICK, FRAMES.brick(layers)).commands;
}

/** Returns the pads of a pile of some layers, each cushion's whole pad in its underside's ink, from the bottom up. */
function padsOf(layers: BrickLayers): readonly DrawCommand[] {
  return pileOf(layers).filter(
    ({ kind, color }) =>
      kind === "polygon" &&
      Object.values(ART_PALETTE.cushionUndersides).includes(color),
  );
}

/** Returns what a shape is, where it lies aside: its kind, its color, its alpha and its size. */
function shapeOf(command: DrawCommand): object {
  const { width, height } = extentOf(command);
  return {
    kind: command.kind,
    color: command.color,
    alpha: command.alpha,
    width: billionths(width),
    height: billionths(height),
  };
}

describe("brickFrames", () => {
  it("draws a pile at each count of layers, the top cushion of each, a tuft of each cushion's felt, then the button", () => {
    expect(BRICK.map(({ name }) => name)).toEqual([
      ...BRICK_LAYERS.map((layers) => FRAMES.brick(layers)),
      ...BRICK_LAYERS.map((layers) => FRAMES.cushion(layers)),
      ...BRICK_LAYERS.map((layers) => FRAMES.cushionTuft(layers)),
      FRAMES.button,
    ]);
  });

  it.each(BRICK_LAYERS)(
    "piles %i cushions from the bottom up, each in its place's ink over its underside's",
    (layers) => {
      const pads = pileOf(layers)
        .filter(({ kind }) => kind === "polygon")
        .map(({ color }) => color);

      expect(pads).toEqual(
        BRICK_LAYERS.filter((place) => place <= layers).flatMap((place) => [
          ART_PALETTE.cushionUndersides[place],
          ART_PALETTE.cushions[place],
        ]),
      );
    },
  );

  it.each(BRICK_LAYERS)(
    "fills its square with a pile of %i, standing within its well",
    (layers) => {
      const pads = padsOf(layers).map(extentOf);
      const top = Math.min(...pads.map(({ y }) => y));
      const bottom = Math.max(...pads.map(({ y, height }) => y + height));
      const frame = frameNamed(BRICK, FRAMES.brick(layers));

      expect({
        fills: bottom - top >= 88,
        within: frame.width <= WELL.width && frame.height <= WELL.height,
      }).toEqual({ fills: true, within: true });
    },
  );

  it("draws a cushion thinner the more cushions share its pile", () => {
    const heights = BRICK_LAYERS.map(
      (layers) => extentOf(itemAt(padsOf(layers), 0)).height,
    );

    expect(
      heights
        .slice(1)
        .every((height, thicker) => height < itemAt(heights, thicker)),
    ).toBe(true);
  });

  it.each(BRICK_LAYERS)(
    "draws the cushion a hit knocks off a pile of %i as its top cushion, alone",
    (layers) => {
      const cushion = frameNamed(BRICK, FRAMES.cushion(layers)).commands;

      expect(cushion.map(shapeOf)).toEqual(
        pileOf(layers).slice(-CUSHION_SHAPES).map(shapeOf),
      );
    },
  );

  it.each(BRICK_LAYERS)(
    "draws a tuft of the felt of the cushion %i from the bottom as a kind's tuft, in that cushion's ink",
    (place) => {
      const kindTuft = frameNamed(
        fluffFrames(ART_PALETTE, ART_SCALE),
        FRAMES.tuft("blue"),
      ).commands;

      expect(frameNamed(BRICK, FRAMES.cushionTuft(place)).commands).toEqual(
        kindTuft.map((command) => ({
          ...command,
          color: ART_PALETTE.cushions[place],
        })),
      );
    },
  );

  it("draws the button the last cushion throws up as a disc in that cushion's underside's ink", () => {
    const [button, ...rest] = frameNamed(BRICK, FRAMES.button).commands;

    expect({ kind: button?.kind, color: button?.color, rest }).toEqual({
      kind: "circle",
      color: ART_PALETTE.cushionUndersides[1],
      rest: [],
    });
  });
});
