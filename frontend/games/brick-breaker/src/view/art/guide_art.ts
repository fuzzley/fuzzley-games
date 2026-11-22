import { BRICK_SLAB, slabBody, slabRadius } from "@fz/phaser/bricks";
import {
  type ArtFrame,
  type ArtScale,
  circle,
  inset,
  lineWidth,
  outlineRoundRect,
  widthOf,
} from "@fz/phaser/shapes";
import { BRICK_HEIGHT, BRICK_WIDTH } from "../../rules/tuning";
import type { BricksPalette } from "../colors/palette";

/** The names of the frames the serve's guide shows. */
export const GUIDE_FRAMES = {
  /** A dot along the serve. */
  dot: "guide-dot",
  /** The outline round a brick the serve would meet, a brick's cell in size, ringed in the outline's color. */
  outline: "guide-outline",
} as const;

/** How wide a dot of the guide is, in field units. */
export const GUIDE_DOT = 0.25;

/**
 * How wide the guide's outline round a brick is, its ink without the ring
 * each side, in field units: 2 CSS pixels of a brick 40 CSS pixels wide,
 * as the design's mocks draw it.
 */
export const GUIDE_OUTLINE = 0.1;

/**
 * Returns the guide's frames in a palette at a scale: its dot, in the
 * guide's ink, and its outline round a brick, a rounded rectangle in the
 * ink a CSS pixel wide at least, ringed each side by a line in the
 * palette's outline, as a ball is, so it stands out from any brick, as the
 * ink alone can't. The ring's outer edge lies half a CSS pixel inside the
 * brick's slab, a device pixel at least, so the brick's own edge still
 * shows round it.
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
  const ringed = width + 2 * lineWidth(scale);
  const edge = Math.max(1, Math.round(scale.pixelRatio / 2)) + ringed / 2;
  const path = inset(slabBody(cell, BRICK_SLAB), edge);
  const radius = Math.max(0, slabRadius(cell, BRICK_SLAB) - edge);
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
        outlineRoundRect(path, radius, {
          color: palette.outline,
          width: ringed,
        }),
        outlineRoundRect(path, radius, { color: palette.guide, width }),
      ],
    },
  ];
}
