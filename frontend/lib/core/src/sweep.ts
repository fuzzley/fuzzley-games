// When a moving ball first touches a face or a corner of a box, or comes
// within reach of a point, as a share of its move: 0 where it already touches
// as it starts, 1 where it touches as it ends. A ball is swept this way,
// rather than tested for overlaps once a step, so however fast it goes it
// can't pass through what it meets. y grows down, so a box's top is its edge
// of least y, and a game whose y grows up names its faces the other way.
//
// Its arithmetic is +, -, *, / and Math.sqrt() alone, which every engine
// rounds alike, so a move sweeps to the same share wherever a game is played
// or replayed. No lint holds it to that: it is so because it was read to
// be, and sweep.spec.ts pins the shares to the bit, so a change that moves
// one, such as a distance taken with Math.hypot(), fails there. A sweep that
// must round otherwise is a new function, not an edit, since a game's replays
// keep to the shares this one gives.

/** Describes a box: its edges, with y growing down. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** A box's faces and corners, each a bit of an exposure ({@link exposureOf}). */
export const SIDE = {
  top: 1,
  right: 2,
  bottom: 4,
  left: 8,
  topLeft: 16,
  topRight: 32,
  bottomRight: 64,
  bottomLeft: 128,
} as const;

/** Every face and corner of a box, as an exposure. */
export const ALL_SIDES = Object.values(SIDE).reduce(
  (all: number, side) => all | side,
  0,
);

/** One of a box's faces, as {@link SIDE} names it. */
export type Face = (typeof SIDE)["top" | "right" | "bottom" | "left"];

/** One of a box's corners, as {@link SIDE} names it. */
export type Corner = (typeof SIDE)[
  "topLeft" | "topRight" | "bottomRight" | "bottomLeft"];

/** A box's faces, clockwise from the top. */
export const FACES: readonly Face[] = [
  SIDE.top,
  SIDE.right,
  SIDE.bottom,
  SIDE.left,
];

/** A box's corners, clockwise from the top left. */
export const CORNERS: readonly Corner[] = [
  SIDE.topLeft,
  SIDE.topRight,
  SIDE.bottomRight,
  SIDE.bottomLeft,
];

/** Each face's normal, the way out of the box, across and down. */
export const FACE_NORMAL: Readonly<
  Record<Face, { readonly x: -1 | 0 | 1; readonly y: -1 | 0 | 1 }>
> = {
  [SIDE.top]: { x: 0, y: -1 },
  [SIDE.right]: { x: 1, y: 0 },
  [SIDE.bottom]: { x: 0, y: 1 },
  [SIDE.left]: { x: -1, y: 0 },
};

/** Each corner's place, as the edges of a box it lies on. */
export const CORNER_AT: Readonly<
  Record<Corner, { readonly x: "left" | "right"; readonly y: "top" | "bottom" }>
> = {
  [SIDE.topLeft]: { x: "left", y: "top" },
  [SIDE.topRight]: { x: "right", y: "top" },
  [SIDE.bottomRight]: { x: "right", y: "bottom" },
  [SIDE.bottomLeft]: { x: "left", y: "bottom" },
};

/**
 * Says whether a cell of a grid of boxes stops a ball, by its column and its
 * row, which may lie off the grid.
 */
export type Solid = (column: number, row: number) => boolean;

/**
 * Returns which faces and corners of the box in a cell a ball can touch, as
 * {@link SIDE}'s bits.
 *
 * A face is exposed where the cell beside it is open, so boxes side by side
 * make one flat face. A corner is exposed where both cells beside it and the
 * one across from it are open, so a corner is only where nothing touches it.
 */
export function exposureOf(solid: Solid, column: number, row: number): number {
  const up = !solid(column, row - 1);
  const down = !solid(column, row + 1);
  const left = !solid(column - 1, row);
  const right = !solid(column + 1, row);
  let sides = 0;
  if (up) sides |= SIDE.top;
  if (right) sides |= SIDE.right;
  if (down) sides |= SIDE.bottom;
  if (left) sides |= SIDE.left;
  if (up && left && !solid(column - 1, row - 1)) sides |= SIDE.topLeft;
  if (up && right && !solid(column + 1, row - 1)) sides |= SIDE.topRight;
  if (down && right && !solid(column + 1, row + 1)) sides |= SIDE.bottomRight;
  if (down && left && !solid(column - 1, row + 1)) sides |= SIDE.bottomLeft;
  return sides;
}

/** The share returned for a ball that doesn't touch what it is swept against. */
export const MISSED = Number.POSITIVE_INFINITY;

/** Describes a ball's move: where its center starts, how far it goes, its radius. */
export interface Move {
  x: number;
  y: number;
  dx: number;
  dy: number;
  r: number;
}

/**
 * Returns when a ball first touches a face of a box, the box's edge on that
 * side pushed out by the ball's radius, else {@link MISSED}.
 *
 * Only a ball moving toward the face touches it, so one leaving it, or
 * sliding along it, never does, and one already a little through it touches
 * it at once. A face runs from corner to corner, its ends included.
 */
export function sweepFace(
  move: Readonly<Move>,
  box: Readonly<Box>,
  face: Face,
): number {
  const { x, y, dx, dy, r } = move;
  const normal = FACE_NORMAL[face];
  if (normal.x === 0) {
    const line = normal.y < 0 ? box.top : box.bottom;
    return sweepLine(y, dy, x, dx, r, line, normal.y, box.left, box.right);
  }
  const line = normal.x < 0 ? box.left : box.right;
  return sweepLine(x, dx, y, dy, r, line, normal.x, box.top, box.bottom);
}

/**
 * Returns when a ball first touches a corner of a box, coming within its
 * radius of it, else {@link MISSED}.
 *
 * Only a ball moving toward the corner touches it, and one already over it
 * touches it at once; one that would only graze it, as it would slide along
 * a face, doesn't.
 */
export function sweepCorner(
  move: Readonly<Move>,
  box: Readonly<Box>,
  corner: Corner,
): number {
  const at = CORNER_AT[corner];
  return sweepPoint(move, box[at.x], box[at.y], move.r);
}

/**
 * Returns when a ball's center first comes within `reach` of a point, else
 * {@link MISSED}.
 *
 * The reach is the ball's radius for a bare point, as a box's corner is, and
 * its radius and a disc's together for a disc around the point, so a ball
 * meets a round thing as it meets a corner. Only a ball moving toward the
 * point touches it, and one already within reach touches it at once; one
 * that would only graze it doesn't.
 */
export function sweepPoint(
  move: Readonly<Omit<Move, "r">>,
  x: number,
  y: number,
  reach: number,
): number {
  const { dx, dy } = move;
  const ox = move.x - x;
  const oy = move.y - y;
  const approach = ox * dx + oy * dy;
  if (approach >= 0) return MISSED;
  const outside = ox * ox + oy * oy - reach * reach;
  if (outside <= 0) return 0;
  const length = dx * dx + dy * dy;
  const discriminant = approach * approach - length * outside;
  if (discriminant <= 0) return MISSED;
  const t = (-approach - Math.sqrt(discriminant)) / length;
  return t <= 1 ? t : MISSED;
}

/**
 * Returns when a ball first touches a line across one axis, between `from`
 * and `to` along the other.
 *
 * The ball's place and move are given across the line and along it, and
 * `facing` is the way out of the box across it, 1 or -1.
 */
function sweepLine(
  across: number,
  acrossMove: number,
  along: number,
  alongMove: number,
  r: number,
  line: number,
  facing: number,
  from: number,
  to: number,
): number {
  const toward = acrossMove * facing;
  if (toward >= 0) return MISSED;
  const inFront = (across - line) * facing;
  if (inFront < 0) return MISSED;
  const gap = inFront - r;
  const t = gap <= 0 ? 0 : gap / -toward;
  if (t > 1) return MISSED;
  const at = along + alongMove * t;
  return at >= from && at <= to ? t : MISSED;
}
