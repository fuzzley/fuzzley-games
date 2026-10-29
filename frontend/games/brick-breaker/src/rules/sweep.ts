// When a moving ball first touches a face or a corner of a box, as a share
// of its move: 0 where it already touches as it starts, 1 where it touches as
// it ends. A ball is swept this way, rather than tested for overlaps once a
// step, so however fast it goes it can't pass through a brick. Bricks, the
// walls and the paddle are all boxes, so one pair of functions meets them
// all.

import { type Box, SIDE } from "./grid";

/** The share returned for a ball that doesn't touch a face or corner on its way. */
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
 * side pushed out by the ball's radius: `SIDE.top`, `SIDE.right`,
 * `SIDE.bottom` or `SIDE.left`, else {@link MISSED}.
 *
 * Only a ball moving toward the face touches it, so one leaving it, or
 * sliding along it, never does, and one already a little through it touches
 * it at once. A face runs from corner to corner, its ends included.
 */
export function sweepFace(
  move: Readonly<Move>,
  box: Readonly<Box>,
  side: number,
): number {
  const { x, y, dx, dy, r } = move;
  switch (side) {
    case SIDE.top:
      return sweepLine(y, dy, x, dx, r, box.top, -1, box.left, box.right);
    case SIDE.bottom:
      return sweepLine(y, dy, x, dx, r, box.bottom, 1, box.left, box.right);
    case SIDE.left:
      return sweepLine(x, dx, y, dy, r, box.left, -1, box.top, box.bottom);
    case SIDE.right:
      return sweepLine(x, dx, y, dy, r, box.right, 1, box.top, box.bottom);
    default:
      return MISSED;
  }
}

/**
 * Returns when a ball first touches a corner of a box, coming within its
 * radius of it: `SIDE.topLeft`, `SIDE.topRight`, `SIDE.bottomRight` or
 * `SIDE.bottomLeft`, else {@link MISSED}.
 *
 * Only a ball moving toward the corner touches it, and one already over it
 * touches it at once; one that would only graze it, as it would slide along
 * a face, doesn't.
 */
export function sweepCorner(
  move: Readonly<Move>,
  box: Readonly<Box>,
  corner: number,
): number {
  switch (corner) {
    case SIDE.topLeft:
      return sweepPoint(move, box.left, box.top);
    case SIDE.topRight:
      return sweepPoint(move, box.right, box.top);
    case SIDE.bottomRight:
      return sweepPoint(move, box.right, box.bottom);
    case SIDE.bottomLeft:
      return sweepPoint(move, box.left, box.bottom);
    default:
      return MISSED;
  }
}

/**
 * Returns when a ball first touches a line across one axis, facing the way
 * `facing` says along it (1 or -1), between `from` and `to` along the other.
 * The ball's place and move are given across the line and along it.
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

/** Returns when a ball first comes within its radius of a point. */
function sweepPoint(move: Readonly<Move>, px: number, py: number): number {
  const { x, y, dx, dy, r } = move;
  const ox = x - px;
  const oy = y - py;
  const approach = ox * dx + oy * dy;
  if (approach >= 0) return MISSED;
  const outside = ox * ox + oy * oy - r * r;
  if (outside <= 0) return 0;
  const length = dx * dx + dy * dy;
  const reach = approach * approach - length * outside;
  if (reach <= 0) return MISSED;
  const t = (-approach - Math.sqrt(reach)) / length;
  return t <= 1 ? t : MISSED;
}
