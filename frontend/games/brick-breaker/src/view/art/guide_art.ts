import { BRICK_SLAB, slabBody, slabRadius } from "@fz/phaser/bricks";
import {
  type ArtFrame,
  type ArtScale,
  circle,
  inset,
  outlineRoundRect,
  widthOf,
} from "@fz/phaser/shapes";
import { BRICK_HEIGHT, BRICK_WIDTH } from "../../rules/tuning";
import type { BricksPalette } from "../colors/palette";

/** The names of the frames the serve's guide shows, in the guide's ink. */
export const GUIDE_FRAMES = {
  /** A dot along the serve. */
  dot: "guide-dot",
  /** The outline round a brick the serve would meet, a brick's cell in size. */
  outline: "guide-outline",
} as const;

/** How wide a dot of the guide is, in field units. */
export const GUIDE_DOT = 0.25;

/**
 * How wide the guide's outline round a brick is, in field units: 2 CSS
 * pixels of a brick 40 CSS pixels wide, as the design's mocks draw it.
 */
export const GUIDE_OUTLINE = 0.1;

/**
 * Returns the guide's frames in a palette at a scale, in the guide's ink:
 * its dot, and its outline round a brick, a rounded rectangle a CSS pixel
 * wide at least, its outer edge half a CSS pixel inside the brick's slab, a
 * device pixel at least, so the brick's own edge still shows round it.
 */
export function guideFrames(
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const side = widthOf(GUIDE_DOT, scale);
  const cell = {
    x: 0,
    y: 0,
    width: BRICK_WIDTH * scale.unit,
    height: BRICK_HEIGHT * scale.unit,
  };
  const width = widthOf(GUIDE_OUTLINE, scale);
  const edge = Math.max(1, Math.round(scale.pixelRatio / 2)) + width / 2;
  return [
    {
      name: GUIDE_FRAMES.dot,
      width: side,
      height: side,
      commands: [
        circle({ x: side / 2, y: side / 2 }, side / 2, {
          color: palette.guide,
        }),
      ],
    },
    {
      name: GUIDE_FRAMES.outline,
      width: cell.width,
      height: cell.height,
      commands: [
        outlineRoundRect(
          inset(slabBody(cell, BRICK_SLAB), edge),
          Math.max(0, slabRadius(cell, BRICK_SLAB) - edge),
          { color: palette.guide, width },
        ),
      ],
    },
  ];
}
