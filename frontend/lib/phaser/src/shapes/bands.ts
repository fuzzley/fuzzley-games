// A line drawn as a band, filled as one polygon, so what it covers hangs on
// no renderer's joins: a crack, a bent bar or a bolt's shaft.

import { ORIGIN, type Point } from "./shapes";

/**
 * Returns the outline of a line through points drawn a width wide, as a
 * polygon's points, its left side then its right side back: its corners
 * mitred and its ends cut square, so a bold zigzag fills as one shape. Its
 * first end is cut along a way given instead, where one is, such as along
 * the edge it starts on.
 *
 * @throws {RangeError} for a line of fewer than two points, a point where
 *   the one before it is, a corner that turns all the way back, or a first
 *   cut along the line's first leg, which would never meet its sides: none
 *   of them has a way across the band to cut along.
 */
export function bandAlong(
  points: readonly Point[],
  width: number,
  firstCut?: Point,
): readonly Point[] {
  const legs = points.flatMap((from, i) =>
    points.slice(i + 1, i + 2).map((to) => {
      if (to.x === from.x && to.y === from.y) {
        throw new RangeError("A band's points can't repeat the one before");
      }
      return towards(from, to);
    }),
  );
  const first = legs[0];
  const last = legs.at(-1);
  if (first === undefined || last === undefined) {
    throw new RangeError("A band needs two points or more");
  }
  if (firstCut !== undefined && firstCut.x * first.y === firstCut.y * first.x) {
    throw new RangeError("A band's first end can't be cut along its line");
  }
  const half = width / 2;
  const sides = points.map((point, i) => {
    // An end's corner is square, as if its leg ran on past it.
    const before = legs[i - 1] ?? first;
    const after = legs[i] ?? last;
    if (before.x + after.x === 0 && before.y + after.y === 0) {
      throw new RangeError("A band can't turn all the way back");
    }
    // Each point's cut runs square to `along`: across the corner, its
    // mitre, or square to the line or along the way given at an end. Which
    // way `along` points makes no odds, as `reach` turns with it.
    const along =
      i === 0 && firstCut !== undefined
        ? towards(ORIGIN, { x: firstCut.y, y: -firstCut.x })
        : towards(ORIGIN, { x: before.x + after.x, y: before.y + after.y });
    // The longer, the sharper the corner or the more aslant the cut.
    const reach = half / (along.x * after.x + along.y * after.y);
    return {
      left: { x: point.x - along.y * reach, y: point.y + along.x * reach },
      right: { x: point.x + along.y * reach, y: point.y - along.x * reach },
    };
  });
  return [
    ...sides.map(({ left }) => left),
    ...sides.map(({ right }) => right).reverse(),
  ];
}

/** Returns the way from a point to another, a unit long. */
function towards(from: Point, to: Point): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}
