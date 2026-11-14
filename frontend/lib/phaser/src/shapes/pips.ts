// The pips a brick shows the hits it has left with: a die's face of them, or
// a row.

import {
  type CircleCommand,
  type FillStyle,
  type Point,
  circle,
} from "./shapes";

/** Where a die's pips sit for each count of them from 1, in steps from its middle, across and down. */
const DIE: readonly (readonly (readonly [number, number])[])[] = [
  [[0, 0]],
  [
    [1, -1],
    [-1, 1],
  ],
  [
    [1, -1],
    [0, 0],
    [-1, 1],
  ],
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
];

/**
 * Returns a die's face of pips about a middle, a step apart, as a square
 * brick shows the hits it has left.
 *
 * @throws {RangeError} for a count no die's face shows, 1 to 6.
 */
export function diePips(
  count: number,
  middle: Point,
  step: number,
  radius: number,
  style: FillStyle,
): readonly CircleCommand[] {
  const face = DIE[count - 1];
  if (face === undefined) {
    throw new RangeError(`No die's face shows ${String(count)} pips`);
  }
  return face.map(([across, down]) =>
    circle(
      { x: middle.x + across * step, y: middle.y + down * step },
      radius,
      style,
    ),
  );
}

/**
 * Returns a row of pips across a middle, a step apart, as a wide brick
 * shows the hits it has left.
 *
 * @throws {RangeError} for a count that isn't a whole number, or is below
 *   nothing.
 */
export function pipRow(
  count: number,
  middle: Point,
  step: number,
  radius: number,
  style: FillStyle,
): readonly CircleCommand[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`No row has ${String(count)} pips`);
  }
  return Array.from({ length: count }, (_, i) =>
    circle(
      { x: middle.x + (i - (count - 1) / 2) * step, y: middle.y },
      radius,
      style,
    ),
  );
}
