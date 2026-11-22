import { BRICK_SLAB, slabBody } from "@fz/phaser/bricks";
import {
  type Area,
  extentOf,
  inset,
  outlineRoundRect,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import { BRICK_HEIGHT, BRICK_WIDTH } from "../../rules/tuning";
import { ART_FRAMES, ART_PALETTE, ART_SCALE } from "../../testing/art_frames";
import { GUIDE_DOT, GUIDE_FRAMES, guideFrames } from "./guide_art";

/** Returns where the outline round a brick, its ring, reaches at a number of device pixels to a CSS pixel. */
function outlineAt(pixelRatio: number): Area {
  const scale = { unit: 20 * pixelRatio, pixelRatio };
  const outline = frameNamed(
    guideFrames(ART_PALETTE, scale),
    GUIDE_FRAMES.outline,
  );
  const [drawn] = drawnIn(outline, "polygon", ART_PALETTE.outline);
  if (drawn === undefined) throw new Error("No outline drawn");
  return extentOf(drawn);
}

/** Returns a brick's slab at a number of device pixels to a CSS pixel. */
function slabAt(pixelRatio: number): Area {
  const unit = 20 * pixelRatio;
  return slabBody(
    { x: 0, y: 0, width: BRICK_WIDTH * unit, height: BRICK_HEIGHT * unit },
    BRICK_SLAB,
  );
}

describe("the guide's frames", () => {
  it("draw the guide's dot in the atlas, in the guide's ink, a quarter of a unit wide", () => {
    const dot = frameNamed(ART_FRAMES, GUIDE_FRAMES.dot);

    const [disc] = drawnIn(dot, "circle", ART_PALETTE.guide);

    expect(disc && extentOf(disc).width).toBeCloseTo(
      GUIDE_DOT * ART_SCALE.unit,
    );
  });

  it("draw the outline round a brick in the atlas, a brick's cell in size, in the guide's ink over a ring in the outline's color", () => {
    const outline = frameNamed(ART_FRAMES, GUIDE_FRAMES.outline);

    expect({
      width: outline.width,
      height: outline.height,
      ring: drawnIn(outline, "polygon", ART_PALETTE.outline).length,
      ink: drawnIn(outline, "polygon", ART_PALETTE.guide).length,
    }).toEqual({
      width: BRICK_WIDTH * ART_SCALE.unit,
      height: BRICK_HEIGHT * ART_SCALE.unit,
      ring: 1,
      ink: 1,
    });
  });

  it("draw the outline's ink 4 device pixels wide at a unit of 40, 2 to a CSS pixel, ringed 2 each side, its middle 5 in from the slab, round corners that follow the slab's", () => {
    const outline = frameNamed(ART_FRAMES, GUIDE_FRAMES.outline);

    // The slab lies 2 in from the cell, 76 by 36, its corners 6.4 round.
    const path = { x: 7, y: 7, width: 66, height: 26 };
    expect(outline.commands).toEqual([
      outlineRoundRect(path, 6.4 - 5, {
        color: ART_PALETTE.outline,
        width: 8,
      }),
      outlineRoundRect(path, 6.4 - 5, { color: ART_PALETTE.guide, width: 4 }),
    ]);
  });

  it.each([
    { pixelRatio: 1, by: 1 },
    { pixelRatio: 2, by: 1 },
    { pixelRatio: 3, by: 2 },
  ])(
    "lay the outline's outer edge $by device pixels inside the brick's slab, $pixelRatio to a CSS pixel",
    ({ pixelRatio, by }) => {
      const reach = outlineAt(pixelRatio);

      const wanted = inset(slabAt(pixelRatio), by);
      expect(reach.x).toBeCloseTo(wanted.x);
      expect(reach.y).toBeCloseTo(wanted.y);
      expect(reach.width).toBeCloseTo(wanted.width);
      expect(reach.height).toBeCloseTo(wanted.height);
    },
  );
});
