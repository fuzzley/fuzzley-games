// A coil spring's lines, which a floor bounce's spring and a spring brick's
// coil are both drawn along, each in a style of its own: `coil()` in
// `docs/rickashay/art/make-art.mjs`.

import type { Point } from "@fz/phaser/shapes";

/** Describes a coil spring: where it stands, in device pixels, by its middle across, its top plate's and its foot's heights and half its width, and the turns of its zigzag between them. */
export interface Coil {
  readonly middle: number;
  readonly top: number;
  readonly foot: number;
  readonly half: number;
  readonly turns: number;
}

/** Describes a coil spring's lines, each through its points in turn. */
export interface CoilLines {
  /** Its top plate, across from left to right. */
  readonly top: readonly Point[];
  /** Its zigzag, from the middle of its top plate out to its right first, then to either side in turn, to the middle of its foot, its turns evenly spaced down. */
  readonly zigzag: readonly Point[];
  /** Its foot, across from left to right. */
  readonly foot: readonly Point[];
}

/** Returns a coil spring's lines. */
export function coilLines({ middle, top, foot, half, turns }: Coil): CoilLines {
  const step = (foot - top) / (turns + 1);
  const across = (y: number): readonly Point[] => [
    { x: middle - half, y },
    { x: middle + half, y },
  ];
  return {
    top: across(top),
    zigzag: [
      { x: middle, y: top },
      ...Array.from({ length: turns }, (_, turn) => ({
        x: middle + (turn % 2 === 0 ? half : -half),
        y: top + step * (turn + 1),
      })),
      { x: middle, y: foot },
    ],
    foot: across(foot),
  };
}
