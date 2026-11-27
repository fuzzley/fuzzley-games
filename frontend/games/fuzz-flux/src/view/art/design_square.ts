// The square the design draws its art on, 100 units across, a fuzzball's
// body a disc 58 of them across about its middle; where a point lies on it
// by its angle and distance from a middle, as the design lays out its fur;
// and what turns a drawing on it into a frame's device pixels. Every frame
// is drawn on it, so the art keeps the design's proportions at every size a
// square takes.

import {
  type ArtScale,
  type DrawCommand,
  type Point,
  scaledBy,
} from "@fz/phaser/shapes";

/** How many units across the design draws a square. */
export const SQUARE = 100;

/** A fuzzball's body's radius, in the design's units: a disc 58% of its square across. */
export const BODY = 29;

/** Returns the point at an angle, in radians clockwise from the right, and a distance from the middle. */
export function polar(angle: number, radius: number): Point {
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

/** Returns a drawing on the design's square in device pixels, at a scale whose unit is a square. */
export function inPixels(
  commands: readonly DrawCommand[],
  scale: ArtScale,
): readonly DrawCommand[] {
  const by = scale.unit / SQUARE;
  return commands.map((command) => scaledBy(command, by));
}

/** Returns a width in the design's units, or a CSS pixel's whole device pixels where it would draw less at a scale. */
export function atLeastAPixel(units: number, scale: ArtScale): number {
  return Math.max(units, (Math.ceil(scale.pixelRatio) * SQUARE) / scale.unit);
}
